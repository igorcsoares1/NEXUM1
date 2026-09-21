import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { ChecklistItem, User, ChecklistConfirmation } from '../types';
import { parseCurrencyToNumber, formatCurrency } from '../utils/format';

const handleError = (error: any, ctx: string) => console.error(`Erro em ${ctx}:`, error?.message);

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

  // Map action to status
  let newStatus = targetChecklist.status;
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('análise')) newStatus = 'em_analise';
  else if (actionLower.includes('autorizado') || actionLower.includes('pagamento') || actionLower.includes('pago') || actionLower.includes('concluído') || actionLower.includes('arquivado')) newStatus = 'concluido';
  else if (actionLower.includes('correção') || actionLower.includes('pendente')) newStatus = 'pendente';
  else if (actionLower.includes('urgente') || actionLower.includes('atraso') || actionLower.includes('prioridade')) newStatus = 'atencao';

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

export const handleSaveChecklist = async (
  newChecklistData: Omit<ChecklistItem, 'id'>,
  editingChecklist: ChecklistItem | null,
  currentUser: User,
  setShowNewChecklistModal: (val: boolean) => void,
  setEditingChecklist: (val: ChecklistItem | null) => void,
  setNewChecklistData: (val: Omit<ChecklistItem, 'id'>) => void,
  addNotification: (title: string, message: string, type: any) => void
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
      submissionDate: editingChecklist ? newChecklistData.submissionDate : new Date().toISOString().split('T')[0],
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
      submissionDate: new Date().toISOString().split('T')[0],
      status: 'em_analise',
      items: [
        { id: crypto.randomUUID(), label: 'CERTIDÃO NEGATIVA DE DEBITOS TRABALHISTAS', checked: false },
        { id: crypto.randomUUID(), label: 'CERTIDÃO NEGATIVA DE REGULARIDADE (FGTS)', checked: false },
        { id: crypto.randomUUID(), label: 'CERTIDÃO NEGATIVA DE DÉBITOS FEDERAIS', checked: false },
        { id: crypto.randomUUID(), label: 'CERTIDÃO NEGATIVA DE DÉBITOS ESTADUAIS', checked: false },
        { id: crypto.randomUUID(), label: 'CERTIDÃO NEGATIVA DE DÉBITOS MUNICIPAIS', checked: false },
        { id: crypto.randomUUID(), label: 'PLANILHA DE COMPOSIÇÃO DE CUSTOS', checked: false },
        { id: crypto.randomUUID(), label: 'RELATÓRIO DE ATIVIDADES', checked: false },
        { id: crypto.randomUUID(), label: 'CONTA BANCÁRIA DA EMPRESA', checked: false }
      ]
    });
    addNotification("Sucesso", "Checklist salvo com sucesso!", "success");
  } catch (error) {
    handleError(error, "salvar checklist");
    addNotification("Erro", "Erro de permissão: Você não tem autorização para salvar checklists.", "error");
  }
};

export const handleDeleteChecklist = async (
  id: string,
  setItemToDelete: (val: string | null) => void,
  setDeleteType: (val: any) => void,
  setShowDeleteConfirm: (val: boolean) => void
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
      // Find checklist to get its process number
      const { data: checklist } = await supabase
        .from('checklists')
        .select('processNumber')
        .eq('id', id)
        .maybeSingle();

      if (checklist && checklist.processNumber) {
        await supabase
          .from('recibos_digitais')
          .delete()
          .eq('processo_numero', checklist.processNumber);
      }

      return supabase.from('checklists').delete().eq('id', id);
    }));

    setSelectedChecklistIds([]);
    setShowChecklistSelectionModal(false);
    addNotification("Sucesso", "Checklists excluídos com sucesso.", "success");
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
