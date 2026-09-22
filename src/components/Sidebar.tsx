import React from 'react';
import { 
  X, 
  LayoutDashboard, 
  Fuel, 
  Calendar, 
  ClipboardCheck, 
  FileText, 
  UserCircle, 
  BarChart3, 
  FileBarChart,
  LogOut,
  Settings,
  Users,
  Download,
  Upload,
  Repeat,
  Clock,
  Archive,
  BookOpen,
  ChevronDown,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { SidebarItem } from './SidebarItem';
import { User, View } from '../types';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeView: View;
  setActiveView: (view: View) => void;
  currentUser: User | null;
  isAdmin: boolean;
  handleLogout: () => void;
}

export const Sidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  activeView,
  setActiveView,
  currentUser,
  isAdmin,
  handleLogout
}: SidebarProps) => {
  const hasPermission = (view: View) => {
    if (!currentUser) return false;
    
    // Superadmin has access to everything
    if (currentUser.role === 'superadmin') return true;

    // Explicitly block visualizador from Notas Fiscais as requested
    if (currentUser.role === 'visualizador' && view === 'notas_fiscais') {
      return false;
    }
    
    // For all other roles, strictly follow the permissions array
    if (Array.isArray(currentUser.permissions)) {
      return currentUser.permissions.includes(view);
    }
    
    return false;
  };

  const hasAnyProtocolPermission = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'superadmin') return true;
    
    const protocolViews: View[] = [
      'protocolo-entrada', 
      'protocolo-saida', 
      'protocolo-processos', 
      'protocolo-tramitacao', 
      'protocolo-pendencias', 
      'protocolo-arquivos'
    ];
    
    return Array.isArray(currentUser.permissions) && 
           protocolViews.some(v => currentUser.permissions?.includes(v));
  };

  const [isProtocolOpen, setIsProtocolOpen] = React.useState(false);

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[70] w-72 bg-sidebar border-r border-white/10 flex flex-col p-6 gap-4 transition-transform duration-300 lg:relative lg:translate-x-0 print:hidden",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center">
            <svg width="200" height="52" viewBox="0 0 200 52" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8"/><stop offset="100%" stopColor="#0ea5e9"/></linearGradient>
                <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7dd3fc"/><stop offset="100%" stopColor="#0284c7"/></linearGradient>
                <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#bae6fd"/></linearGradient>
                <linearGradient id="textgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#38bdf8"/></linearGradient>
              </defs>
              <rect x="0" y="12" width="7" height="18" rx="2" fill="url(#bar1)"/>
              <rect x="9" y="7" width="7" height="23" rx="2" fill="url(#bar2)"/>
              <rect x="18" y="2" width="7" height="28" rx="2" fill="url(#bar3)"/>
              <polyline points="3.5,10 12.5,5 21.5,0" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
              <circle cx="21.5" cy="0" r="2" fill="#ffffff" opacity="0.9"/>
              <line x1="32" y1="4" x2="32" y2="30" stroke="#38bdf8" strokeWidth="0.5" opacity="0.3"/>
              <text x="40" y="26" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="26" fontWeight="700" letterSpacing="3" fill="url(#textgrad)" dominantBaseline="auto">NEXUM</text>
              <line x1="40" y1="33" x2="155" y2="33" stroke="#38bdf8" strokeWidth="0.5" opacity="0.3"/>
              <text x="40" y="41" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="6" fontWeight="300" fill="#38bdf8" letterSpacing="3.5">GESTÃO MUNICIPAL</text>
            </svg>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-white/10 rounded-xl lg:hidden text-white/70"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto pr-2">
          {hasPermission('dashboard') && (
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={activeView === 'dashboard'} 
              onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }} 
            />
          )}
          {hasPermission('combustivel') && (
            <SidebarItem 
              icon={Fuel} 
              label="Combustível" 
              active={activeView === 'combustivel'} 
              onClick={() => { setActiveView('combustivel'); setIsSidebarOpen(false); }} 
            />
          )}
          {hasPermission('diarias') && (
            <SidebarItem 
              icon={Calendar} 
              label="Diárias" 
              active={activeView === 'diarias'} 
              onClick={() => { setActiveView('diarias'); setIsSidebarOpen(false); }} 
            />
          )}
          {hasPermission('checklists') && (
            <SidebarItem 
              icon={ClipboardCheck} 
              label="Checklists" 
              active={activeView === 'checklists'} 
              onClick={() => { setActiveView('checklists'); setIsSidebarOpen(false); }} 
            />
          )}
          {hasPermission('contratos') && (
            <SidebarItem 
              icon={FileText} 
              label="Contratos" 
              active={activeView === 'contratos'} 
              onClick={() => { setActiveView('contratos'); setIsSidebarOpen(false); }} 
            />
          )}
          {hasPermission('notas_fiscais') && (
            <SidebarItem 
              icon={FileText} 
              label="Notas Fiscais" 
              active={activeView === 'notas_fiscais'} 
              onClick={() => { setActiveView('notas_fiscais'); setIsSidebarOpen(false); }} 
            />
          )}
          {hasPermission('usuarios') && (
            <SidebarItem 
              icon={UserCircle} 
              label="Usuários" 
              active={activeView === 'usuarios'} 
              onClick={() => { setActiveView('usuarios'); setIsSidebarOpen(false); }} 
            />
          )}
          {hasPermission('relatorios') && (
            <SidebarItem 
              icon={BarChart3} 
              label="Relatórios" 
              active={activeView === 'relatorios'} 
              onClick={() => { setActiveView('relatorios'); setIsSidebarOpen(false); }} 
            />
          )}

          {hasPermission('relatorio_executivo') && (
            <SidebarItem 
              icon={FileBarChart} 
              label="Relatório Executivo IA" 
              active={activeView === 'relatorio_executivo'} 
              onClick={() => { setActiveView('relatorio_executivo'); setIsSidebarOpen(false); }} 
            />
          )}

          {/* PROTOCOLO GROUP */}
          {hasAnyProtocolPermission() && (
            <div className="mt-2">
              <button
                onClick={() => setIsProtocolOpen(!isProtocolOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 cursor-pointer hover:bg-white/10 group",
                  activeView.startsWith('protocolo') ? "text-white" : "text-slate-300 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className={cn(
                    "transition-colors",
                    activeView.startsWith('protocolo') ? "text-accent" : "text-slate-300 group-hover:text-white"
                  )} />
                  <span className="text-sm font-bold tracking-tight">Protocolo</span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={cn(
                    "transition-transform duration-300",
                    isProtocolOpen ? "rotate-180" : ""
                  )} 
                />
              </button>

              <AnimatePresence>
                {(isProtocolOpen || activeView.startsWith('protocolo')) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 mt-1 ml-9">
                      {hasPermission('protocolo-entrada') && (
                        <button
                          onClick={() => { setActiveView('protocolo-entrada'); setIsSidebarOpen(false); }}
                          className={cn(
                            "text-left py-2 px-2 text-sm font-medium transition-colors rounded-lg",
                            activeView === 'protocolo-entrada' ? "text-white bg-white/10" : "text-slate-300 hover:text-white"
                          )}
                        >
                          Protocolos de Entrada
                        </button>
                      )}
                      {hasPermission('protocolo-saida') && (
                        <button
                          onClick={() => { setActiveView('protocolo-saida'); setIsSidebarOpen(false); }}
                          className={cn(
                            "text-left py-2 px-2 text-sm font-medium transition-colors rounded-lg",
                            activeView === 'protocolo-saida' ? "text-white bg-white/10" : "text-slate-300 hover:text-white"
                          )}
                        >
                          Protocolos de Saída
                        </button>
                      )}
                      {hasPermission('protocolo-processos') && (
                        <button
                          onClick={() => { setActiveView('protocolo-processos'); setIsSidebarOpen(false); }}
                          className={cn(
                            "text-left py-2 px-2 text-sm font-medium transition-colors rounded-lg",
                            activeView === 'protocolo-processos' ? "text-white bg-white/10" : "text-slate-300 hover:text-white"
                          )}
                        >
                          Processos
                        </button>
                      )}
                      {hasPermission('protocolo-tramitacao') && (
                        <button
                          onClick={() => { setActiveView('protocolo-tramitacao'); setIsSidebarOpen(false); }}
                          className={cn(
                            "text-left py-2 px-2 text-sm font-medium transition-colors rounded-lg",
                            activeView === 'protocolo-tramitacao' ? "text-white bg-white/10" : "text-slate-300 hover:text-white"
                          )}
                        >
                          Tramitação
                        </button>
                      )}
                      {hasPermission('protocolo-pendencias') && (
                        <button
                          onClick={() => { setActiveView('protocolo-pendencias'); setIsSidebarOpen(false); }}
                          className={cn(
                            "text-left py-2 px-2 text-sm font-medium transition-colors rounded-lg",
                            activeView === 'protocolo-pendencias' ? "text-white bg-white/10" : "text-slate-300 hover:text-white"
                          )}
                        >
                          Pendências
                        </button>
                      )}
                      {hasPermission('protocolo-arquivos') && (
                        <button
                          onClick={() => { setActiveView('protocolo-arquivos'); setIsSidebarOpen(false); }}
                          className={cn(
                            "text-left py-2 px-2 text-sm font-medium transition-colors rounded-lg",
                            activeView === 'protocolo-arquivos' ? "text-white bg-white/10" : "text-slate-300 hover:text-white"
                          )}
                        >
                          Arquivo
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-4 mb-1 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Suporte
          </div>
          {hasPermission('manual') && (
            <SidebarItem 
              icon={BookOpen} 
              label="Manual de Uso" 
              active={activeView === 'manual'} 
              onClick={() => { setActiveView('manual'); setIsSidebarOpen(false); }} 
            />
          )}

          {hasPermission('configuracoes') && (
            <SidebarItem 
              icon={Settings} 
              label="Configurações" 
              active={activeView === 'configuracoes'} 
              onClick={() => { setActiveView('configuracoes'); setIsSidebarOpen(false); }} 
            />
          )}
        </nav>

        <div className="flex flex-col gap-4 mt-auto">
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold shrink-0">
              {currentUser?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-white uppercase tracking-tight">{currentUser?.name || 'Usuário'}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase tracking-tight">{currentUser?.role || ''}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-rose-400 font-bold hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>
    </>
  );
};
