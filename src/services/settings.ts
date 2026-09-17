import React from 'react';
import { supabase } from '../lib/supabase';
import { SystemSettings, User } from '../types';

const handleError = (error: any, ctx: string) => console.error(`Erro em ${ctx}:`, error?.message);

export const handleSaveSettings = async (
  settingsForm: SystemSettings | null,
  currentUser: User,
  setIsSavingSettings: (val: boolean) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  if (!currentUser || !settingsForm) {
    console.warn("Tentativa de salvar sem usuário ou formulário:", { currentUser: !!currentUser, settingsForm: !!settingsForm });
    return;
  }
  
  setIsSavingSettings(true);
  try {
    const dataToSave = {
      ...settingsForm,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id
    };
    
    // Basic size check for the logo (main contributor to size)
    if (dataToSave.logoBase64 && dataToSave.logoBase64.length > 950000) {
      addNotification('Erro de Tamanho', 'O logotipo está muito grande (limite de 1MB do banco de dados). Tente uma imagem com menos detalhes ou menor resolução.', 'error');
      setIsSavingSettings(false);
      return;
    }

    console.log("Salvando configurações no Supabase:", dataToSave);
    const { error } = await supabase
      .from('settings')
      .upsert(dataToSave);
    
    if (error) {
      if (error.message?.includes('settings') || error.message?.includes('schema cache')) {
        console.warn("Tabela settings não encontrada.");
        addNotification('Aviso', 'A tabela de configurações não existe no Supabase. Execute o script SQL.', 'warning');
      } else {
        throw error;
      }
    } else {
      addNotification('Sucesso', 'Configurações salvas com sucesso!', 'success');
    }
  } catch (error) {
    handleError(error, "salvar configurações");
    addNotification('Erro', 'Falha ao salvar configurações.', 'error');
  } finally {
    setIsSavingSettings(false);
  }
};

export const handleLogoUpload = (
  e: React.ChangeEvent<HTMLInputElement>,
  setSettingsForm: React.Dispatch<React.SetStateAction<SystemSettings | null>>,
  addNotification: (title: string, message: string, type: any) => void
) => {
  const file = e.target.files?.[0];
  if (file) {
    // Check file size before processing (limit to 2MB for processing, but we will resize anyway)
    if (file.size > 2 * 1024 * 1024) {
      addNotification('Aviso', 'A imagem é muito grande. Por favor, escolha uma imagem menor que 2MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      
      // Resize image to ensure it fits in database (1MB limit for entire document)
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Use PNG for transparency, but check size later
        const resizedBase64 = canvas.toDataURL('image/png');
        setSettingsForm(prev => ({ ...(prev || {}), logoBase64: resizedBase64 } as SystemSettings));
      };
    };
    reader.readAsDataURL(file);
  }
};
