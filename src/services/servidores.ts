import { supabase } from '../lib/supabase';
import { Servidor, User } from '../types';

const handleError = (error: any, ctx: string) => console.error(`Erro em ${ctx}:`, error?.message);

export const saveServidor = async (
  servidorData: Omit<Servidor, 'id' | 'createdAt'>,
  editingServidor: Servidor | null,
  currentUser: User,
  setShowModal: (val: boolean) => void,
  setEditingServidor: (val: Servidor | null) => void,
  setNewData: (val: any) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    const baseData: any = {
      ...servidorData,
      prefeituraId: currentUser.prefeituraId || '1'
    };

    const trySave = async (data: any) => {
      if (editingServidor) {
        return supabase.from('servidores').update(data).eq('id', editingServidor.id);
      } else {
        return supabase.from('servidores').insert({
          ...data,
          createdAt: data.createdAt || new Date().toISOString()
        });
      }
    };

    const registrationValue = baseData.registrationNumber || baseData.registration_number || baseData.matricula || baseData.mat || baseData.reg || baseData.registration || baseData.num_matricula || baseData.registrationnumber || baseData.matricula_servidor || baseData.num_mat || baseData.nr_matricula || '';
    const aliases = ['registrationNumber', 'registration_number', 'matricula', 'num_matricula', 'mat', 'reg', 'registration', 'registrationnumber', 'matricula_servidor', 'num_mat', 'nr_matricula', 'matricula_serv', 'cd_matricula'];
    
    let result: any = null;
    let success = false;
    let usedAlias = '';

    // Remove todos os aliases conhecidos para começar do limpo
    const cleanBase = { ...baseData };
    aliases.forEach(a => delete cleanBase[a]);

    // Tentativa 1: Tentar com cada um dos aliases
    for (const alias of aliases) {
      if (!registrationValue && alias !== 'registrationNumber') continue;
      
      const attemptData = { ...cleanBase };
      if (registrationValue) {
        attemptData[alias] = registrationValue;
      }
      
      result = await trySave(attemptData);
      if (!result.error) {
        success = true;
        usedAlias = alias;
        break;
      }
      console.warn(`Falha ao salvar com coluna '${alias}':`, result.error.message);
    }

    // Tentativa 2: Se tudo falhou, tentar embutir na coluna 'position'
    if (!success) {
      console.warn("Tentando embutir matrícula no campo position...");
      const fallbackData = { ...cleanBase };
      if (registrationValue) {
        fallbackData.position = `${fallbackData.position || ''} ||| MAT:${registrationValue}`;
      }
      result = await trySave(fallbackData);
      if (result.error) throw result.error;
    }

    addNotification("Sucesso", `${editingServidor ? "Servidor atualizado!" : "Servidor cadastrado!"}`, "success");
    
    setShowModal(false);
    setEditingServidor(null);
    setNewData({
      prefeituraId: currentUser.prefeituraId || '1',
      name: '',
      registrationNumber: '',
      cpf: '',
      department: '',
      position: ''
    });
  } catch (error: any) {
    handleError(error, "salvar servidor");
    addNotification("Erro", `Erro ao salvar: ${error?.message || 'Verifique os dados'}`, "error");
  }
};

export const deleteServidor = async (
  id: string,
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    const { error } = await supabase
      .from('servidores')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    addNotification("Sucesso", "Servidor excluído com sucesso.", "success");
  } catch (error) {
    handleError(error, "excluir servidor");
    addNotification("Erro", "Erro ao excluir servidor.", "error");
  }
};
