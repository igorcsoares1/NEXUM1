import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

const initialUsers: User[] = [
  {
    id: '1',
    prefeituraId: '1',
    name: 'Igor Tráfego Pago',
    username: 'igor',
    password: '123',
    email: 'trafegopagoigor@gmail.com',
    role: 'superadmin',
    department: 'Administração',
    status: 'ativo',
    lastLogin: ''
  }
];

export function useAuth() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const isGestor = useMemo(() => currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin' || currentUser.role === 'gestor'), [currentUser]);
  const isAdmin = useMemo(() => currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin'), [currentUser]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Limpa todos os possíveis tokens residuais do Supabase no localStorage
        // de forma genérica para evitar o erro "Refresh Token Not Found"
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        });

        const savedUser = localStorage.getItem('nexum_user');
        if (savedUser) {
          try {
            const user = JSON.parse(savedUser);
            setCurrentUser(user);
            setIsLoggedIn(true);
          } catch (e) {
            localStorage.removeItem('nexum_user');
          }
        }

        // Reestabelece sessão do banco com a conta de serviço
        // Tentamos o login, se falhar não bloqueamos a interface, apenas logamos o erro
        const servicePassword = import.meta.env.VITE_SUPABASE_SERVICE_PASSWORD || 'sb_secret_NLUQx3nH1Y0D36ry0Dcq0_a4wyRbY';

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: 'service@nexum.internal',
          password: servicePassword
        });

        if (signInError) {
          console.warn("Aviso na autenticação de serviço:", signInError.message);
          // O erro "Refresh Token Not Found" costuma aparecer quando há lixo no localStorage
        }

      } catch (err) {
        console.error("Erro crítico ao restaurar sessão:", err);
      } finally {
        setIsAuthReady(true);
      }
    };

    restoreSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      // 1. Estabelece sessão com conta de serviço
      const servicePassword = import.meta.env.VITE_SUPABASE_SERVICE_PASSWORD || 'sb_secret_NLUQx3nH1Y0D36ry0Dcq0_a4wyRbY';

      try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: 'service@nexum.internal',
          password: servicePassword
        });

        if (authError) {
          console.warn("Aviso na autenticação de serviço:", authError.message);
          // Não bloqueamos o login aqui, pois as tabelas podem estar públicas ou 
          // o usuário pode estar usando uma configuração diferente de RLS.
        }
      } catch (e: any) {
        console.warn("Falha ao tentar autenticação de serviço:", e.message);
      }

      // 2. Busca o usuário na tabela customizada
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginData.username)
        .eq('password', loginData.password)
        .single();

      if (error || !data) {
        setLoginError('Usuário ou senha incorretos.');
        return;
      }

      if (data.status === 'inativo') {
        setLoginError('Este usuário está inativo. Contate o administrador.');
        return;
      }

      // 3. Sucesso: desempacota department e permissions
      const u = data as any;
      let department = u.department;
      let permissions = u.permissions || [];
      if (typeof department === 'string' && department.includes('||| PERM:')) {
        const parts = department.split('||| PERM:');
        department = parts[0].trim();
        try {
          permissions = JSON.parse(parts[parts.length - 1].trim());
        } catch (e) {}
      }
      
      const user: User = { ...u, department, permissions };
      localStorage.setItem('nexum_user', JSON.stringify(user));
      setCurrentUser(user);
      setIsLoggedIn(true);

      // Atualiza lastLogin (opcional, ignora erro se coluna não existir)
      try {
        await supabase
          .from('users')
          .update({ lastLogin: new Date().toISOString() })
          .eq('id', user.id);
      } catch (e) {
        console.warn("Aviso: Não foi possível atualizar lastLogin");
      }

    } catch (err: any) {
      console.error("Erro no login:", err);
      if (err.message?.includes('Failed to fetch') || err.code === 'fetch_error') {
        setLoginError('Erro de conexão: Verifique sua internet ou bloqueadores de anúncios.');
      } else {
        setLoginError('Erro ao realizar login. Tente novamente.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('nexum_user');
      setIsLoggedIn(false);
      setCurrentUser(null);
      setLoginData({ username: '', password: '' });
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return {
    isAuthReady,
    authError,
    isLoggedIn,
    setIsLoggedIn,
    currentUser,
    setCurrentUser,
    loginData,
    setLoginData,
    loginError,
    setLoginError,
    handleLogin,
    handleLogout,
    isGestor,
    isAdmin
  };
}
