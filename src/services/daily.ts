import { supabase } from '../lib/supabase';
import { DailyRecord, User, Servidor } from '../types';

const handleError = (error: any, ctx: string) => console.error(`Erro em ${ctx}:`, error?.message);

export const handleSaveDaily = async (
  newDailyData: Omit<DailyRecord, 'id'>,
  editingDaily: DailyRecord | null,
  servidores: Servidor[],
  currentUser: User | null,
  setShowNewDailyModal: (val: boolean) => void,
  setEditingDaily: (val: DailyRecord | null) => void,
  setNewDailyData: (val: Omit<DailyRecord, 'id'>) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    if (!currentUser) throw new Error("Usuário não autenticado. Por favor, faça login novamente.");

    let servidorId = newDailyData.servidorId;
    const beneficiaryName = (newDailyData as any).beneficiary || newDailyData.driver || '';
    const registrationNumber = (newDailyData as any).registrationNumber || '';
    const cleanBeneficiaryName = beneficiaryName.trim();

    // Validação básica antes de tentar salvar
    if (!cleanBeneficiaryName) throw new Error("O nome do beneficiário é obrigatório.");
    if (!newDailyData.destination) throw new Error("O destino é obrigatório.");

    if (cleanBeneficiaryName) {
      const nameToSearch = cleanBeneficiaryName.toLowerCase();
      const existingServidor = servidorId 
        ? servidores.find(s => s.id === servidorId)
        : servidores.find(s => 
            (s.name && s.name.trim().toLowerCase() === nameToSearch) || 
            (registrationNumber && (s.registrationNumber === registrationNumber || (s as any).registration_number === registrationNumber))
          );

      if (existingServidor) {
        servidorId = existingServidor.id;
        // Removido o update automático de matrícula no servidor ao salvar diária
        // para evitar "dois lugares" e manter Servidores como única fonte de verdade.
        // Apenas a diária terá a matrícula histórica.
      } else if (!servidorId) {
        const insertData: any = {
          prefeituraId: currentUser.prefeituraId || '1',
          name: cleanBeneficiaryName,
          cpf: '', 
          department: '',
          position: '',
          createdAt: new Date().toISOString()
        };
        if (registrationNumber) insertData.registrationNumber = registrationNumber;

        const { data: servidorData, error: servidorError } = await supabase
          .from('servidores')
          .insert(insertData)
          .select()
          .single();
        
        if (servidorError) {
          console.warn("Erro ao inserir servidor com registrationNumber, tentando registration_number...", servidorError.message);
          const insertDataSnake = { ...insertData };
          if (registrationNumber) {
            delete (insertDataSnake as any).registrationNumber;
            (insertDataSnake as any).registration_number = registrationNumber;
          }
          
          let { data: retryData, error: retryError } = await supabase
            .from('servidores')
            .insert(insertDataSnake)
            .select()
            .single();
            
          if (retryError) {
            console.warn("Erro ao inserir com registration_number, tentando matricula...", retryError.message);
            const insertDataMatricula = { ...insertData };
            if (registrationNumber) {
              delete (insertDataMatricula as any).registrationNumber;
              (insertDataMatricula as any).matricula = registrationNumber;
            }
            const { data: matData, error: matError } = await supabase.from('servidores').insert(insertDataMatricula).select().single();
            retryData = matData;
            retryError = matError;
          }

          if (retryError) {
            console.error("Todas as tentativas de inserir matrícula falharam. Embutindo no position...", retryError.message);
            delete insertData.registrationNumber;
            if (registrationNumber) {
               insertData.position = `||| MAT:${registrationNumber}`;
            }
            const { data: finalRetry } = await supabase.from('servidores').insert(insertData).select().single();
            if (finalRetry) servidorId = finalRetry.id;
          } else if (retryData) {
            servidorId = (retryData as any).id;
          }
        } else if (servidorData) {
          servidorId = (servidorData as any).id;
        }
      }
    }

    // Prepara os dados para salvar
    const dailyData: any = {
      ...newDailyData,
      driver: cleanBeneficiaryName,
      date: (newDailyData as any).departureDate || newDailyData.date || new Date().toISOString().split('T')[0],
      servidorId: servidorId || '',
      value: (newDailyData.value || '').replace(/[R$\s.]/g, '').replace(',', '.')
    };
    
    // Garantir que a matrícula seja salva na diária também
    if (registrationNumber) {
      dailyData.registrationNumber = registrationNumber;
    }
    
    delete dailyData.beneficiary;

    const saveToSupabase = async (data: any) => {
      const cleanData = { ...data };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined || cleanData[key] === null) {
          delete cleanData[key];
        }
      });

      if (editingDaily) {
        return supabase.from('dailyRecords').update(cleanData).eq('id', editingDaily.id);
      } else {
        return supabase.from('dailyRecords').insert({
          ...cleanData,
          prefeituraId: currentUser.prefeituraId || '1'
        });
      }
    };

    let result = await saveToSupabase(dailyData);
    let error = result.error;
    
    if (error) {
      console.error("Erro inicial ao salvar diária:", error);
      
      // Se o erro for sobre registrationNumber, tentamos registration_number imediatamente
      if ((error.message?.includes('registrationNumber') || error.details?.includes('registrationNumber')) && dailyData.registrationNumber) {
        const resilientData = { ...dailyData };
        resilientData.registration_number = resilientData.registrationNumber;
        delete resilientData.registrationNumber;
        
        const retryResult = await saveToSupabase(resilientData);
        if (!retryResult.error) {
          result = retryResult;
          error = null;
        } else {
          error = retryResult.error;
        }
      }

      if (error) {
        const possibleProblematicColumns = [
          'purpose', 'registrationNumber', 'servidorId', 
          'approvalStatus', 'attachments', 'departureDate', 'returnDate', 'approvedBy', 'approvedAt'
        ];

        let resilientData = { ...dailyData };
        let currentError = error;

        for (const col of possibleProblematicColumns) {
          if (currentError?.message?.includes(col) || currentError?.details?.includes(col)) {
            console.warn(`Removendo coluna problemática '${col}' e tentando novamente...`);
            
            // Se for registrationNumber, tentamos mapear para aliases antes de desistir
            if (col === 'registrationNumber' && resilientData.registrationNumber) {
              // Tenta registration_number
              resilientData.registration_number = resilientData.registrationNumber;
              delete resilientData.registrationNumber;
              let retry = await saveToSupabase(resilientData);
              if (!retry.error) { currentError = null; break; }
              
              // Tenta matricula
              resilientData.matricula = resilientData.registration_number;
              delete resilientData.registration_number;
              retry = await saveToSupabase(resilientData);
              if (!retry.error) { currentError = null; break; }

              currentError = retry.error;
              // se as falhou de novo, aí sim removemos
              delete resilientData.matricula;
            } else {
              delete resilientData[col];
            }
            
            const retry = await saveToSupabase(resilientData);
            currentError = retry.error;
            if (!currentError) break;
          }
        }
        error = currentError;
      }
    }

    if (error) throw error;

    setShowNewDailyModal(false);
    setEditingDaily(null);
    setNewDailyData({
      prefeituraId: currentUser.prefeituraId || '1',
      beneficiary: '',
      servidorId: '',
      destination: '',
      departureDate: new Date().toISOString().split('T')[0],
      returnDate: '',
      purpose: '',
      value: '',
      status: 'pendente',
      approvalStatus: 'pendente',
      attachments: []
    } as any);
    addNotification("Sucesso", "Diária salva com sucesso!", "success");
  } catch (error: any) {
    handleError(error, "salvar diária");
    const errorMsg = error?.message?.includes('JWT') || error?.message?.includes('permission') 
      ? "Erro de permissão: Você não tem autorização para salvar diárias."
      : `Erro ao salvar: ${error?.message || 'Erro desconhecido'}`;
    addNotification("Erro", errorMsg, "error");
  }
};

export const handleApproveDaily = async (
  record: DailyRecord,
  currentUser: User,
  addNotification: (title: string, message: string, type: any) => void
) => {
  if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin' && currentUser.role !== 'gestor') {
    addNotification("Erro", "Apenas gestores e administradores podem aprovar diárias.", "error");
    return;
  }
  try {
    const { error } = await supabase
      .from('dailyRecords')
      .update({
        approvalStatus: 'aprovado',
        approvedBy: currentUser.id,
        approvedAt: new Date().toISOString(),
        status: 'aprovado'
      })
      .eq('id', record.id);
    
    if (error) throw error;
  } catch (error) {
    handleError(error, "aprovar diária");
    addNotification("Erro", "Erro ao aprovar diária.", "error");
  }
};

export const handleRejectDaily = async (
  record: DailyRecord,
  currentUser: User,
  addNotification: (title: string, message: string, type: any) => void
) => {
  if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin' && currentUser.role !== 'gestor') {
    addNotification("Erro", "Apenas gestores e administradores podem rejeitar diárias.", "error");
    return;
  }
  try {
    const { error } = await supabase
      .from('dailyRecords')
      .update({
        approvalStatus: 'rejeitado',
        status: 'atencao'
      })
      .eq('id', record.id);
    
    if (error) throw error;
  } catch (error) {
    handleError(error, "rejeitar diária");
    addNotification("Erro", "Erro ao rejeitar diária.", "error");
  }
};

export const handleDeleteDaily = async (
  id: string,
  setItemToDelete: (val: string | null) => void,
  setDeleteType: (val: any) => void,
  setShowDeleteConfirm: (val: boolean) => void
) => {
  setItemToDelete(id);
  setDeleteType('daily');
  setShowDeleteConfirm(true);
};

export const handleBulkDeleteDaily = async (
  selectedDailyIds: string[],
  setSelectedDailyIds: (val: string[]) => void,
  setIsDailySelectionMode: (val: boolean) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    await Promise.all(selectedDailyIds.map(id => 
      supabase.from('dailyRecords').delete().eq('id', id)
    ));

    setSelectedDailyIds([]);
    setIsDailySelectionMode(false);
    addNotification("Sucesso", "Diárias excluídas com sucesso.", "success");
  } catch (error) {
    handleError(error, "excluir diárias em lote");
    addNotification("Erro", "Erro ao excluir diárias em lote.", "error");
  }
};

export const syncServidoresFromDiarias = async (
  currentUser: User,
  servidores: Servidor[],
  dailyRecords: DailyRecord[],
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    const notify = (title: string, message: string, type: string) => {
      if (typeof addNotification === 'function') {
        addNotification(title, message, type);
      } else {
        console.log(`[Notification] ${title}: ${message} (${type})`);
      }
    };

    if (!dailyRecords || !Array.isArray(dailyRecords)) {
      notify("Erro", "Nenhuma diária encontrada para sincronizar.", "error");
      return;
    }

    const missingBeneficiaries = new Map<string, {name: string, registration?: string}>();
    const dailyUpdates: {id: string, servidorId: string}[] = [];
    
    // Identifica nomes que estão nas diárias mas não nos servidores
    dailyRecords.forEach(daily => {
      // Usamos driver ou beneficiaryName se disponível. 
      // Em muitos casos, o nome está em 'driver' no banco de dados
      const name = (daily as any).beneficiary || daily.driver; 
      if (!name || typeof name !== 'string') return;
      
      const cleanName = name.trim();
      const lowerName = cleanName.toLowerCase();
      
      const servant = servidores.find(s => 
        (s.name && s.name.trim().toLowerCase() === lowerName) ||
        (daily.registrationNumber && s.registrationNumber === daily.registrationNumber)
      );
      
      if (!servant) {
        if (!missingBeneficiaries.has(lowerName)) {
          missingBeneficiaries.set(lowerName, {
            name: cleanName,
            registration: daily.registrationNumber
          });
        }
      } else if (!daily.servidorId || daily.servidorId !== servant.id) {
        // Se já existe mas o ID não está vinculado na diária
        dailyUpdates.push({ id: daily.id, servidorId: servant.id });
      }
    });

    if (missingBeneficiaries.size === 0 && dailyUpdates.length === 0) {
      notify("Info", "Todos os registros já estão sincronizados e vinculados.", "info");
      return;
    }

    let createdCount = 0;
    if (missingBeneficiaries.size > 0) {
      const newServidores = Array.from(missingBeneficiaries.values()).map(b => ({
        prefeituraId: currentUser.prefeituraId || '1',
        name: b.name,
        registrationNumber: b.registration || '',
        cpf: '',
        department: '',
        position: '',
        createdAt: new Date().toISOString()
      }));

      let { data: createdServidores, error: insertError } = await supabase
        .from('servidores')
        .insert(newServidores)
        .select();
      
      if (insertError) {
        console.warn("Erro ao inserir servidores com registrationNumber, tentando registration_number...", insertError.message);
        const snakeServidores = newServidores.map(({ registrationNumber, ...rest }: any) => ({
          ...rest,
          registration_number: registrationNumber
        }));
        
        let { data: retryData, error: retryError } = await supabase
          .from('servidores')
          .insert(snakeServidores)
          .select();
        
        if (retryError) {
          console.warn("Erro ao inserir com registration_number, tentando matricula...", retryError.message);
          const matServidores = newServidores.map(({ registrationNumber, ...rest }: any) => ({
            ...rest,
            matricula: registrationNumber
          }));
          const { data: matData, error: matError } = await supabase.from('servidores').insert(matServidores).select();
          retryData = matData;
          retryError = matError;
        }

        if (retryError) {
          console.warn("Todas as tentativas de registro falharam, tentando sem matrícula...", retryError.message);
          const simplerServidores = newServidores.map(({ registrationNumber, ...rest }: any) => rest);
          const { data: finalData, error: finalError } = await supabase
            .from('servidores')
            .insert(simplerServidores)
            .select();
          
          if (finalError) throw finalError;
          createdServidores = finalData;
        } else {
          createdServidores = retryData;
        }
      }
      
      createdCount = createdServidores?.length || 0;

      // Após criar, vinculamos as diárias que geraram esses novos servidores
      if (createdServidores) {
        dailyRecords.forEach(daily => {
          const name = (daily as any).beneficiary || daily.driver;
          if (!name || typeof name !== 'string') return;
          const found = createdServidores.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());
          if (found && (!daily.servidorId || daily.servidorId !== found.id)) {
            dailyUpdates.push({ id: daily.id, servidorId: found.id });
          }
        });
      }
    }

    // Executa as atualizações de vínculo nas diárias
    let linkedCount = 0;
    if (dailyUpdates.length > 0) {
      // Remove duplicados de dailyUpdates
      const uniqueUpdates = Array.from(new Map(dailyUpdates.map(u => [u.id, u])).values());
      
      const updates = uniqueUpdates.map(async (upd) => {
        try {
          const { error } = await supabase
            .from('dailyRecords')
            .update({ servidorId: upd.servidorId })
            .eq('id', upd.id);
          if (!error) linkedCount++;
        } catch (e) {
          console.warn(`Não foi possível vincular diária ${upd.id}:`, e);
        }
      });
      
      await Promise.all(updates);
    }
    
    const messageParts = [];
    if (createdCount > 0) messageParts.push(`${createdCount} novos servidores cadastrados`);
    if (linkedCount > 0) messageParts.push(`${linkedCount} diárias vinculadas`);
    
    notify("Sucesso", messageParts.join(' e ') + " com sucesso.", "success");
  } catch (error) {
    handleError(error, "sincronizar servidores");
    if (typeof addNotification === 'function') {
      addNotification("Erro", "Falha ao sincronizar dados.", "error");
    }
  }
};

export const fetchDiariaPublic = async (id: string): Promise<DailyRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('dailyRecords')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar diária pública:", error);
    throw error;
  }
};

export const fetchDiariasByDate = async (date: string, prefeituraId: string = '1'): Promise<DailyRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('dailyRecords')
      .select('*')
      .eq('date', date)
      .eq('prefeituraId', prefeituraId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erro ao buscar diárias por data:", error);
    throw error;
  }
};

export const saveDiariaConfirmation = async (
  diaria: DailyRecord, 
  status: 'aprovado' | 'rejeitado',
  nome?: string,
  observacao?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const approvalName = nome || 'Link Público';
    // 1. Salvar na tabela de confirmações
    const { error: confirmError } = await supabase
      .from('diaria_confirmacoes')
      .insert({
        diaria_id: diaria.id,
        nome_aprovador: approvalName,
        data_aprovacao: new Date().toISOString(),
        prefeituraId: diaria.prefeituraId || '1',
        observacao: status === 'rejeitado' ? `REJEITADO: ${observacao || ''}` : observacao
      });
    
    if (confirmError) {
      if (confirmError.message?.includes('diaria_confirmacoes')) {
        console.warn("Tabela diaria_confirmacoes não encontrada. Apenas atualizando status da diária.");
      } else {
        throw confirmError;
      }
    }

    // 2. Atualizar status na diária
    const { error: updateError } = await supabase
      .from('dailyRecords')
      .update({
        status: status === 'aprovado' ? 'aprovado' : 'atencao',
        approvalStatus: status,
        approvedBy: `${approvalName}`,
        approvedAt: new Date().toISOString()
      })
      .eq('id', diaria.id);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao salvar confirmação de diária:", error);
    return { success: false, error: error.message || "Erro ao salvar confirmação." };
  }
};

export const saveBatchDiariaConfirmation = async (
  diarias: DailyRecord[], 
  status: 'aprovado' | 'rejeitado',
  nome?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const approvalName = nome || 'Link Público';
    const confirmations = diarias.map(d => ({
      diaria_id: d.id,
      nome_aprovador: approvalName,
      data_aprovacao: new Date().toISOString(),
      prefeituraId: d.prefeituraId || '1',
      observacao: status === 'rejeitado' ? 'REJEIÇÃO EM LOTE' : undefined
    }));

    // Tentativa de salvar confirmações em lote
    const { error: batchError } = await supabase
      .from('diaria_confirmacoes')
      .insert(confirmations);
    
    if (batchError && !batchError.message?.includes('diaria_confirmacoes')) {
      throw batchError;
    }

    // Atualizar status de todas as diárias
    const { error: updateError } = await supabase
      .from('dailyRecords')
      .update({
        status: status === 'aprovado' ? 'aprovado' : 'atencao',
        approvalStatus: status,
        approvedBy: `${approvalName}`,
        approvedAt: new Date().toISOString()
      })
      .in('id', diarias.map(d => d.id));

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao salvar confirmações de diária em lote:", error);
    return { success: false, error: error.message || "Erro ao salvar confirmações." };
  }
};
