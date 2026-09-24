import { supabase } from '../lib/supabase';

export interface Recibo {
  id: string;
  nome_receptor: string;
  data_recebimento?: string;
  data_hora_recebimento: string;
  processo_numero: string;
  fornecedor: string;
  nota_fiscal: string;
  documentos: string | string[];
  processos: string | string[];
  url_original: string;
  status: string;
  fornecedores_lista?: string[];
  criado_em?: string;
  atualizado_em?: string;
}

const LOCAL_STORAGE_KEY = 'nexum_deleted_recibos_ids';
const SYSTEM_METADATA_PREFEITURA = 'system_metadata';
const SYSTEM_METADATA_PROCESS = '__SYSTEM_DELETED_RECIBOS__';

/**
 * Retorna os IDs de recibos marcados como excluídos localmente
 */
export const getLocalDeletedReciboIds = (): string[] => {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

/**
 * Salva localmente a lista de IDs excluídos
 */
const saveLocalDeletedReciboIds = (ids: string[]) => {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const unique = Array.from(new Set(ids));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(unique));
  } catch (e) {
    console.warn('Falha ao salvar IDs excluídos no localStorage:', e);
  }
};

/**
 * Busca a lista de recibos excluídos sincronizada no Supabase
 */
export const fetchSyncedDeletedReciboIds = async (): Promise<string[]> => {
  const localIds = getLocalDeletedReciboIds();
  try {
    const { data, error } = await supabase
      .from('checklists')
      .select('id, items')
      .eq('prefeituraId', SYSTEM_METADATA_PREFEITURA)
      .eq('processNumber', SYSTEM_METADATA_PROCESS)
      .maybeSingle();

    if (error || !data) {
      return localIds;
    }

    const items = data.items as any[];
    const remoteList: string[] = (Array.isArray(items) && items[0]?.deleted_recibos) || [];
    const merged = Array.from(new Set([...localIds, ...remoteList]));
    saveLocalDeletedReciboIds(merged);
    return merged;
  } catch (err) {
    console.warn('Aviso ao sincronizar IDs de recibos excluídos:', err);
    return localIds;
  }
};

/**
 * Sincroniza um novo ID excluído com o Supabase e localStorage
 */
export const markReciboAsDeleted = async (reciboIdOrIds: string | string[]): Promise<boolean> => {
  const targetIds = Array.isArray(reciboIdOrIds) ? reciboIdOrIds : [reciboIdOrIds];
  if (targetIds.length === 0) return true;

  // 1. Salvar imediatamente no localStorage
  const currentLocal = getLocalDeletedReciboIds();
  const updatedIds = Array.from(new Set([...currentLocal, ...targetIds]));
  saveLocalDeletedReciboIds(updatedIds);

  // 2. Tentar exclusão nativa na tabela recibos_digitais
  try {
    await Promise.all(
      targetIds.map(id => supabase.from('recibos_digitais').delete().eq('id', id))
    );
  } catch (e) {
    console.warn('Aviso na exclusão nativa de recibos_digitais:', e);
  }

  // 3. Persistir no registro de metadados do Supabase para refletir entre dispositivos e abas
  try {
    const { data: existing } = await supabase
      .from('checklists')
      .select('id, items')
      .eq('prefeituraId', SYSTEM_METADATA_PREFEITURA)
      .eq('processNumber', SYSTEM_METADATA_PROCESS)
      .maybeSingle();

    const currentRemote: string[] = (existing && Array.isArray(existing.items) && existing.items[0]?.deleted_recibos) || [];
    const mergedRemote = Array.from(new Set([...currentRemote, ...updatedIds]));

    if (existing?.id) {
      await supabase
        .from('checklists')
        .update({
          items: [{ deleted_recibos: mergedRemote }],
          submissionDate: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('checklists')
        .insert([{
          prefeituraId: SYSTEM_METADATA_PREFEITURA,
          processNumber: SYSTEM_METADATA_PROCESS,
          vendor: 'Sistema - Recibos Excluídos',
          object: 'Registro de auditoria de recibos excluídos',
          status: 'sistema',
          items: [{ deleted_recibos: mergedRemote }],
          submissionDate: new Date().toISOString()
        }]);
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar metadados no Supabase:', err);
  }

  return true;
};

/**
 * Marca como excluídos todos os recibos associados a um número de processo
 */
export const markRecibosByProcessNumberAsDeleted = async (processNumber: string): Promise<void> => {
  if (!processNumber || processNumber === 'N/A') return;

  try {
    const { data } = await supabase
      .from('recibos_digitais')
      .select('id')
      .eq('processo_numero', processNumber);

    if (data && data.length > 0) {
      const ids = data.map(r => r.id);
      await markReciboAsDeleted(ids);
    }
  } catch (e) {
    console.warn('Aviso ao excluir recibos por processo:', e);
  }
};

/**
 * Busca todos os recibos ativos, garantindo que nenhum recibo excluído seja retornado
 */
export const fetchActiveRecibos = async (): Promise<Recibo[]> => {
  try {
    // 1. Inicia busca no Supabase e recuperação de IDs excluídos
    const [recibosRes, deletedIds] = await Promise.all([
      supabase
        .from('recibos_digitais')
        .select('*')
        .order('data_hora_recebimento', { ascending: false }),
      fetchSyncedDeletedReciboIds()
    ]);

    if (recibosRes.error) {
      throw recibosRes.error;
    }

    const allRecibos: Recibo[] = recibosRes.data || [];
    const deletedSet = new Set(deletedIds);

    // 2. Filtra qualquer recibo que esteja na lista de excluídos
    return allRecibos.filter(r => !deletedSet.has(r.id));
  } catch (error) {
    console.error('Erro ao buscar recibos ativos:', error);
    return [];
  }
};
