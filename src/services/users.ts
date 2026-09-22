import { supabase } from '../lib/supabase';
import { User } from '../types';

const handleError = (error: any, ctx: string) => console.error(`Erro em ${ctx}:`, error?.message);

export const handleEditUser = (
  user: User,
  setEditingUser: (val: User | null) => void,
  setNewUserData: (val: Omit<User, 'id' | 'lastLogin'>) => void,
  setShowNewUserModal: (val: boolean) => void
) => {
  setEditingUser(user);
  setNewUserData({
    prefeituraId: user.prefeituraId,
    name: user.name,
    username: user.username,
    password: user.password,
    email: user.email,
    role: user.role,
    department: user.department,
    status: user.status,
    permissions: user.permissions || []
  });
  setShowNewUserModal(true);
};

export const handleSaveUser = async (
  newUserData: Omit<User, 'id' | 'lastLogin'>,
  editingUser: User | null,
  currentUser: User,
  setCurrentUser: (val: User) => void,
  setShowNewUserModal: (val: boolean) => void,
  setEditingUser: (val: User | null) => void,
  setNewUserData: (val: Omit<User, 'id' | 'lastLogin'>) => void,
  addNotification: (title: string, message: string, type: any) => void
) => {
  if (!newUserData.name || !newUserData.username) return;
  
  try {
    if (editingUser) {
      const updateData = { ...newUserData };
      // Se a senha estiver vazia ao editar, não a atualizamos (mantemos a atual)
      if (!updateData.password) {
        delete updateData.password;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);
      
      if (error) throw error;
      
      // Se o usuário editado for o usuário atual, atualiza o estado do usuário atual
      if (currentUser.id === editingUser.id) {
        const updatedUser = { ...editingUser, ...newUserData };
        setCurrentUser(updatedUser);
        localStorage.setItem('nexum_user', JSON.stringify(updatedUser));
      }
    } else {
      const newUser = {
        ...newUserData,
        lastLogin: 'Nunca',
        password: newUserData.password || '123' // Default password if not set
      };
      const { error } = await supabase
        .from('users')
        .insert(newUser);
      
      if (error) throw error;
    }
    
    setShowNewUserModal(false);
    setEditingUser(null);
    setNewUserData({
      prefeituraId: currentUser.prefeituraId || '1',
      name: '',
      username: '',
      password: '',
      email: '',
      role: 'compras',
      department: '',
      status: 'ativo',
      permissions: ['notas_fiscais']
    });
    addNotification("Sucesso", "Usuário salvo com sucesso!", "success");
  } catch (error: any) {
    if (error?.message?.includes("Could not find the 'permissions' column") || error?.message?.includes("column \"permissions\" does not exist")) {
      // Fallback: Pack permissions into department
      try {
        const fallbackData = { ...newUserData };
        // Se a senha estiver vazia ao editar, não a atualizamos (mantemos a atual)
        if (editingUser && !fallbackData.password) {
          delete fallbackData.password;
        }
        
        delete (fallbackData as any).permissions;
        
        // Clean out any existing PERM string from department before appending a new one
        let baseDepartment = fallbackData.department || '';
        if (baseDepartment.includes('||| PERM:')) {
          baseDepartment = baseDepartment.split('||| PERM:')[0].trim();
        }
        
        const packedPerms = newUserData.permissions ? JSON.stringify(newUserData.permissions) : '[]';
        fallbackData.department = `${baseDepartment} ||| PERM:${packedPerms}`;
        
        if (editingUser) {
          const { error: fallbackError } = await supabase.from('users').update(fallbackData).eq('id', editingUser.id);
          if (fallbackError) throw fallbackError;
        } else {
          const newUser = {
            ...fallbackData,
            lastLogin: 'Nunca',
            password: fallbackData.password || '123'
          };
          const { error: fallbackError } = await supabase.from('users').insert(newUser);
          if (fallbackError) throw fallbackError;
        }
        
        // Se o usuário editado for o usuário atual
        if (editingUser && currentUser.id === editingUser.id) {
          const updatedUser = { ...editingUser, ...newUserData };
          setCurrentUser(updatedUser);
          localStorage.setItem('nexum_user', JSON.stringify(updatedUser));
        }

        setShowNewUserModal(false);
        setEditingUser(null);
        setNewUserData({
          prefeituraId: currentUser.prefeituraId || '1',
          name: '',
          username: '',
          password: '',
          email: '',
          role: 'compras',
          department: '',
          status: 'ativo',
          permissions: ['notas_fiscais']
        });
        addNotification("Sucesso", "Usuário e permissões salvos (Usando fallback de schema).", "success");
        return;
      } catch (fallbackError) {
        handleError(fallbackError, "salvar usuário (fallback)");
      }
    } else {
      const isFetchError = error?.message?.includes('Failed to fetch') || error?.code === 'fetch_error';
      handleError(error, "salvar usuário");
      
      if (isFetchError) {
        addNotification("Erro de Conexão", "Não foi possível conectar ao servidor. Verifique sua internet.", "error");
      } else {
        addNotification("Erro", `Erro ao salvar usuário: ${error.message || 'Verifique sua conexão.'}`, "error");
      }
    }
  }
};

export const handleDeleteUser = async (
  id: string,
  setItemToDelete: (val: string | null) => void,
  setDeleteType: (val: any) => void,
  setShowDeleteConfirm: (val: boolean) => void
) => {
  setItemToDelete(id);
  setDeleteType('user');
  setShowDeleteConfirm(true);
};

export const handleToggleUserStatus = async (
  user: User,
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    const newStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
    const { error } = await supabase
      .from('users')
      .update({
        status: newStatus
      })
      .eq('id', user.id);
    
    if (error) throw error;
    addNotification("Sucesso", `Usuário ${newStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso.`, "success");
  } catch (error) {
    handleError(error, "alterar status do usuário");
    addNotification("Erro", "Erro ao alterar status do usuário.", "error");
  }
};

export const handleResetPassword = async (
  user: User,
  addNotification: (title: string, message: string, type: any) => void
) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        password: '123'
      })
      .eq('id', user.id);
    
    if (error) throw error;
    addNotification("Sucesso", "Senha resetada para '123'.", "success");
  } catch (error) {
    handleError(error, "resetar senha");
    addNotification("Erro", "Erro ao resetar senha.", "error");
  }
};
