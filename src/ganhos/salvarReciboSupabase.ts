import { supabase } from '../lib/supabase';

/**
 * Salva um recibo digital na tabela recibos_digitais do Supabase.
 * Esta tabela é usada para auditoria e controle de recebimentos.
 */
export const salvarReciboSupabase = async (dados: {
  nomeReceptor: string;
  dataHoraRecebimento: string;
  processoNumero: string;
  fornecedor: string;
  notaFiscal: string;
  documentos: string | string[];
  processos: string | string[];
  urlOriginal: string;
}) => {
  try {
    // Mapping camelCase to snake_case for the database if necessary, 
    // or just sending as is if the table has these exact names.
    // Given the user's previous requests, let's assume the table columns 
    // might also need updating or we use a flexible insert.
    const { error } = await supabase
      .from('recibos_digitais')
      .insert([{
        nome_receptor: dados.nomeReceptor,
        data_hora_recebimento: dados.dataHoraRecebimento,
        processo_numero: dados.processoNumero,
        fornecedor: dados.fornecedor,
        nota_fiscal: dados.notaFiscal,
        documentos: Array.isArray(dados.documentos) ? dados.documentos.join(', ') : dados.documentos,
        processos: Array.isArray(dados.processos) ? dados.processos.join(', ') : dados.processos,
        url_original: dados.urlOriginal
      }]);
    
    if (error) {
      console.error('Erro ao salvar recibo digital no Supabase:', error);
      return { sucesso: false, erro: error.message };
    }
    
    return { sucesso: true };
  } catch (err: any) {
    console.error('Falha crítica ao salvar recibo digital:', err);
    return { sucesso: false, erro: err.message };
  }
};
