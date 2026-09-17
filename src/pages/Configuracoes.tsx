import React, { useState } from 'react';
import { 
  Database, 
  FileText, 
  Info, 
  Paperclip, 
  Plus, 
  RefreshCw, 
  Trash2,
  Users,
  Shield,
  ChevronRight,
  LayoutDashboard,
  Fuel,
  Calendar,
  ClipboardCheck,
  BarChart3,
  Settings
} from 'lucide-react';
import { SystemSettings, User } from '../types';
import { cn } from '../lib/utils';

interface ConfiguracoesProps {
  settingsForm: SystemSettings | null;
  setSettingsForm: React.Dispatch<React.SetStateAction<SystemSettings | null>>;
  handleSaveSettings: () => void;
  isSavingSettings: boolean;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentUser: User | null;
  users: User[];
  handleEditUser: (user: User) => void;
  activityLogs: any[];
  refreshLogs: () => void;
}

const Configuracoes = ({
  settingsForm,
  setSettingsForm,
  handleSaveSettings,
  isSavingSettings,
  handleLogoUpload,
  currentUser,
  users,
  handleEditUser,
  activityLogs,
  refreshLogs
}: ConfiguracoesProps) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'permissoes' | 'logs'>('geral');
  const isSuperAdmin = currentUser?.role === 'superadmin';

  if (!settingsForm) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-text-secondary">
        <RefreshCw size={48} className="mb-4 animate-spin opacity-20" />
        <p className="text-lg font-medium">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1200px] mx-auto w-full p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Configurações</h2>
          <p className="text-text-secondary font-medium">Gerencie os dados da prefeitura e permissões de acesso.</p>
        </div>
        {activeTab === 'geral' && (
          <button 
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 btn-primary"
          >
            {isSavingSettings ? <RefreshCw size={20} className="animate-spin" /> : <Database size={20} />}
            Salvar Configurações
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto no-scrollbar pb-2 sm:pb-0">
        <div className="flex gap-2 p-1 bg-surface border border-border rounded-2xl w-max">
          <button
            onClick={() => setActiveTab('geral')}
            className={cn(
              "px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === 'geral' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-secondary hover:bg-surface-hover"
            )}
          >
            Geral
          </button>
          <button
            onClick={() => setActiveTab('permissoes')}
            className={cn(
              "px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === 'permissoes' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-secondary hover:bg-surface-hover"
            )}
          >
            Permissões
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => {
                setActiveTab('logs');
                refreshLogs();
              }}
              className={cn(
                "px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === 'logs' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-secondary hover:bg-surface-hover"
              )}
            >
              Logs de Atividade
            </button>
          )}
        </div>
      </div>

      {activeTab === 'geral' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ... existing content ... */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-8 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                <FileText size={20} />
                Dados do Cabeçalho (PDF)
              </h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-1">Entidade Municipal (Ex: Prefeitura)</label>
                  <input 
                    type="text"
                    className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold"
                    value={settingsForm.entidadeFilha || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev!, entidadeFilha: e.target.value }))}
                    placeholder="Ex: PREFEITURA MUNICIPAL DE ..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-1">CNPJ</label>
                    <input 
                      type="text"
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold"
                      value={settingsForm.cnpj || ''}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev!, cnpj: e.target.value }))}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-1">Setor Responsável</label>
                    <input 
                      type="text"
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold"
                      value={settingsForm.setor || ''}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev!, setor: e.target.value }))}
                      placeholder="Ex: SECRETARIA DE ADMINISTRAÇÃO"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-1">Endereço Completo</label>
                  <input 
                    type="text"
                    className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold"
                    value={settingsForm.endereco || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev!, endereco: e.target.value }))}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                  />
                </div>
              </div>
            </div>

            <div className="glass-card p-8 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Info size={20} />
                Sobre as Configurações
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed font-medium">
                As informações configuradas nesta seção são aplicadas globalmente em todos os documentos gerados pelo sistema, incluindo:
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {['Checklists de Processos', 'Relatórios de Combustível', 'Mapas de Diárias', 'Relatórios de Auditoria'].map((item) => (
                  <li key={item} className="text-xs font-bold flex items-center gap-2 text-text-primary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-8 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Paperclip size={20} />
                Logotipo
              </h3>
              
              <div className="flex flex-col items-center gap-6">
                <div className="w-full aspect-square bg-surface-hover border-2 border-dashed border-border rounded-3xl flex items-center justify-center overflow-hidden relative group transition-all hover:border-primary/50">
                  {settingsForm.logoBase64 ? (
                    <>
                      <img src={settingsForm.logoBase64} alt="Logo" className="w-full h-full object-contain p-6" />
                      <button 
                        onClick={() => setSettingsForm(prev => ({ ...prev!, logoBase64: undefined }))}
                        className="absolute inset-0 bg-rose-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"
                      >
                        <Trash2 size={40} />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-16 h-16 bg-surface border border-border rounded-2xl flex items-center justify-center mx-auto mb-4 text-text-secondary">
                        <Plus size={32} />
                      </div>
                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Sem Logotipo</span>
                    </div>
                  )}
                </div>
                
                <label className="w-full py-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary cursor-pointer transition-all shadow-sm">
                  Carregar Nova Imagem
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                <p className="text-[10px] text-text-secondary text-center font-medium leading-relaxed italic">
                  Formatos recomendados: PNG transparente ou SVG. <br />Tamanho máx: 2MB.
                </p>
              </div>
            </div>

            <div className="glass-card p-6 bg-primary/5 border-primary/10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Preview do Cabeçalho</h4>
              <div className="bg-white p-4 rounded-xl shadow-inner border border-border/50 pointer-events-none origin-top scale-90">
                <div className="flex items-center gap-3 mb-2">
                  {settingsForm.logoBase64 ? (
                    <img src={settingsForm.logoBase64} alt="Logo" className="w-10 h-10 object-contain" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                  )}
                  <div className="flex-1 text-[7px] font-bold text-black leading-tight">
                    <p className="text-[8px] uppercase">{settingsForm.entidadeFilha || 'ENTIDADE MUNICIPAL'}</p>
                    <p>CNPJ: {settingsForm.cnpj || '00.000.000/0000-00'}</p>
                    <p className="font-normal opacity-70">{settingsForm.endereco || 'ENDEREÇO'}</p>
                    <p className="font-normal opacity-70">{settingsForm.setor || 'DEPARTAMENTO'}</p>
                  </div>
                </div>
                <div className="h-[0.5px] bg-black/10 w-full" />
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'permissoes' ? (
        <div className="space-y-6">
          <div className="glass-card p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                <Shield className="text-primary" size={24} />
                Gestão de Usuários e Permissões
              </h3>
              
              <div className="flex gap-4">
                <div className="bg-surface-hover border border-border px-4 py-2 rounded-2xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {users.filter(u => u.status === 'ativo').length} Ativos
                  </span>
                </div>
                <div className="bg-surface-hover border border-border px-4 py-2 rounded-2xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {users.filter(u => u.lastLogin && new Date().getTime() - new Date(u.lastLogin).getTime() < 15 * 60 * 1000).length} Online
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {users.map((user, uIdx) => (
                <div 
                  key={`config-user-${user.id}-${uIdx}`}
                  className="p-6 bg-surface-hover border border-border rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-black shadow-inner">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-lg font-black tracking-tight leading-tight">{user.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                          user.role === 'superadmin' ? "bg-indigo-500/10 text-indigo-500" :
                          user.role === 'admin' ? "bg-rose-500/10 text-rose-500" : 
                          user.role === 'gestor' ? "bg-amber-500/10 text-amber-500" : 
                          "bg-blue-500/10 text-blue-500"
                        )}>
                          {user.role}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                          user.status === 'ativo' ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"
                        )}>
                          {user.status || 'Ativo'}
                        </span>
                        {user.lastLogin && new Date().getTime() - new Date(user.lastLogin).getTime() < 15 * 60 * 1000 && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online agora
                          </span>
                        )}
                        <span className="text-[10px] text-text-secondary font-bold">• {user.department}</span>
                      </div>
                      {user.lastLogin ? (
                        <p className="text-[9px] text-text-secondary mt-1 font-medium italic">
                          Visto por último: {new Date(user.lastLogin).toLocaleString('pt-BR')}
                        </p>
                      ) : (
                        <p className="text-[9px] text-text-secondary mt-1 font-medium italic">
                          Nunca acessou o sistema
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 flex-1 max-w-2xl justify-center md:justify-start">
                    {[
                      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={12} /> },
                      { id: 'combustivel', label: 'Combustível', icon: <Fuel size={12} /> },
                      { id: 'diarias', label: 'Diárias', icon: <Calendar size={12} /> },
                      { id: 'checklists', label: 'Checklists', icon: <ClipboardCheck size={12} /> },
                      { id: 'contratos', label: 'Contratos', icon: <FileText size={12} /> },
                      { id: 'usuarios', label: 'Usuários', icon: <Users size={12} /> },
                      { id: 'relatorios', label: 'Relatórios', icon: <BarChart3 size={12} /> },
                      { id: 'relatorio_executivo', label: 'Rel. Executivo', icon: <FileText size={12} /> },
                      { id: 'protocolo-entrada', label: 'Prot. Entrada', icon: <FileText size={12} /> },
                      { id: 'protocolo-saida', label: 'Prot. Saída', icon: <FileText size={12} /> },
                      { id: 'protocolo-processos', label: 'Processos', icon: <FileText size={12} /> },
                      { id: 'protocolo-tramitacao', label: 'Tramitação', icon: <FileText size={12} /> },
                      { id: 'protocolo-pendencias', label: 'Pendências', icon: <FileText size={12} /> },
                      { id: 'protocolo-arquivos', label: 'Arquivo', icon: <FileText size={12} /> },
                      { id: 'manual', label: 'Manual', icon: <FileText size={12} /> },
                      { id: 'configuracoes', label: 'Configurações', icon: <Settings size={12} /> }
                    ].map((perm) => {
                      const hasPerm = user.permissions?.includes(perm.id as any) || (user.role === 'superadmin');
                      return (
                        <div 
                          key={`${user.id}-${perm.id}`}
                          className={cn(
                            "px-3 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition-all",
                            hasPerm ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-surface border-border text-text-secondary opacity-40"
                          )}
                        >
                          {perm.icon}
                          {perm.label}
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => handleEditUser(user)}
                    className="px-6 py-3 bg-surface border border-border rounded-2xl text-xs font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                  >
                    Editar <ChevronRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-8 bg-amber-500/5 border-amber-500/20">
            <h4 className="text-sm font-black uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-2">
              <Info size={16} />
              Dica de Gestão
            </h4>
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              Você pode definir permissões específicas para cada usuário clicando em "Editar". 
              Usuários com nível <strong>Super Admin</strong> sempre possuem acesso total a todos os módulos do sistema.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-8 group">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                  <Database className="text-primary" size={24} />
                  Logs de Auditoria do Sistema
                </h3>
                <p className="text-text-secondary text-sm font-medium mt-1">Histórico de ações realizadas por todos os usuários.</p>
              </div>
              <button 
                onClick={refreshLogs}
                className="p-3 bg-surface border border-border rounded-xl text-text-secondary hover:text-primary transition-all active:ring-4 ring-primary/10"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            <div className="overflow-hidden border border-border rounded-2xl">
              <div className="max-h-[600px] overflow-y-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-surface z-10">
                    <tr className="bg-surface-hover/50 text-text-secondary text-[10px] font-black uppercase tracking-widest border-b border-border">
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4">Ação / Operação</th>
                      <th className="px-6 py-4">Data e Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-text-secondary font-medium">
                          Nenhum log de atividade registrado até o momento.
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map((log, idx) => (
                        <tr key={`log-${log.id}-${idx}`} className="hover:bg-surface-hover/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                              <Shield size={16} />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black tracking-tight">{log.user_name}</p>
                            <p className="text-[10px] text-text-secondary font-bold uppercase truncate max-w-[120px]">{log.user_id?.split('-')[0]}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-text-primary">{log.action}</p>
                            <p className="text-[10px] text-text-secondary italic mt-0.5">{log.details}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-black text-text-secondary">
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracoes;
