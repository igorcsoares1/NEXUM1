import { supabase } from '../lib/supabase';
import { User } from '../types';

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
}

export const logActivity = async (
  currentUser: User | null,
  action: string,
  details: string
) => {
  if (!currentUser) return;

  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        action,
        details,
        timestamp: new Date().toISOString(),
        prefeituraId: currentUser.prefeituraId || '1'
      });
    
    if (!error) {
      window.dispatchEvent(new CustomEvent('activity_logged'));
    }

    if (error) {
      if (error.message?.includes('Failed to fetch') || error.code === 'fetch_error') {
        console.warn('Conexão perdida com o servidor. Verifique sua internet ou se há bloqueadores de anúncios ativos.');
      } else if (error.code === 'PGRST116' || error.code === 'PGRST205') {
        console.warn('Tabela activity_logs não encontrada. Log ignorado.');
      } else {
        console.error('Erro ao registrar log:', error);
      }
    }
  } catch (err: any) {
    if (err.message?.includes('Failed to fetch')) {
      console.warn('Falha na rede ao registrar log.');
    } else {
      console.error('Falha crítica ao registrar log:', err);
    }
  }
};

export const fetchLogs = async (prefeituraId: string): Promise<ActivityLog[]> => {
  try {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('prefeituraId', prefeituraId)
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message?.includes('Failed to fetch') || error.code === 'fetch_error') {
        console.warn('Erro de conexão ou tabela activity_logs ausente: Supabase inacessível.');
      }
      throw error;
    }
    return data || [];
  } catch (err: any) {
    if (err.message?.includes('Failed to fetch')) {
      console.warn('Supabase offline ou bloqueado pelo navegador.');
    } else {
      console.error('Erro ao buscar logs:', err);
    }
    return [];
  }
};
