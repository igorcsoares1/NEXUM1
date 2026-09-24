import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import { Contract, User } from '../types';

const handleError = (error: any, ctx: string) => console.error(`Erro em ${ctx}:`, error?.message);

import { parseCurrencyToNumber, formatCurrency } from '../utils/format';

export const getContractTotalValue = (contract: Contract): number => {
  const baseValue = parseCurrencyToNumber(contract.totalValue || '0');
  const addendumsValue = (contract.addendums || []).reduce((acc, add) => {
    return acc + parseCurrencyToNumber(add.value || '0');
  }, 0);
  return baseValue + addendumsValue;
};

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
    if (editingContract) {
      const { error } = await supabase
        .from('contracts')
        .update({
          ...newContractData
        })
        .eq('id', editingContract.id);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('contracts')
        .insert({
          ...newContractData,
          prefeituraId: currentUser.prefeituraId || '1'
        });
      
      if (error) throw error;
    }
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

    // 2. Recalcular consumos
    const updates = (contracts || []).map(async (contract) => {
      // Filtrar checklists que pertencem a este contrato (trim e ignore case)
      const relatedChecklists = (checklists || []).filter(ch => 
        ch.contractNumber?.trim().toLowerCase() === contract.number?.trim().toLowerCase()
      );

      const totalConsumption = relatedChecklists.reduce((acc, ch) => {
        return acc + parseCurrencyToNumber(ch.invoiceValue || '0');
      }, 0);

      const formattedConsumption = formatCurrency(totalConsumption);

      // Só atualizar se mudou
      if (contract.consumption !== formattedConsumption) {
        return supabase
          .from('contracts')
          .update({ consumption: formattedConsumption })
          .eq('id', contract.id);
      }
      return null;
    });

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
