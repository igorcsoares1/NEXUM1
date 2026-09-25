import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { FuelRecord, User, Servidor } from '../types';

const handleError = (error: any, ctx: string) => console.error(`Erro em ${ctx}:`, error?.message);

export const handleSaveFuel = async (
  newFuelData: Omit<FuelRecord, 'id'>,
  editingFuel: FuelRecord | null,
  servidores: Servidor[],
  currentUser: User,
  setShowNewFuelModal: (val: boolean) => void,
  setEditingFuel: (val: FuelRecord | null) => void,
  setNewFuelData: (val: Omit<FuelRecord, 'id'>) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    // Determine month from date if not present
    const recordDate = newFuelData.date ? parseISO(newFuelData.date) : new Date();
    const month = newFuelData.month || format(recordDate, 'MMMM', { locale: ptBR });

    if (newFuelData.driver) {
      const driverName = newFuelData.driver.trim();
      const existingServidor = servidores.find(s => s.name.trim().toLowerCase() === driverName.toLowerCase());
      if (!existingServidor) {
        const { error: servidorError } = await supabase
          .from('servidores')
          .insert({
            prefeituraId: currentUser.prefeituraId || '1',
            name: driverName,
            cpf: '', 
            department: '',
            position: '',
            createdAt: new Date().toISOString()
          });
        if (servidorError) console.warn("Erro ao criar servidor automaticamente:", servidorError.message);
      }
    }

    if (editingFuel) {
      const { error } = await supabase
        .from('fuelRecords')
        .update({
          ...newFuelData,
          month: month.toLowerCase()
        })
        .eq('id', editingFuel.id);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('fuelRecords')
        .insert({
          ...newFuelData,
          month: month.toLowerCase(),
          prefeituraId: currentUser.prefeituraId || '1'
        });
      
      if (error) throw error;
    }
    setShowNewFuelModal(false);
    setEditingFuel(null);
    setNewFuelData({
      prefeituraId: currentUser.prefeituraId || '1',
      vehicle: '',
      driver: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      quantity: '',
      cost: '',
      status: 'concluido',
      yearModel: '',
      official: '',
      renavam: '',
      plate: '',
      fuelType: '',
      kmPerLiter: '',
      kmReading: '',
      unitPrice: ''
    });
    addNotification("Sucesso", "Registro de combustível salvo com sucesso!", "success");
  } catch (error: any) {
    handleError(error, "salvar combustível");
    const isPermissionError = error?.message?.includes('permission denied') || error?.code === '42501';
    const message = isPermissionError 
      ? "Erro de permissão: Você não tem autorização para realizar esta operação." 
      : `Erro ao salvar registro: ${error?.message || 'Verifique sua conexão'}`;
    addNotification("Erro", message, "error");
  }
};

export const handleDeleteFuel = async (
  id: string,
  setItemToDelete: (val: string | null) => void,
  setDeleteType: (val: any) => void,
  setShowDeleteConfirm: (val: boolean) => void
) => {
  setItemToDelete(id);
  setDeleteType('fuel');
  setShowDeleteConfirm(true);
};

export const handleBulkDeleteFuel = async (
  selectedFuelIds: string[],
  setSelectedFuelIds: (val: string[]) => void,
  setIsFuelSelectionMode: (val: boolean) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    const { error } = await supabase
      .from('fuelRecords')
      .delete()
      .in('id', selectedFuelIds);

    if (error) throw error;

    setSelectedFuelIds([]);
    setIsFuelSelectionMode(false);
    addNotification("Sucesso", `${selectedFuelIds.length} registros excluídos com sucesso.`, "success");
  } catch (error: any) {
    handleError(error, "excluir combustível em lote");
    addNotification("Erro", `Erro ao excluir registros: ${error.message || 'Verifique sua permissão'}`, "error");
  }
};
