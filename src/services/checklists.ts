import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { ChecklistItem, User, ChecklistConfirmation, Contract } from '../types';
import { parseCurrencyToNumber, formatCurrency } from '../utils/format';
import { getContractTotalValue, encontrarContrato } from './contracts';
import { markRecibosByProcessNumberAsDeleted } from './recibos';

const handleError = (error: any, ctx: string) => console.error(`Erro em ${ctx}:`, error?.message);

export const updateContractConsumption = async (contractNumber: string, valueChange: number, prefeituraId?: string, addNotification?: (title: string, message: string, type: any) => void, vendor?: string) => {
  if (!contractNumber || valueChange === 0) return;

  const cleanNumber = contractNumber.trim();
  try {
    let query = supabase
      .from('contracts')
      .select('id, number, vendor, consumption, totalValue, prefeituraId, addendums');
    if (prefeituraId) query = query.eq('prefeituraId', prefeituraId);
    const { data: todos, error: fetchError } = await query;
    if (fetchError) {
      console.error("❌ Erro ao buscar contrato:", fetchError);
      return;
    }

    // Número exato (principal ou aditivo); se o número se repetir, o fornecedor desempata.
    const { contrato: contract, repetidos } = encontrarContrato(todos || [], cleanNumber, vendor);
    if (!contract && repetidos > 1) {
      addNotification?.("Atenção", `Há ${repetidos} contratos com o nº ${cleanNumber} e não foi possível saber qual é o deste processo. O saldo não foi abatido: confira o fornecedor.`, "warning");
      return;
    }

    if (contract) {
      const currentConsumption = parseCurrencyToNumber(contract.consumption || '0');
      const totalValue = getContractTotalValue(contract as Contract);
      
      let newConsumption = currentConsumption + valueChange;
      if (totalValue > 0) {
        newConsumption = Math.max(0, Math.min(totalValue, newConsumption));
      } else {
        newConsumption = Math.max(0, newConsumption);
      }
      
      console.log(`📊 [CONTRATO] ${contract.number} encontrado:`, {
        id: contract.id,
        antes: currentConsumption,
        alteracao: valueChange,
        depois: newConsumption,
        total: totalValue
      });

      const { error: updateError } = await supabase
        .from('contracts')
        .update({ 
          consumption: formatCurrency(newConsumption)
        })
        .eq('id', contract.id);
        
      if (updateError) throw updateError;
      console.log(`✅ [CONTRATO] ${contract.number} atualizado com sucesso para ${formatCurrency(newConsumption)}.`);
    } else {
      console.warn(`⚠️ [CONTRATO] Número "${cleanNumber}" não encontrado no banco de dados para abatimento.`);
      if (addNotification) {
        addNotification("Atenção", `Contrato ${cleanNumber} não encontrado. O saldo não foi atualizado automaticamente.`, "atencao");
      }
    }
  } catch (error) {
    console.error("❌ Erro fatal ao atualizar consumo do contrato:", error);
  }
};

export const handleToggleChecklistItem = async (
  checklistId: string,
  itemId: string,
  setChecklistRecords: any,
  selectedChecklist: ChecklistItem | null,
  setSelectedChecklist: (val: ChecklistItem | null) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  if (!selectedChecklist || !selectedChecklist.items) return;

  const updatedItems = selectedChecklist.items.map(item => 
    item.id === itemId ? { ...item, checked: !item.checked } : item
  );

  const allChecked = updatedItems.length > 0 && updatedItems.every(item => item.checked);
  const newStatus = allChecked ? 'concluido' : 'em_analise';

  try {
    const { error } = await supabase
      .from('checklists')
      .update({
        items: updatedItems,
        status: newStatus
      })
      .eq('id', checklistId);
    
    if (error) throw error;
    
    // Atualiza localmente usando o estado anterior para evitar stale data
    setChecklistRecords((prev: ChecklistItem[]) => 
      prev.map(c => c.id === checklistId ? { ...c, items: updatedItems, status: newStatus } : c)
    );

    if (selectedChecklist && selectedChecklist.id === checklistId) {
      setSelectedChecklist({
        ...selectedChecklist,
        items: updatedItems,
        status: newStatus
      });
    }
  } catch (error) {
    handleError(error, "atualizar checklist");
    addNotification("Erro", "Erro ao atualizar etapa.", "error");
  }
};

export const handleAddTramitation = async (
  checklistId: string,
  sector: string,
  action: string,
  setChecklistRecords: any,
  addNotification: (title: string, message: string, type: any) => void,
  checklistRecords: ChecklistItem[]
): Promise<boolean> => {
  const targetChecklist = checklistRecords.find(c => c.id === checklistId);
  if (!targetChecklist) return false;

  const newStep = {
    date: format(new Date(), 'dd/MM/yyyy HH:mm'),
    sector,
    action
  };

  const currentHistory = Array.isArray(targetChecklist.history) ? targetChecklist.history : [];
  const updatedHistory = [newStep, ...currentHistory];

  // Map action to status (só conclui com todos os documentos marcados)
  const newStatus = statusPorTramitacao(action, targetChecklist.status, targetChecklist.items);
  const pendentes = documentosPendentes(targetChecklist.items);
  if (newStatus === 'em_analise' && pendentes.length && !/an[áa]lise/i.test(action))
    addNotification("Documentos pendentes", `O processo foi tramitado, mas continua "Em análise": faltam ${pendentes.length} documento(s) (${pendentes.map(i => i.label).join('; ')}).`, "warning");

  try {
    const updateData: any = {
      history: updatedHistory,
      status: newStatus,
      currentSector: sector
    };

    const tryUpdate = async (data: any) => {
      return supabase.from('checklists').update(data).eq('id', checklistId);
    };

    let result = await tryUpdate(updateData);
    let error = result.error;

    if (error && (error.message?.includes('history') || error.message?.includes('currentSector') || error.message?.includes('schema cache'))) {
      console.warn("Tentando atualizar movimentação sem as colunas history/currentSector...");
      const resilientData = { status: newStatus };
      const retry = await tryUpdate(resilientData);
      error = retry.error;
    }

    if (error) {
      console.error("Erro detalhado do Supabase:", error);
      addNotification("Erro na Movimentação", "Não foi possível registrar no banco. Execute o script em 'supabase_setup.sql'.", "error");
      return false; 
    }
    
    const updatedChecklist = {
      ...targetChecklist,
      history: updatedHistory,
      status: newStatus,
      currentSector: sector
    };

    // Update global list using functional update
    setChecklistRecords((prev: ChecklistItem[]) => 
      prev.map(c => c.id === checklistId ? updatedChecklist : c)
    );
    
    addNotification("Sucesso", "Movimentação registrada!", "success");
    return true;
  } catch (error) {
    handleError(error, "adicionar tramitação");
    addNotification("Erro", "Erro ao registrar movimentação.", "error");
    return false;
  }
};

/** Chave para comparar nomes de documentos ("Certidão de Regularidade do FGTS" = "CERTIDÃO NEGATIVA DE REGULARIDADE (FGTS)"). */
export const chaveDocumento = (label: string) =>
  (label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ').filter(w => w && !['de', 'da', 'do', 'das', 'dos', 'e', 'negativa', 'comprovante'].includes(w))
    .join(' ');

export const documentosPendentes = (items?: { label: string; checked: boolean }[]) =>
  (items || []).filter(i => !i.checked);

/**
 * Status após uma tramitação. Ações de conclusão (pagamento, autorizado, arquivado...) só concluem
 * se todos os documentos estiverem marcados; senão o processo fica "em análise".
 */
export const statusPorTramitacao = (action: string, atual: ChecklistItem['status'], items?: { label: string; checked: boolean }[]): ChecklistItem['status'] => {
  const a = action.toLowerCase();
  if (a.includes('análise') || a.includes('analise')) return 'em_analise';
  if (a.includes('autorizado') || a.includes('pagamento') || a.includes('pago') || a.includes('concluído') || a.includes('concluido') || a.includes('arquivado'))
    return documentosPendentes(items).length ? 'em_analise' : 'concluido';
  if (a.includes('correção') || a.includes('correcao') || a.includes('pendente')) return 'pendente';
  if (a.includes('urgente') || a.includes('atraso') || a.includes('prioridade')) return 'atencao';
  return atual;
};

export const DEFAULT_CHECKLIST_ITEMS = [
  { label: 'CERTIDÃO NEGATIVA DE DEBITOS TRABALHISTAS', checked: false },
  { label: 'CERTIDÃO NEGATIVA DE REGULARIDADE (FGTS)', checked: false },
  { label: 'CERTIDÃO NEGATIVA DE DÉBITOS FEDERAIS', checked: false },
  { label: 'CERTIDÃO NEGATIVA DE DÉBITOS ESTADUAIS', checked: false },
  { label: 'CERTIDÃO NEGATIVA DE DÉBITOS MUNICIPAIS', checked: false },
  { label: 'PLANILHA DE COMPOSIÇÃO DE CUSTOS', checked: false },
  { label: 'RELATÓRIO DE ATIVIDADES', checked: false },
  { label: 'CONTA BANCÁRIA DA EMPRESA', checked: false }
];

export const handleSaveChecklist = async (
  newChecklistData: Omit<ChecklistItem, 'id'>,
  editingChecklist: ChecklistItem | null,
  currentUser: User,
  setShowNewChecklistModal: (val: boolean) => void,
  setEditingChecklist: (val: ChecklistItem | null) => void,
  setNewChecklistData: (val: Omit<ChecklistItem, 'id'>) => void,
  addNotification: (title: string, message: string, type: any) => void,
  fetchChecklistRecords?: () => Promise<void>,
  fetchContracts?: () => Promise<void>
) => {
  const allChecked = newChecklistData.items && newChecklistData.items.length > 0 && newChecklistData.items.every(item => item.checked);
  const calculatedStatus = allChecked ? 'concluido' : 'em_analise';

  try {
    let finalStatus = calculatedStatus;
    let finalSector = 'Origem';
    let finalHistory: any[] = [{
      date: format(new Date(), 'dd/MM/yyyy HH:mm'),
      sector: 'Origem',
      action: 'Processo Iniciado'
    }];

    if (editingChecklist) {
      const { data: currentDbChecklist } = await supabase
        .from('checklists')
        .select('status, currentSector, history')
        .eq('id', editingChecklist.id)
        .maybeSingle();

      finalStatus = currentDbChecklist?.status || editingChecklist.status;
      finalSector = currentDbChecklist?.currentSector || editingChecklist.currentSector || 'Origem';
      finalHistory = currentDbChecklist?.history || editingChecklist.history || [];
      
      if (allChecked) {
        finalStatus = 'concluido';
      } else if (finalStatus === 'concluido' && !allChecked) {
        finalStatus = 'em_analise';
      }
    }

    const newRecordData = {
      prefeituraId: currentUser.prefeituraId || '1',
      processNumber: newChecklistData.processNumber,
      contractNumber: newChecklistData.contractNumber,
      vendor: newChecklistData.vendor,
      object: newChecklistData.object,
      value: newChecklistData.value,
      invoiceValue: newChecklistData.invoiceValue,
      invoiceNumber: newChecklistData.invoiceNumber,
      submissionDate: editingChecklist ? newChecklistData.submissionDate : format(new Date(), 'yyyy-MM-dd'),
      status: finalStatus,
      currentSector: finalSector,
      history: finalHistory,
      items: [...(newChecklistData.items || [])]
    };

    const saveToSupabase = async (data: any) => {
      const cleanData = { ...data };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined || cleanData[key] === null) {
          delete cleanData[key];
        }
      });

      if (editingChecklist) {
        return supabase.from('checklists').update(cleanData).eq('id', editingChecklist.id);
      } else {
        return supabase.from('checklists').insert(cleanData);
      }
    };

    let result = await saveToSupabase(newRecordData);
    let error = result.error;

    if (error) {
      console.warn("Erro ao salvar checklist, tentando modo resiliente...", error.message);
      const possibleProblematicColumns = ['currentSector', 'history', 'invoiceValue'];
      let resilientData = { ...newRecordData };
      let currentError = error;

      for (const col of possibleProblematicColumns) {
        if (currentError?.message?.includes(col) || currentError?.details?.includes(col) || currentError?.message?.includes('schema cache')) {
          console.warn(`Removendo coluna '${col}' por ausência no banco...`);
          delete (resilientData as any)[col];
          const retry = await saveToSupabase(resilientData);
          currentError = retry.error;
          if (!currentError) break;
        }
      }
      error = currentError;
    }

    if (error) throw error;
    
    // ✅ ABATER/DEVOLVER DO CONTRATO IMEDIATAMENTE
    const newVal = parseCurrencyToNumber(newChecklistData.invoiceValue || '0');
    const newContr = newChecklistData.contractNumber;
    const pId = currentUser.prefeituraId;

    if (editingChecklist) {
      // EDITANDO: Recalcular diferença
      const oldVal = parseCurrencyToNumber(editingChecklist.invoiceValue || '0');
      const oldContr = editingChecklist.contractNumber;

      if (oldContr === newContr) {
        // Mesmo contrato: apenas a diferença
        if (oldVal !== newVal) {
          const difference = newVal - oldVal;
          console.log(`📝 Editando: ${newContr} | Diferença: R$ ${difference.toFixed(2)}`);
          await updateContractConsumption(newContr, difference, pId, addNotification, newChecklistData.vendor);
        }
      } else {
        // Contrato diferente: devolver antigo + abater novo
        if (oldContr) {
          console.log(`⬅️ Devolvendo ${oldContr}: -R$ ${oldVal.toFixed(2)}`);
          await updateContractConsumption(oldContr, -oldVal, pId, addNotification, editingChecklist.vendor);
        }
        if (newContr && newVal > 0) {
          console.log(`➡️ Abatendo ${newContr}: -R$ ${newVal.toFixed(2)}`);
          await updateContractConsumption(newContr, newVal, pId, addNotification, newChecklistData.vendor);
        }
      }
    } else {
      // NOVO CHECKLIST: Abater imediatamente
      if (newContr && newVal > 0) {
        console.log(`✅ NOVO: ${newContr} | Abatendo: -R$ ${newVal.toFixed(2)}`);
        await updateContractConsumption(newContr, newVal, pId, addNotification, newChecklistData.vendor);
      }
    }
    
    if (fetchChecklistRecords) {
      await fetchChecklistRecords();
    }

    if (fetchContracts) {
      await fetchContracts();
    }

    setShowNewChecklistModal(false);
    setEditingChecklist(null);
    setNewChecklistData({
      prefeituraId: currentUser.prefeituraId || '1',
      processNumber: '',
      contractNumber: '',
      vendor: '',
      object: '',
      value: '',
      invoiceValue: '',
      invoiceNumber: '',
      submissionDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'em_analise',
      items: DEFAULT_CHECKLIST_ITEMS.map(item => ({ ...item, id: crypto.randomUUID() }))
    });
    addNotification("Sucesso", "Checklist salvo e saldo atualizado! ✅", "success");
  } catch (error) {
    handleError(error, "salvar checklist");
    addNotification("Erro", "Erro de permissão: Você não tem autorização para salvar checklists.", "error");
  }
};

export const handleDeleteChecklist = async (
  id: string,
  setItemToDelete: (val: string | null) => void,
  setDeleteType: (val: any) => void,
  setShowDeleteConfirm: (val: boolean) => void,
  checklistRecords: ChecklistItem[] = [],
  addNotification?: (title: string, message: string, type: any) => void
) => {
  setItemToDelete(id);
  setDeleteType('checklist');
  setShowDeleteConfirm(true);
};

export const handleBulkDeleteChecklists = async (
  selectedChecklistIds: string[],
  setSelectedChecklistIds: (val: string[]) => void,
  setShowChecklistSelectionModal: (val: boolean) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    await Promise.all(selectedChecklistIds.map(async id => {
      // Find checklist to get its contract and invoice value
      const { data: checklist } = await supabase
        .from('checklists')
        .select('processNumber, contractNumber, invoiceValue, prefeituraId')
        .eq('id', id)
        .maybeSingle();

      if (checklist) {
        // Devolver valor ao contrato
        if (checklist.contractNumber) {
          const value = parseCurrencyToNumber(checklist.invoiceValue || '0');
          if (value > 0) {
            console.log(`🗑️ Bulk Delete: Devolvendo R$ ${value.toFixed(2)} para ${checklist.contractNumber}`);
            await updateContractConsumption(checklist.contractNumber, -value, checklist.prefeituraId, addNotification);
          }
        }

        // Deletar recibos digitais com persistência
        if (checklist.processNumber) {
          await markRecibosByProcessNumberAsDeleted(checklist.processNumber);
        }
      }

      return supabase.from('checklists').delete().eq('id', id);
    }));

    setSelectedChecklistIds([]);
    setShowChecklistSelectionModal(false);
    addNotification("Sucesso", "Checklists excluídos e saldos devolvidos! ✅", "success");
  } catch (error) {
    handleError(error, "excluir checklists em lote");
    addNotification("Erro", "Erro ao excluir checklists em lote.", "error");
  }
};

export const fetchChecklistsByDate = async (date: string): Promise<ChecklistItem[]> => {
  try {
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('submissionDate', date);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erro ao buscar checklists por data:", error);
    throw error;
  }
};

export const saveBatchChecklistConfirmation = async (
  checklists: ChecklistItem[], 
  nome: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const confirmations = checklists.map(c => ({
      checklist_id: c.id,
      nome_confirmante: nome,
      data_confirmacao: new Date().toISOString(),
      prefeituraId: c.prefeituraId || '1'
    }));

    const { error } = await supabase
      .from('checklist_confirmacoes')
      .insert(confirmations);
    
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao salvar confirmações em lote:", error);
    return { success: false, error: error.message || "Erro ao salvar confirmações." };
  }
};

export const fetchChecklistPublic = async (id: string): Promise<ChecklistItem | null> => {
  try {
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar checklist público:", error);
    throw error;
  }
};

export const saveChecklistConfirmation = async (
  checklist: ChecklistItem, 
  nome: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Verificar se já existe confirmação
    const { data: existing } = await supabase
      .from('checklist_confirmacoes')
      .select('id')
      .eq('checklist_id', checklist.id)
      .maybeSingle();
    
    if (existing) {
      return { success: false, error: "Este checklist já foi confirmado anteriormente." };
    }

    const { error } = await supabase
      .from('checklist_confirmacoes')
      .insert({
        checklist_id: checklist.id,
        nome_confirmante: nome,
        data_confirmacao: new Date().toISOString(),
        prefeituraId: checklist.prefeituraId || '1'
      });
    
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao salvar confirmação:", error);
    return { success: false, error: error.message || "Erro ao salvar confirmação." };
  }
};

export const fetchAllConfirmations = async (prefeituraId: string): Promise<(ChecklistConfirmation & { checklist?: ChecklistItem })[]> => {
  try {
    const { data, error } = await supabase
      .from('checklist_confirmacoes')
      .select('*, checklist:checklists(*)')
      .eq('prefeituraId', prefeituraId)
      .order('data_confirmacao', { ascending: false });
    
    if (error) {
      if (error.message?.includes('checklist_confirmacoes') || error.message?.includes('cache')) {
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    handleError(error, "buscar todas as confirmações");
    return [];
  }
};

export const fetchChecklistConfirmations = async (checklistId: string): Promise<ChecklistConfirmation[]> => {
  try {
    const { data, error } = await supabase
      .from('checklist_confirmacoes')
      .select('*')
      .eq('checklist_id', checklistId);
    
    if (error) {
      if (error.message?.includes('checklist_confirmacoes') || error.message?.includes('cache')) {
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    handleError(error, "buscar confirmações");
    return [];
  }
};

export const deleteChecklistConfirmation = async (id: string): Promise<boolean> => {
  try {
    try {
      const raw = localStorage.getItem('nexum_deleted_confirmations_ids');
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('nexum_deleted_confirmations_ids', JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Erro ao salvar confirmação excluída:', e);
    }

    const { error } = await supabase
      .from('checklist_confirmacoes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleError(error, "excluir confirmação");
    return false;
  }
};