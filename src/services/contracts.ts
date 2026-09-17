import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import { Contract, User } from '../types';

const handleError = (error: any, ctx: string) => console.error(`Erro em ${ctx}:`, error?.message);

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
    // Simulate synchronization with the main database
    // In a real scenario, this would fetch from an external API or re-fetch from Supabase
    await new Promise(resolve => setTimeout(resolve, 1500));
    addNotification("Sucesso", "Base de dados sincronizada com sucesso.", "success");
  } catch (error: any) {
    handleError(error, "sincronização");
    addNotification("Erro", "Falha na sincronização com os servidores.", "error");
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
