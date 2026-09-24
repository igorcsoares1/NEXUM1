import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Contract, ChecklistItem, FuelRecord, DailyRecord, Servidor, User, SystemSettings, Protocol } from '../types';

interface UseSupabaseProps {
  isAuthReady: boolean;
  currentUser: User | null;
  isLoggedIn: boolean;
}

export function useSupabase({ isAuthReady, currentUser, isLoggedIn }: UseSupabaseProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [checklistRecords, setChecklistRecords] = useState<ChecklistItem[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [confirmations, setConfirmations] = useState<any[]>([]);

  const normalizeUserData = (u: any) => {
    let department = u.department;
    let permissions = u.permissions || [];
    
    if (typeof department === 'string' && department.includes('||| PERM:')) {
      const parts = department.split('||| PERM:');
      department = parts[0].trim();
      try {
        // To handle cases where it might be appended multiple times, take the last part
        permissions = JSON.parse(parts[parts.length - 1].trim());
      } catch (e) {
        console.warn('Erro ao decodificar permissões packed:', e);
      }
    }
    return { ...u, department, permissions };
  };

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || !currentUser) return;

    const prefeituraId = currentUser.prefeituraId;

    const fetchWithRetry = async (fetchFn: () => any, ctx: string, retries = 3, delay = 2000) => {
      try {
        const { data, error } = await fetchFn();
        if (error) {
          // If the table is missing, don't retry, just return empty and warn
          if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message?.includes('cache')) {
             console.warn(`Tabela para ${ctx} não encontrada no Supabase. Retornando array vazio.`);
             return [];
          }
          
          if (error.message?.includes('Failed to fetch') && retries > 0) {
            console.warn(`Retrying ${ctx} fetch due to network error... (${retries} left)`);
            await new Promise(res => setTimeout(res, delay));
            return fetchWithRetry(fetchFn, ctx, retries - 1, delay * 2);
          }
          throw error;
        }
        return data;
      } catch (e: any) {
        if (e.message?.includes('Failed to fetch') && retries > 0) {
          console.warn(`Retrying ${ctx} fetch due to caught network error... (${retries} left)`);
          await new Promise(res => setTimeout(res, delay));
          return fetchWithRetry(fetchFn, ctx, retries - 1, delay * 2);
        }
        throw e;
      }
    };

    const fetchContracts = async () => {
      try {
        const data = await fetchWithRetry(() => 
          supabase.from('contracts').select('*').eq('prefeituraId', prefeituraId),
          "contracts"
        );
        setContracts(data || []);
      } catch (error: any) {
        console.warn('Erro ao carregar contratos:', error.message);
      }
    };

    const fetchChecklists = async () => {
      try {
        const data = await fetchWithRetry(() => 
          supabase.from('checklists').select('*').eq('prefeituraId', prefeituraId),
          "checklists"
        );
        setChecklistRecords(data || []);
      } catch (error: any) {
        console.warn('Erro ao carregar checklists:', error.message);
      }
    };

    const fetchFuel = async () => {
      try {
        const data = await fetchWithRetry(() => 
          supabase.from('fuelRecords').select('*').eq('prefeituraId', prefeituraId),
          "fuel"
        );
        setFuelRecords(data || []);
      } catch (error: any) {
        console.warn('Erro ao carregar abastecimentos:', error.message);
      }
    };

    const fetchDaily = async () => {
      try {
        const data = await fetchWithRetry(() => 
          supabase.from('dailyRecords').select('*').eq('prefeituraId', currentUser.prefeituraId),
          "daily"
        );
        const normalized = (data || []).map((r: any) => {
          const entry = Object.entries(r);
          const autoMatricula = entry.find(([k, v]) => 
            (k.toLowerCase().includes('matricu') || k.toLowerCase().includes('registra') || k === 'mat' || k === 'reg' || k.toLowerCase().includes('num_mat')) && 
            v && (typeof v === 'string' || typeof v === 'number')
          )?.[1];
          return {
            ...r,
            registrationNumber: r.registration_number || r.registrationNumber || r.matricula || r.mat || r.reg || r.registration || r.num_matricula || r.registrationnumber || r.matricula_servidor || r.num_mat || r.nr_matricula || r.matricula_serv || r.cd_matricula || String(autoMatricula || '')
          };
        });
        setDailyRecords(normalized);
      } catch (error: any) {
        console.warn('Erro ao carregar diárias:', error.message);
      }
    };

    const fetchServidores = async () => {
      try {
        const data = await fetchWithRetry(() => 
          supabase.from('servidores').select('*').eq('prefeituraId', currentUser.prefeituraId),
          "servidores"
        );
        const normalized = (data || []).map((s: any) => {
          let position = s.position;
          let packedMatricula = '';
          if (typeof position === 'string' && position.includes('||| MAT:')) {
            const parts = position.split('||| MAT:');
            position = parts[0].trim();
            packedMatricula = parts[1].trim();
          }

          const entry = Object.entries(s);
          const autoMatricula = entry.find(([k, v]) => 
            (k.toLowerCase().includes('matricu') || k.toLowerCase().includes('registra') || k === 'mat' || k === 'reg' || k.toLowerCase().includes('num_mat')) && 
            v && (typeof v === 'string' || typeof v === 'number')
          )?.[1];
          return {
            ...s,
            position,
            registrationNumber: packedMatricula || s.registration_number || s.registrationNumber || s.matricula || s.mat || s.reg || s.registration || s.num_matricula || s.registrationnumber || s.matricula_servidor || s.num_mat || s.nr_matricula || s.matricula_serv || s.cd_matricula || String(autoMatricula || '')
          };
        });
        setServidores(normalized);
      } catch (error: any) {
        console.warn('Erro ao carregar servidores:', error.message);
      }
    };

    const fetchUsers = async () => {
      try {
        const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
        if (isAdmin) {
          const data = await fetchWithRetry(() => 
            supabase.from('users').select('*').eq('prefeituraId', prefeituraId),
            "users"
          );
          setUsers((data || []).map(normalizeUserData));
        } else {
          setUsers([currentUser]);
        }
      } catch (error: any) {
        console.warn('Erro ao carregar usuários:', error.message);
      }
    };

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', prefeituraId)
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') {
            if (error.message?.includes('Failed to fetch')) {
              console.warn('Network error fetching settings, retrying once...');
              // Simple one-time retry for settings since it's a .single() call
              const { data: retryData, error: retryError } = await supabase.from('settings').select('*').eq('id', prefeituraId).single();
              if (!retryError) setSystemSettings(retryData);
              else console.warn('Erro ao carregar configurações:', retryError.message);
            } else {
              console.warn('Erro ao carregar configurações:', error.message);
            }
          }
          return;
        }
        setSystemSettings(data);
      } catch (e: any) {
        console.warn('Falha nas configurações:', e.message);
      }
    };

    const fetchProtocols = async () => {
      try {
        const data = await fetchWithRetry(() => 
          supabase.from('protocols').select('*').eq('prefeituraId', prefeituraId),
          "protocols"
        );
        setProtocols(data || []);
      } catch (error: any) {
        console.warn('Erro ao carregar protocolos:', error.message);
      }
    };

    const fetchConfirmations = async () => {
      try {
        const getDeletedConfIds = (): string[] => {
          try {
            const raw = localStorage.getItem('nexum_deleted_confirmations_ids');
            return raw ? JSON.parse(raw) : [];
          } catch {
            return [];
          }
        };
        const deletedConfIds = getDeletedConfIds();

        // Busca simples primeiro para evitar falha total por join
        const { data, error } = await supabase
          .from('checklist_confirmacoes')
          .select('*, checklist:checklists(id, processNumber, contractNumber, vendor, items)')
          .eq('prefeituraId', prefeituraId)
          .order('data_confirmacao', { ascending: false });
        
        if (error) {
          if (error.message?.includes('checklist_confirmacoes') || error.message?.includes('cache')) {
             setConfirmations([]);
             return;
          }
          console.warn('Erro ao carregar confirmações (com join):', error.message);
          
          // Tenta busca sem o join como fallback
          const { data: simpleData, error: simpleError } = await supabase
            .from('checklist_confirmacoes')
            .select('*')
            .eq('prefeituraId', prefeituraId)
            .order('data_confirmacao', { ascending: false });
            
          if (!simpleError) {
            const filtered = (simpleData || []).filter(c => !deletedConfIds.includes(c.id));
            setConfirmations(filtered);
          } else {
            console.warn('Erro ao carregar confirmações (simples):', simpleError.message);
            setConfirmations([]);
          }
          return;
        }
        const filtered = (data || []).filter(c => !deletedConfIds.includes(c.id));
        setConfirmations(filtered);
      } catch (e: any) {
        console.warn('Falha crítica nas confirmações:', e.message);
      }
    };

    // Carga inicial
    fetchContracts();
    fetchChecklists();
    fetchFuel();
    fetchDaily();
    fetchServidores();
    fetchUsers();
    fetchSettings();
    fetchProtocols();
    fetchConfirmations();

    // Realtime
    const confirmationsChannel = supabase.channel('confirmations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_confirmacoes' }, fetchConfirmations)
      .subscribe();

    const protocolsChannel = supabase.channel('protocols-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'protocols', filter: `prefeituraId=eq.${prefeituraId}` }, fetchProtocols)
      .subscribe();

    const contractsChannel = supabase.channel('contracts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts', filter: `prefeituraId=eq.${prefeituraId}` }, fetchContracts)
      .subscribe();

    const checklistsChannel = supabase.channel('checklists-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklists', filter: `prefeituraId=eq.${prefeituraId}` }, fetchChecklists)
      .subscribe();

    const fuelChannel = supabase.channel('fuel-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fuelRecords', filter: `prefeituraId=eq.${prefeituraId}` }, fetchFuel)
      .subscribe();

    const dailyChannel = supabase.channel('daily-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dailyRecords', filter: `prefeituraId=eq.${prefeituraId}` }, fetchDaily)
      .subscribe();

    const servidoresChannel = supabase.channel('servidores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servidores', filter: `prefeituraId=eq.${prefeituraId}` }, fetchServidores)
      .subscribe();

    const usersChannel = supabase.channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `prefeituraId=eq.${prefeituraId}` }, fetchUsers)
      .subscribe();

    const settingsChannel = supabase.channel('settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `id=eq.${prefeituraId}` }, fetchSettings)
      .subscribe();

    return () => {
      supabase.removeChannel(contractsChannel);
      supabase.removeChannel(checklistsChannel);
      supabase.removeChannel(fuelChannel);
      supabase.removeChannel(dailyChannel);
      supabase.removeChannel(servidoresChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(protocolsChannel);
      supabase.removeChannel(confirmationsChannel);
    };
  }, [isAuthReady, isLoggedIn, currentUser?.id, currentUser?.prefeituraId]);

  return {
    contracts,
    checklistRecords,
    fuelRecords,
    dailyRecords,
    servidores,
    users,
    systemSettings,
    protocols,
    confirmations,
    setContracts,
    setChecklistRecords,
    setFuelRecords,
    setDailyRecords,
    setServidores,
    setUsers,
    setSystemSettings,
    setProtocols,
    fetchContracts: async () => {
      if (!currentUser) return;
      const { data, error } = await supabase.from('contracts').select('*').eq('prefeituraId', currentUser.prefeituraId);
      if (!error) setContracts(data || []);
    },
    fetchFuelRecords: async () => {
      if (!currentUser) return;
      const { data, error } = await supabase.from('fuelRecords').select('*').eq('prefeituraId', currentUser.prefeituraId);
      if (!error) setFuelRecords(data || []);
    },
    fetchDailyRecords: async () => {
      if (!currentUser) return;
      const { data, error } = await supabase.from('dailyRecords').select('*').eq('prefeituraId', currentUser.prefeituraId);
      if (!error) {
        const normalized = (data || []).map((r: any) => {
          const entry = Object.entries(r);
          const autoMatricula = entry.find(([k, v]) => 
            (k.toLowerCase().includes('matricu') || k.toLowerCase().includes('registra') || k === 'mat' || k === 'reg' || k.toLowerCase().includes('num_mat')) && 
            v && (typeof v === 'string' || typeof v === 'number')
          )?.[1];
          return {
            ...r,
            registrationNumber: r.registration_number || r.registrationNumber || r.matricula || r.mat || r.reg || r.registration || r.num_matricula || r.registrationnumber || r.matricula_servidor || r.num_mat || r.nr_matricula || r.matricula_serv || r.cd_matricula || String(autoMatricula || '')
          };
        });
        setDailyRecords(normalized);
      }
    },
    fetchServidores: async () => {
      if (!currentUser) return;
      const { data, error } = await supabase.from('servidores').select('*').eq('prefeituraId', currentUser.prefeituraId);
      if (!error) {
        const normalized = (data || []).map((s: any) => {
          let position = s.position;
          let packedMatricula = '';
          if (typeof position === 'string' && position.includes('||| MAT:')) {
            const parts = position.split('||| MAT:');
            position = parts[0].trim();
            packedMatricula = parts[1].trim();
          }

          const entry = Object.entries(s);
          const autoMatricula = entry.find(([k, v]) => 
            (k.toLowerCase().includes('matricu') || k.toLowerCase().includes('registra') || k === 'mat' || k === 'reg' || k.toLowerCase().includes('num_mat')) && 
            v && (typeof v === 'string' || typeof v === 'number')
          )?.[1];
          return {
            ...s,
            position,
            registrationNumber: packedMatricula || s.registration_number || s.registrationNumber || s.matricula || s.mat || s.reg || s.registration || s.num_matricula || s.registrationnumber || s.matricula_servidor || s.num_mat || s.nr_matricula || s.matricula_serv || s.cd_matricula || String(autoMatricula || '')
          };
        });
        setServidores(normalized);
      }
    },
    fetchChecklists: async () => {
      if (!currentUser) return;
      const { data, error } = await supabase.from('checklists').select('*').eq('prefeituraId', currentUser.prefeituraId);
      if (!error) setChecklistRecords(data || []);
    },
    fetchUsers: async () => {
      if (!currentUser) return;
      const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
      if (isAdmin) {
        const { data, error } = await supabase.from('users').select('*').eq('prefeituraId', currentUser.prefeituraId);
        if (!error) {
          setUsers((data || []).map(normalizeUserData));
        }
      } else {
        setUsers([currentUser]);
      }
    }
  };
}
