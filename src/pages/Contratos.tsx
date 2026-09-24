import React from 'react';
import { 
  Printer, CheckSquare, Trash2, FileText, RefreshCw, Plus, TrendingUp, Clock, Database, Search, Filter, Copy, Settings, AlertTriangle, Calendar, AlertCircle, Menu, UploadCloud, FileUp, CheckCircle2, ChevronRight, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { formatCurrency, parseCurrencyToNumber, safeFormatDate, safeGetDaysRemaining } from '../utils/format';
import { Contract, User } from '../types';
import { PaginationControls } from '../components/ui/PaginationControls';
import { PrintHeader } from '../components/ui/PrintHeader';
import { StatCard } from '../components/ui/StatCard';
import { supabase } from '../lib/supabase';

interface ContratosProps {
  currentUser: User;
  contracts: Contract[];
  filteredContracts: Contract[];
  paginatedContracts: Contract[];
  contractStats: any;
  lastSync: string | null;
  handlePrint: () => void;
  isContractSelectionMode: boolean;
  setIsContractSelectionMode: (mode: boolean) => void;
  selectedContractIds: string[];
  setSelectedContractIds: (ids: string[]) => void;
  setDeleteType: (type: 'contract' | 'contractBulk') => void;
  setShowDeleteConfirm: (show: boolean) => void;
  isImporting: boolean;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isGestor: boolean;
  handleSyncContracts: () => void;
  isSyncing: boolean;
  canAdd: boolean;
  setEditingContract: (contract: Contract | null) => void;
  setNewContractData: (data: any) => void;
  setShowNewContractModal: (show: boolean) => void;
  contractFilter: string;
  setContractFilter: (filter: any) => void;
  contractSearch: string;
  setContractSearch: (search: string) => void;
  setContractsPage: (page: number) => void;
  showContractFilters: boolean;
  setShowContractFilters: (show: boolean) => void;
  contractFilters: any;
  setContractFilters: (filters: any) => void;
  contractsPage: number;
  contractsPerPage: number;
  setContractsPerPage: (val: number) => void;
  canEdit: boolean;
  canDelete: boolean;
  handleEditContract: (contract: Contract) => void;
  handleDeleteContract: (id: string) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

  const Contratos = ({
  currentUser, contracts, filteredContracts, paginatedContracts, contractStats, lastSync, handlePrint, isContractSelectionMode, setIsContractSelectionMode, selectedContractIds, setSelectedContractIds, setDeleteType, setShowDeleteConfirm, isImporting, handleImportFile, isGestor, handleSyncContracts, isSyncing, canAdd, setEditingContract, setNewContractData, setShowNewContractModal, contractFilter, setContractFilter, contractSearch, setContractSearch, setContractsPage, showContractFilters, setShowContractFilters, contractFilters, setContractFilters, contractsPage, contractsPerPage, setContractsPerPage, canEdit, canDelete, handleEditContract, handleDeleteContract, addNotification
}: ContratosProps) => {

  const getStatusConfig = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'vigente':
        return { 
          color: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30', 
          text: 'Vigente', 
          dot: 'bg-emerald-500',
          avatarBg: 'bg-emerald-500/10',
          avatarText: 'text-emerald-500'
        };
      case 'aditivado':
        return { 
          color: 'bg-blue-500/15 text-blue-500 border border-blue-500/30', 
          text: 'Aditivado', 
          dot: 'bg-blue-500',
          avatarBg: 'bg-blue-500/10',
          avatarText: 'text-blue-500'
        };
      case 'atencao':
        return { 
          color: 'bg-amber-500/15 text-amber-500 border border-amber-500/30', 
          text: 'Atenção', 
          dot: 'bg-amber-500',
          avatarBg: 'bg-amber-500/10',
          avatarText: 'text-amber-500'
        };
      case 'vencido':
        return { 
          color: 'bg-rose-500/15 text-rose-500 border border-rose-500/30', 
          text: 'Vencido', 
          dot: 'bg-rose-500',
          avatarBg: 'bg-rose-500/10',
          avatarText: 'text-rose-500'
        };
      default:
        return { 
          color: 'bg-slate-500/15 text-slate-500 border border-slate-500/30', 
          text: status, 
          dot: 'bg-slate-500',
          avatarBg: 'bg-slate-500/10',
          avatarText: 'text-slate-500'
        };
    }
  };

  const parseCurrency = (val: string | undefined) => parseCurrencyToNumber(val);

  return (
    <div className="flex flex-col flex-1" id="contract-content">
      <PrintHeader title="Gestão de Contratos" />

      {/* ── MOBILE LAYOUT ─────────────────────────────────── */}
      <div className="flex flex-col lg:hidden min-h-full bg-background pb-20">
        
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 pt-4 pb-3 print:hidden">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-black tracking-tight">Contratos Administrativos</h2>
            <div className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-black">{filteredContracts.length}</span>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60" />
              <input 
                type="text" 
                placeholder="Buscar contrato ou fornecedor..."
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
                className="w-full bg-surface border border-border/60 rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-primary/50 transition-all text-sm font-medium"
              />
            </div>
            {canAdd && (
              <label className={cn(
                "w-12 h-12 flex items-center justify-center rounded-2xl border transition-all active:scale-95 cursor-pointer",
                isImporting ? "bg-surface border-border/40 text-text-secondary/50 pointer-events-none" : "bg-surface border-border/60 text-text-secondary hover:bg-surface-hover"
              )}>
                {isImporting ? <RefreshCw size={20} className="animate-spin" /> : <FileUp size={20} />}
                <input type="file" className="hidden" accept=".xlsx,.xls,.pdf,.csv,.doc,.docx" onChange={handleImportFile} disabled={isImporting} />
              </label>
            )}
            <button 
              onClick={() => setShowContractFilters(!showContractFilters)}
              className={cn(
                "w-12 h-12 flex items-center justify-center rounded-2xl border transition-all active:scale-95",
                showContractFilters ? "bg-primary text-white border-primary" : "bg-surface border-border/60 text-text-secondary"
              )}
            >
              <Filter size={20} />
            </button>
          </div>

          {/* Mobile Filters Panel */}
          {showContractFilters && (
            <div className="p-4 mx-4 mt-4 bg-surface border border-border/60 rounded-2xl flex flex-col gap-4 shadow-lg shadow-black/5 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5">Secretaria</label>
                <select 
                  className="w-full p-3 bg-background border border-border/60 rounded-xl outline-none focus:border-primary/50 text-sm font-bold"
                  value={contractFilters.secretariat}
                  onChange={e => setContractFilters({ ...contractFilters, secretariat: e.target.value })}
                >
                  <option value="all">Todas as Secretarias</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Educação">Educação</option>
                  <option value="Obras">Obras</option>
                  <option value="Administração">Administração</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5">Modalidade</label>
                <select 
                  className="w-full p-3 bg-background border border-border/60 rounded-xl outline-none focus:border-primary/50 text-sm font-bold"
                  value={contractFilters.modality}
                  onChange={e => setContractFilters({ ...contractFilters, modality: e.target.value })}
                >
                  <option value="all">Todas as Modalidades</option>
                  <option value="Pregão">Pregão</option>
                  <option value="Dispensa">Dispensa</option>
                  <option value="Inexigibilidade">Inexigibilidade</option>
                  <option value="Concorrência">Concorrência</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5">Início</label>
                  <input 
                    type="date"
                    className="w-full p-3 bg-background border border-border/60 rounded-xl outline-none focus:border-primary/50 text-sm"
                    value={contractFilters.startDate}
                    onChange={e => setContractFilters({ ...contractFilters, startDate: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5">Término</label>
                  <input 
                    type="date"
                    className="w-full p-3 bg-background border border-border/60 rounded-xl outline-none focus:border-primary/50 text-sm"
                    value={contractFilters.endDate}
                    onChange={e => setContractFilters({ ...contractFilters, endDate: e.target.value })}
                  />
                </div>
              </div>
              <button
                onClick={() => setContractFilters({ secretariat: 'all', modality: 'all', category: 'all', startDate: '', endDate: '' })}
                className="w-full py-3 mt-2 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all border border-rose-500/20"
              >
                Limpar Filtros
              </button>
            </div>
          )}

        <div className="w-full overflow-x-auto no-scrollbar px-4 pt-4 pb-2">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setContractFilter('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                    contractFilter === 'all' || !contractFilter ? "bg-primary text-white border-primary" : "bg-surface border-border text-text-secondary"
                  )}
                >
                  Todos <span className="px-1.5 py-0.5 rounded-md bg-primary-foreground/20 text-white ml-1">{contractStats.total}</span>
                </button>
                <button
                  onClick={() => setContractFilter(contractFilter === 'vigente' ? 'all' : 'vigente')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex gap-1.5 items-center",
                    contractFilter === 'vigente' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-surface border-border text-text-secondary"
                  )}
                >
                  Vigente <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600">{contractStats.vigente}</span>
                </button>
                <button
                  onClick={() => setContractFilter(contractFilter === 'vencido' ? 'all' : 'vencido')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex gap-1.5 items-center",
                    contractFilter === 'vencido' ? "bg-rose-500/10 text-rose-500 border-rose-500/30" : "bg-surface border-border text-text-secondary"
                  )}
                >
                  Vencidos <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-600">{contractStats.vencido}</span>
                </button>
                <button
                  onClick={() => setContractFilter(contractFilter === 'vencendo30' ? 'all' : 'vencendo30')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex gap-1.5 items-center",
                    contractFilter === 'vencendo30' ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-surface border-border text-text-secondary"
                  )}
                >
                  30d <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600">{contractStats.vencendo30}</span>
                </button>
                <button
                  onClick={() => setContractFilter(contractFilter === 'vencendo60' ? 'all' : 'vencendo60')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex gap-1.5 items-center",
                    contractFilter === 'vencendo60' ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-surface border-border text-text-secondary"
                  )}
                >
                  60d <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600">{contractStats.vencendo60}</span>
                </button>
                <button
                  onClick={() => setContractFilter(contractFilter === 'aditivado' ? 'all' : 'aditivado')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex gap-1.5 items-center",
                    contractFilter === 'aditivado' ? "bg-blue-500/10 text-blue-500 border-blue-500/30" : "bg-surface border-border text-text-secondary"
                  )}
                >
                  Aditivados <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-600">{contractStats.aditivado}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Feed List */}
          <div className="p-4 space-y-4">
            {paginatedContracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-secondary/40 text-center">
                <FileText size={48} className="mb-3 opacity-20" />
                <p className="text-base font-bold text-text-primary">Nenhum contrato encontrado</p>
                <p className="text-xs text-text-secondary mt-1">Tente ajustar seus filtros ou termos de busca.</p>
              </div>
            ) : (
              paginatedContracts.map((contract) => {
                const statusCfg = getStatusConfig(contract.status);
                const daysRemaining = safeGetDaysRemaining(contract.expiryDate);
                const consumptionValue = parseCurrency(contract.consumption);
                const totalValue = parseCurrency(contract.totalValue);
                const consumptionPercentage = totalValue > 0 ? (consumptionValue / totalValue) * 100 : 0;
                const isHighConsumption = consumptionPercentage > 90;

                return (
                  <div
                    key={`mobile-contract-${contract.id}`}
                    onClick={() => handleEditContract(contract)}
                    className="bg-surface border border-border/80 rounded-[28px] p-5 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden touch-manipulation cursor-pointer"
                  >
                    {/* Status Badge Overlays */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner", statusCfg.avatarBg)}>
                          <FileText className={statusCfg.avatarText} size={22} />
                        </div>
                        <div>
                          <h3 className="text-base font-black tracking-tight leading-tight">{contract.number}</h3>
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-0.5 truncate max-w-[150px]">
                            {contract.vendor}
                          </p>
                        </div>
                      </div>
                      <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", statusCfg.color)}>
                        {statusCfg.text}
                      </div>
                    </div>

                    {/* Object and Modality */}
                    <div className="mb-4">
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 mb-2">
                        {contract.object}
                      </p>
                      {contract.secretariat && (
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-lg">
                          {contract.secretariat}
                        </span>
                      )}
                    </div>

                    {/* Consumption Progress */}
                    {totalValue > 0 && (
                      <div className="bg-surface-hover/50 rounded-2xl p-3.5 border border-border/50 mb-3.5">
                        <div className="flex justify-between items-end mb-1.5">
                           <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Execução Financeira</span>
                           <div className="flex flex-col items-end">
                             <span className={cn("text-xs font-black", isHighConsumption ? "text-rose-500" : "text-primary")}>
                               {consumptionPercentage.toFixed(1)}%
                             </span>
                             <span className="text-[9px] font-bold text-emerald-500 uppercase">Saldo: {formatCurrency(totalValue - consumptionValue)}</span>
                           </div>
                        </div>
                        <div className="w-full h-2 bg-background rounded-full overflow-hidden border border-border/40">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-300", isHighConsumption ? "bg-rose-500" : "bg-primary")}
                            style={{ width: `${Math.min(100, consumptionPercentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <p className="text-[10px] font-bold text-text-secondary">{formatCurrency(parseCurrencyToNumber(contract.consumption))}</p>
                          <p className="text-[10px] font-bold text-text-secondary opacity-40">de {formatCurrency(parseCurrencyToNumber(contract.totalValue))}</p>
                        </div>
                      </div>
                    )}

                    {/* Dates & Actions */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-border/40 mt-1">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Clock size={14} />
                        <span className={cn(
                          "text-[11px] font-bold",
                          daysRemaining < 30 ? "text-rose-500" : "text-text-secondary"
                        )}>
                          Vence: {safeFormatDate(contract.expiryDate)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {canEdit && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEditContract(contract); }}
                            className="w-9 h-9 flex items-center justify-center bg-surface-hover hover:bg-border rounded-xl text-text-primary transition-all active:scale-90 touch-manipulation"
                          >
                            <Settings size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteContract(contract.id); }}
                            className="w-9 h-9 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl transition-all active:scale-90 touch-manipulation"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls for Mobile */}
          <div className="px-4 py-4 border-t border-border/60 print:hidden">
            <PaginationControls
              currentPage={contractsPage}
              totalPages={Math.ceil(filteredContracts.length / contractsPerPage)}
              onPageChange={setContractsPage}
              itemsPerPage={contractsPerPage}
              onItemsPerPageChange={(val) => {
                setContractsPerPage(val);
                setContractsPage(1);
              }}
              totalItems={filteredContracts.length}
              showingItems={paginatedContracts.length}
              label="contratos"
            />
          </div>

          {/* Mobile FAB */}
          {canAdd && (
            <button
              onClick={() => {
                setEditingContract(null);
                setNewContractData({ prefeituraId: currentUser.prefeituraId || '1', number: '', vendor: '', object: '', validity: '', expiryDate: '', consumption: '', totalValue: '', isAditivado: false, status: 'vigente', secretariat: '', modality: '', signatureDate: '', category: '', addendums: [] });
                setShowNewContractModal(true);
              }}
              className="fixed bottom-24 right-5 sm:right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-50 shadow-primary/40 border-2 border-background touch-manipulation active:scale-95 transition-all"
            >
              <Plus size={26} strokeWidth={2.5} />
            </button>
          )}
      </div>

      {/* ── DESKTOP LAYOUT ────────────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Gestão de Contratos</h2>
            <p className="text-text-secondary font-medium">Controle total de licitações, contratos e aditivos municipais.</p>
            {lastSync && <p className="text-[10px] text-emerald-500 font-bold uppercase mt-2 tracking-widest flex items-center gap-1.5">
              <RefreshCw size={12} /> Última sincronização: {lastSync}
            </p>}
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handlePrint} className="px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 btn-surface">
               <Printer size={18} /> Imprimir Geral
            </button>
            {canAdd && (
              <>
                <label className={cn(
                  "px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 btn-surface cursor-pointer",
                  isImporting ? "opacity-50 pointer-events-none" : ""
                )}>
                  {isImporting ? <RefreshCw size={18} className="animate-spin" /> : <FileUp size={18} />}
                  {isImporting ? 'Importando...' : 'Importar Lista'}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.doc,.docx,.pdf,.csv"
                    className="hidden"
                    onChange={handleImportFile}
                    disabled={isImporting}
                  />
                </label>
                <button onClick={() => { setEditingContract(null); setNewContractData({ prefeituraId: currentUser.prefeituraId || '1', number: '', vendor: '', object: '', validity: '', expiryDate: '', consumption: '', totalValue: '', isAditivado: false, status: 'vigente', secretariat: '', modality: '', signatureDate: '', category: '', addendums: [] }); setShowNewContractModal(true); }} className="px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 btn-primary">
                  <Plus size={18} /> Novo Contrato
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 shrink-0">
          <StatCard 
            title="Total de Contratos" 
            value={contractStats.total.toString()} 
            icon={<Database size={24} />} 
            trend={{ value: '100%', isPositive: true }}
            isActive={contractFilter === 'all' || !contractFilter}
            onClick={() => setContractFilter('all')}
          />
          <StatCard 
            title="Em Vigência" 
            value={contractStats.vigente.toString()} 
            icon={<FileText size={24} />} 
            trend={{ value: `${((contractStats.vigente/contractStats.total)*100).toFixed(1)}%`, isPositive: true }}
            isActive={contractFilter === 'vigente'}
            onClick={() => setContractFilter(contractFilter === 'vigente' ? 'all' : 'vigente')}
          />
          <StatCard 
            title="Vencidos" 
            value={contractStats.vencido.toString()} 
            icon={<AlertCircle size={24} />} 
            trend={{ value: `${((contractStats.vencido/contractStats.total)*100).toFixed(1)}%`, isPositive: false }}
            isActive={contractFilter === 'vencido'}
            onClick={() => setContractFilter(contractFilter === 'vencido' ? 'all' : 'vencido')}
          />
          <StatCard 
            title="Vence em 30d" 
            value={contractStats.vencendo30.toString()} 
            icon={<AlertTriangle size={24} />} 
            trend={{ value: `${((contractStats.vencendo30/contractStats.total)*100).toFixed(1)}%`, isPositive: false }}
            isActive={contractFilter === 'vencendo30'}
            onClick={() => setContractFilter(contractFilter === 'vencendo30' ? 'all' : 'vencendo30')}
          />
          <StatCard 
            title="Vence em 60d" 
            value={contractStats.vencendo60.toString()} 
            icon={<Clock size={24} />} 
            trend={{ value: `${((contractStats.vencendo60/contractStats.total)*100).toFixed(1)}%`, isPositive: false }}
            isActive={contractFilter === 'vencendo60'}
            onClick={() => setContractFilter(contractFilter === 'vencendo60' ? 'all' : 'vencendo60')}
          />
          <StatCard 
            title="Aditivados" 
            value={contractStats.aditivado.toString()} 
            icon={<TrendingUp size={24} />} 
            trend={{ value: `${((contractStats.aditivado/contractStats.total)*100).toFixed(1)}%`, isPositive: true }}
            isActive={contractFilter === 'aditivado'}
            onClick={() => setContractFilter(contractFilter === 'aditivado' ? 'all' : 'aditivado')}
          />
        </div>

        <div className="glass-card p-0 overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover/20">
             <div className="relative w-96">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input type="text" placeholder="Pesquisar contrato..." className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2 outline-none focus:border-primary transition-all text-sm font-bold" value={contractSearch} onChange={(e) => setContractSearch(e.target.value)} />
             </div>
             <div className="flex gap-2">
                <button onClick={() => setShowContractFilters(!showContractFilters)} className="px-4 py-2 border border-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-surface-hover transition-all flex items-center gap-2">
                  <Filter size={16} /> Filtros
                </button>
             </div>
          </div>
          
          {/* Desktop Filters Panel */}
          {showContractFilters && (
            <div className="p-6 border-b border-border bg-surface-hover/10 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Secretaria</label>
                <select 
                  className="w-full p-2 bg-surface border border-border rounded-xl outline-none"
                  value={contractFilters.secretariat}
                  onChange={e => setContractFilters({ ...contractFilters, secretariat: e.target.value })}
                >
                  <option value="all">Todas</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Educação">Educação</option>
                  <option value="Obras">Obras</option>
                  <option value="Administração">Administração</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Modalidade</label>
                <select 
                  className="w-full p-2 bg-surface border border-border rounded-xl outline-none"
                  value={contractFilters.modality}
                  onChange={e => setContractFilters({ ...contractFilters, modality: e.target.value })}
                >
                  <option value="all">Todas</option>
                  <option value="Pregão">Pregão</option>
                  <option value="Dispensa">Dispensa</option>
                  <option value="Inexigibilidade">Inexigibilidade</option>
                  <option value="Concorrência">Concorrência</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Início</label>
                <input 
                  type="date"
                  className="w-full p-2 bg-surface border border-border rounded-xl outline-none text-sm"
                  value={contractFilters.startDate}
                  onChange={e => setContractFilters({ ...contractFilters, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Término</label>
                <input 
                  type="date"
                  className="w-full p-2 bg-surface border border-border rounded-xl outline-none text-sm"
                  value={contractFilters.endDate}
                  onChange={e => setContractFilters({ ...contractFilters, endDate: e.target.value })}
                />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button
                  onClick={() => setContractFilters({ secretariat: 'all', modality: 'all', category: 'all', startDate: '', endDate: '' })}
                  className="px-4 py-2 text-text-secondary text-xs font-bold hover:text-primary transition-all uppercase"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          )}
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-hover/50 text-text-secondary text-[10px] font-black uppercase tracking-widest border-b border-border">
                <th className="px-6 py-5">Contrato / Fornecedor</th>
                <th className="px-6 py-5">Objeto Social</th>
                <th className="px-6 py-5">Vigência</th>
                <th className="px-6 py-5">Execução</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedContracts.map((contract, idx) => {
                const statusCfg = getStatusConfig(contract.status);
                const consumptionValue = parseCurrency(contract.consumption);
                const totalValue = parseCurrency(contract.totalValue);
                const consumptionPercentage = totalValue > 0 ? (consumptionValue / totalValue) * 100 : 0;
                
                return (
                  <tr key={`desktop-contract-${contract.id}`} className="hover:bg-surface-hover/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-black">{contract.number}</p>
                        <p className="text-[10px] text-text-secondary font-bold uppercase">{contract.vendor}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-medium text-text-secondary truncate max-w-[250px]">{contract.object}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-bold">{safeFormatDate(contract.expiryDate)}</p>
                        <p className="text-[10px] text-text-secondary uppercase font-bold">{contract.validity}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="w-44 flex flex-col gap-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className={cn(consumptionPercentage > 90 ? "text-rose-500" : "text-primary")}>{consumptionPercentage.toFixed(0)}%</span>
                          <div className="flex flex-col items-end">
                            <span className="text-text-secondary">{formatCurrency(parseCurrencyToNumber(contract.totalValue))}</span>
                            <span className="text-[8px] text-emerald-500 font-bold mt-0.5">Saldo: {formatCurrency(totalValue - consumptionValue)}</span>
                          </div>
                        </div>
                        <div className="w-full h-1 bg-surface-hover rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", consumptionPercentage > 90 ? "bg-rose-500" : "bg-primary")} style={{ width: `${Math.min(100, consumptionPercentage)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest", statusCfg.color)}>
                        {statusCfg.text}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1 transition-opacity">
                        {canEdit && (
                          <button onClick={() => handleEditContract(contract)} className="p-2 hover:bg-primary/10 rounded-xl text-primary transition-all active:scale-95">
                            <Settings size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeleteContract(contract.id)} className="p-2 hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all active:scale-95">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginationControls currentPage={contractsPage} totalPages={Math.ceil(filteredContracts.length / contractsPerPage)} onPageChange={setContractsPage} itemsPerPage={contractsPerPage} onItemsPerPageChange={(val) => { setContractsPerPage(val); setContractsPage(1); }} totalItems={filteredContracts.length} showingItems={paginatedContracts.length} label="contratos" />
        </div>
      </div>
    </div>
  );
};

export default Contratos;
