import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import { Contract, User } from '../types';

const handleError = (error: any, ctx: string) => console.error(`Erro em ${ctx}:`, error?.message);

import { parseCurrencyToNumber, formatCurrency, normalizeDateForInput, extractDateFromText } from '../utils/format';

export const getContractTotalValue = (contract: Contract): number => {
  const baseValue = parseCurrencyToNumber(contract.totalValue || '0');
  const addendumsValue = (contract.addendums || []).reduce((acc, add) => {
    return acc + parseCurrencyToNumber(add.value || '0');
  }, 0);
  return baseValue + addendumsValue;
};

/** Números que identificam o contrato: o principal e os dos aditivos (ex.: 046/2025 e 001/2026). */
export const normalizarNumeroContrato = (n?: string) =>
  (n || '').replace(/^(N[ºo°]?\.?\s*|Contrato\s*)/i, '').trim().toLowerCase();
export const numerosDoContrato = (contract: Pick<Contract, 'number' | 'addendums'>): string[] =>
  [contract.number, ...(contract.addendums || []).map(a => a.number)]
    .map(normalizarNumeroContrato).filter(Boolean);
/** Nome do fornecedor comparável: sem acento, sem número de contrato na frente, sem LTDA/ME/EPP. */
export const normalizarFornecedor = (v?: string) =>
  (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/^[\s\d\/.\-]+/, '')
    .replace(/\b(ltda|me|epp|eireli|s\/?a|cnpj.*)$/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
export const mesmoFornecedor = (a?: string, b?: string) => {
  const x = normalizarFornecedor(a), y = normalizarFornecedor(b);
  if (!x || !y) return true; // sem fornecedor informado: não dá para descartar
  if (x.includes(y) || y.includes(x)) return true;
  return x.split(' ').slice(0, 2).join(' ') === y.split(' ').slice(0, 2).join(' ');
};

/** O processo é deste contrato? Pelo número (principal ou de aditivo) e, se houver, pelo fornecedor. */
export const pertenceAoContrato = (contract: Pick<Contract, 'number' | 'addendums'> & { vendor?: string }, numeroProcesso?: string, fornecedorProcesso?: string) =>
  !!numeroProcesso && numerosDoContrato(contract).includes(normalizarNumeroContrato(numeroProcesso))
  && mesmoFornecedor(contract.vendor, fornecedorProcesso);

/**
 * Acha o contrato de um processo. Números como 001/2026 se repetem entre secretarias e fundos,
 * então o fornecedor desempata. Nunca usa "contém" (001/2026 casava com 0001/2026, PE001/2026...).
 */
export const encontrarContrato = <T extends Pick<Contract, 'number' | 'addendums' | 'vendor'>>(contracts: T[], numero?: string, fornecedor?: string) => {
  const porNumero = contracts.filter(c => pertenceAoContrato(c, numero));
  const candidatos = porNumero.length > 1 ? porNumero.filter(c => mesmoFornecedor(c.vendor, fornecedor)) : porNumero;
  return { contrato: candidatos.length === 1 ? candidatos[0] : null, repetidos: porNumero.length, candidatos };
};

/** Soma dos processos de pagamento (checklists) do NEXUM ligados ao contrato. */
export const somaProcessosDoContrato = (contract: Pick<Contract, 'number' | 'addendums'> & { vendor?: string }, checklists: { contractNumber?: string; invoiceValue?: string; vendor?: string }[]) =>
  checklists.filter(ch => pertenceAoContrato(contract, ch.contractNumber, ch.vendor))
    .reduce((acc, ch) => acc + parseCurrencyToNumber(ch.invoiceValue || '0'), 0);

export const getContractBalance = (contract: Contract): number => {
  const totalValue = getContractTotalValue(contract);
  const consumption = parseCurrencyToNumber(contract.consumption || '0');
  return totalValue - consumption;
};

export const handleSaveContract = async (
  newContractData: Omit<Contract, 'id'>,
  editingContract: Contract | null,
  currentUser: User,
  setShowNewContractModal: (val: boolean) => void,
  setEditingContract: (val: Contract | null) => void,
  setNewContractData: (val: Omit<Contract, 'id'>) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  if (!newContractData.number || !newContractData.vendor) {
    addNotification("Erro", "Número e fornecedor são obrigatórios", "error");
    return;
  }

  try {
    const normalizedExpiryDate = normalizeDateForInput(newContractData.expiryDate) || extractDateFromText(newContractData.validity) || newContractData.expiryDate;
    const normalizedSignatureDate = normalizeDateForInput(newContractData.signatureDate) || newContractData.signatureDate || '';

    // Aditivos sem linha vazia; contrato com aditivo fica marcado como aditivado.
    const addendums = (newContractData.addendums || []).filter(a => a.date || a.description || a.value || a.number);

    // O consumo digitado é o acumulado desde a assinatura. Guardamos a parte que não veio de processos do NEXUM
    // (consumptionBase), para a sincronização não apagar o histórico lançado à mão.
    const prefeituraId = currentUser.prefeituraId || '1';
    const { data: checklists } = await supabase.from('checklists').select('contractNumber, invoiceValue, vendor').eq('prefeituraId', prefeituraId);
    const doNexum = somaProcessosDoContrato({ number: newContractData.number, addendums, vendor: newContractData.vendor }, checklists || []);
    const consumptionBase = formatCurrency(parseCurrencyToNumber(newContractData.consumption || '0') - doNexum);

    const payload: any = {
      ...newContractData,
      addendums,
      isAditivado: newContractData.isAditivado || addendums.length > 0,
      consumptionBase,
      expiryDate: normalizedExpiryDate,
      signatureDate: normalizedSignatureDate
    };

    const gravar = (dados: any) => editingContract
      ? supabase.from('contracts').update(dados).eq('id', editingContract.id)
      : supabase.from('contracts').insert({ ...dados, prefeituraId });
    let { error } = await gravar(payload);
    if (error && /consumptionBase/i.test(error.message || '')) {
      // banco ainda sem a coluna: salva sem ela e avisa
      delete payload.consumptionBase;
      ({ error } = await gravar(payload));
      addNotification("Atenção", "Rode o arquivo supabase_update_contratos_aditivos.sql no Supabase para a sincronização preservar o consumo digitado.", "warning");
    }
    if (error) throw error;
    setShowNewContractModal(false);
    setEditingContract(null);
    setNewContractData({
      prefeituraId: currentUser.prefeituraId || '1',
      number: '',
      vendor: '',
      object: '',
      validity: '',
      expiryDate: '',
      consumption: '',
      totalValue: '',
      isAditivado: false,
      status: 'vigente',
      secretariat: '',
      modality: '',
      signatureDate: '',
      category: '',
      addendums: []
    });
    addNotification("Sucesso", "Contrato salvo com sucesso!", "success");
  } catch (error) {
    handleError(error, "salvar contrato");
    addNotification("Erro", "Erro ao salvar contrato. Verifique suas permissões.", "error");
  }
};

export const handleDeleteContract = async (
  id: string,
  setItemToDelete: (val: string | null) => void,
  setDeleteType: (val: any) => void,
  setShowDeleteConfirm: (val: boolean) => void
) => {
  setItemToDelete(id);
  setDeleteType('contract');
  setShowDeleteConfirm(true);
};

export const handleSyncContracts = async (
  currentUser: User,
  setIsSyncing: (val: boolean) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  if (!currentUser?.prefeituraId) return;
  
  setIsSyncing(true);
  try {
    // 1. Buscar todos os contratos e checklists
    const { data: contracts, error: cErr } = await supabase
      .from('contracts')
      .select('*')
      .eq('prefeituraId', currentUser.prefeituraId);
    
    const { data: checklists, error: chErr } = await supabase
      .from('checklists')
      .select('*')
      .eq('prefeituraId', currentUser.prefeituraId);

    if (cErr) throw cErr;
    if (chErr) throw chErr;

    // 2. Recalcular consumos: histórico lançado à mão (consumptionBase) + processos do NEXUM
    //    (pelo número do contrato e dos aditivos).
    let semBase = 0;
    const updates = (contracts || []).map(async (contract) => {
      const doNexum = somaProcessosDoContrato(contract, checklists || []);
      if (contract.consumptionBase === undefined || contract.consumptionBase === null) {
        // Contrato antigo, sem a base: não reduz o consumo digitado (antes a sincronização apagava o histórico).
        semBase++;
        const atual = parseCurrencyToNumber(contract.consumption || '0');
        if (doNexum <= atual) return null;
        return supabase.from('contracts').update({ consumption: formatCurrency(doNexum) }).eq('id', contract.id);
      }
      const formattedConsumption = formatCurrency(parseCurrencyToNumber(contract.consumptionBase) + doNexum);
      if (contract.consumption !== formattedConsumption) {
        return supabase
          .from('contracts')
          .update({ consumption: formattedConsumption })
          .eq('id', contract.id);
      }
      return null;
    });
    if (semBase) console.warn(`${semBase} contrato(s) sem consumptionBase: abra e salve cada um uma vez para fixar o histórico.`);

    await Promise.all(updates);
    
    addNotification("Sucesso", "Base de dados e saldos sincronizados com sucesso! ✅", "success");
  } catch (error: any) {
    handleError(error, "sincronização");
    addNotification("Erro", "Falha na sincronização dos saldos.", "error");
  } finally {
    setIsSyncing(false);
  }
};

export const handleBulkDeleteContracts = async (
  selectedContractIds: string[],
  setSelectedContractIds: (val: string[]) => void,
  setIsContractSelectionMode: (val: boolean) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    await Promise.all(selectedContractIds.map(id => 
      supabase.from('contracts').delete().eq('id', id)
    ));

    setSelectedContractIds([]);
    setIsContractSelectionMode(false);
    addNotification("Sucesso", "Contratos excluídos com sucesso.", "success");
  } catch (error) {
    handleError(error, "excluir contratos em lote");
    addNotification("Erro", "Erro ao excluir contratos em lote.", "error");
  }
};