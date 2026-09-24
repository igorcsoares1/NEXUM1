import React from 'react';
import { 
  Printer, 
  CheckSquare, 
  Trash2, 
  Plus, 
  Calendar, 
  Clock, 
  LayoutDashboard, 
  Search, 
  Filter, 
  UserCircle, 
  Paperclip, 
  Check, 
  X, 
  Settings, 
  Database,
  Users,
  RefreshCw,
  TrendingUp,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { DailyRecord, User, Servidor } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { PrintHeader } from '../components/ui/PrintHeader';
import Servidores from './Servidores';
import { syncServidoresFromDiarias } from '../services/daily';
import { PaginationControls } from '../components/ui/PaginationControls';
import { formatCurrency, parseCurrencyToNumber, safeFormatDate } from '../utils/format';

interface DiariasProps {
  currentUser: User;
  isAdmin: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dailyRecords: DailyRecord[];
  filteredDailyRecords: DailyRecord[];
  paginatedDailyRecords: DailyRecord[];
  handlePrint: () => void;
  isDailySelectionMode: boolean;
  setIsDailySelectionMode: (mode: boolean) => void;
  selectedDailyIds: string[];
  setSelectedDailyIds: (ids: string[]) => void;
  setDeleteType: (type: any) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  canAdd: boolean;
  setEditingDaily: (record: DailyRecord | null) => void;
  setNewDailyData: (data: any) => void;
  setShowNewDailyModal: (show: boolean) => void;
  canEdit: boolean;
  canDelete: boolean;
  handleEditDaily: (record: DailyRecord) => void;
  handleDeleteDaily: (id: string) => void;
  handleApproveDaily: (record: DailyRecord) => void;
  handleRejectDaily: (record: DailyRecord) => void;
  servidorStats: any[];
  servidores: Servidor[];
  dailyPage: number;
  setDailyPage: (page: number) => void;
  dailyPerPage: number;
  setDailyPerPage: (perPage: number) => void;
  handleEditServidor: (servidor: Servidor) => void;
  handleDeleteServidor: (id: string) => void;
  setShowNewServidorModal: (show: boolean) => void;
  setEditingServidor: (servidor: Servidor | null) => void;
  setNewServidorData: (data: any) => void;
  addNotification: (title: string, message: string, type: any) => void;
  setShowDailyDiariaReport: (show: boolean) => void;
}

const Diarias = ({
  currentUser,
  isAdmin,
  searchQuery,
  setSearchQuery,
  dailyRecords,
  filteredDailyRecords,
  paginatedDailyRecords,
  handlePrint,
  isDailySelectionMode,
  setIsDailySelectionMode,
  selectedDailyIds,
  setSelectedDailyIds,
  setDeleteType,
  setShowDeleteConfirm,
  canAdd,
  setEditingDaily,
  setNewDailyData,
  setShowNewDailyModal,
  canEdit,
  canDelete,
  handleEditDaily,
  handleDeleteDaily,
  handleApproveDaily,
  handleRejectDaily,
  servidorStats,
  servidores,
  dailyPage,
  setDailyPage,
  dailyPerPage,
  setDailyPerPage,
  handleEditServidor,
  handleDeleteServidor,
  setShowNewServidorModal,
  setEditingServidor,
  setNewServidorData,
  addNotification,
  setShowDailyDiariaReport
}: DiariasProps) => {
  const [viewMode, setViewMode] = React.useState<'list' | 'servidores'>('list');
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncServidoresFromDiarias(
        currentUser,
        servidores,
        dailyRecords || [],
        addNotification
      );
    } finally {
      setIsSyncing(false);
    }
  };

  if (viewMode === 'servidores') {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 sm:p-8 border-b border-border bg-surface flex justify-between items-center">
          <button 
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] hover:translate-x-[-4px] transition-transform"
          >
            <X size={16} className="rotate-45" /> {/* Placeholder for a back arrow if available, or just X */}
            Voltar para Diárias
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
            <Database size={12} />
            <span className="text-[9px] font-black uppercase tracking-widest">Base Municipal</span>
          </div>
        </div>
        <Servidores 
          currentUser={currentUser}
          isAdmin={isAdmin}
          handlePrint={handlePrint}
          servidores={servidores}
          handleEditServidor={handleEditServidor}
          handleDeleteServidor={handleDeleteServidor}
          setShowNewServidorModal={setShowNewServidorModal}
          setEditingServidor={setEditingServidor}
          setNewServidorData={setNewServidorData}
          dailyRecords={dailyRecords}
          addNotification={addNotification}
        />
      </div>
    );
  }

  const totalMonthlyValue = filteredDailyRecords.reduce((acc, r) => {
    const val = parseCurrencyToNumber(r.value);
    return acc + val;
  }, 0);

  const pendingRequests = filteredDailyRecords.filter(r => r.status === 'pendente').length;

  const getStatusConfig = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'concluido':
      case 'aprovado':
        return { 
          color: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30', 
          text: 'Aprovado', 
          dot: 'bg-emerald-500',
          avatarBg: 'bg-emerald-500/10',
          avatarText: 'text-emerald-500'
        };
      case 'pendente': 
        return { 
          color: 'bg-amber-500/15 text-amber-500 border border-amber-500/30', 
          text: 'Pendente', 
          dot: 'bg-amber-500',
          avatarBg: 'bg-amber-500/10',
          avatarText: 'text-amber-500'
        };
      case 'atencao':
      case 'rejeitado':
        return { 
          color: 'bg-rose-500/15 text-rose-500 border border-rose-500/30', 
          text: 'Rejeitado', 
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

  return (
    <div className="flex flex-col flex-1" id="daily-content">
      <PrintHeader title="Controle de Diárias" />

      {/* ── MOBILE LAYOUT ─────────────────────────────────── */}
      <div className="flex flex-col lg:hidden min-h-full bg-background pb-20">
        
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 pt-4 pb-3 print:hidden">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-black tracking-tight">Diárias de Viagem</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-black">{filteredDailyRecords.length}</span>
              </div>
              <button 
                onClick={handlePrint}
                className="p-2 rounded-full hover:bg-surface-hover text-text-secondary active:scale-95 transition-colors"
                title="Imprimir"
              >
                <Printer size={20} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60" />
            <input 
              type="text" 
              placeholder="Buscar motorista, destino ou finalidade..."
              className="w-full bg-surface border border-border/60 rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Metric Chips - Horizontal Scroll */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-widest">Total: {formatCurrency(totalMonthlyValue)}</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full px-4 py-1.5 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-widest">{pendingRequests} Pendentes</span>
            </div>
            <div className="flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-1.5 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Base: {servidores.length} Servidores</span>
            </div>
          </div>
        </div>

        {/* Feed List */}
        <div className="p-4 space-y-4">
          {paginatedDailyRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary/40">
              <div className="w-20 h-20 rounded-full bg-surface border border-border border-dashed flex items-center justify-center mb-4">
                <Calendar size={32} />
              </div>
              <p className="font-bold">Nenhuma diária encontrada</p>
              <p className="text-xs">Tente ajustar seus filtros de busca</p>
            </div>
          ) : (
            paginatedDailyRecords.map((record) => {
              const statusCfg = getStatusConfig(record.status);
              return (
                <div
                  key={`mobile-daily-${record.id}`}
                  onClick={() => handleEditDaily(record)}
                  className={cn(
                    "relative group bg-surface border border-border/80 rounded-[28px] p-5 shadow-sm active:scale-[0.98] transition-all touch-manipulation cursor-pointer",
                    selectedDailyIds.includes(record.id) && "ring-2 ring-primary border-primary/20 bg-primary/5"
                  )}
                >
                  {/* Card Header: Destiny & Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", statusCfg.avatarBg)}>
                        <Calendar className={statusCfg.avatarText} size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-black tracking-tight leading-tight">{record.destination}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", statusCfg.dot)}></span>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Viagem Municipal</span>
                        </div>
                      </div>
                    </div>
                    <div className={cn("px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors", statusCfg.color)}>
                      {statusCfg.text}
                    </div>
                  </div>

                  {/* Card Content: Details */}
                  <div className="space-y-3.5 mb-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                          <UserCircle size={16} />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-black tracking-wider opacity-50">BENEFICIÁRIO</p>
                          <p className="text-xs font-bold leading-none">{record.beneficiary ?? record.driver}</p>
                          {(() => {
                            const servant = servidores.find(s => 
                              s.id === record.servidorId || 
                              (s.name && (record.beneficiary ?? record.driver) && s.name.trim().toLowerCase() === (record.beneficiary ?? record.driver).trim().toLowerCase())
                            );
                            const reg = record.registrationNumber || servant?.registrationNumber;
                            return reg ? (
                              <p className="text-[8px] font-black tracking-widest text-text-secondary opacity-60 mt-0.5">
                                MAT: {reg}
                              </p>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      {record.purpose && (
                        <div className="flex-1 ml-4 border-l border-border/50 pl-3">
                          <p className="text-[9px] uppercase font-black tracking-wider opacity-50 text-text-secondary">Finalidade</p>
                          <p className="text-[11px] font-medium leading-tight text-text-secondary line-clamp-2 italic">"{record.purpose}"</p>
                        </div>
                      )}
                      <div className="text-right shrink-0">
                        <p className="text-[9px] uppercase font-black tracking-wider opacity-50 text-text-secondary">Valor</p>
                        <p className="text-sm font-black text-primary leading-none">{formatCurrency(parseCurrencyToNumber(record.value))}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 py-3 px-4 bg-surface-hover/50 rounded-2xl border border-border/50">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-text-secondary" />
                        <span className="text-xs font-bold">{safeFormatDate(record.date)}</span>
                      </div>
                      <div className="w-px h-3 bg-border/60"></div>
                      <div className="text-[10px] font-bold text-text-secondary truncate">
                        ID: {record.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    {record.status === 'pendente' && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleApproveDaily(record); }}
                          className="flex-1 bg-emerald-500/10 text-emerald-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-emerald-500/20 touch-manipulation"
                        >
                          <Check size={14} />
                          Aprovar
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRejectDaily(record); }}
                          className="flex-1 bg-rose-500/10 text-rose-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-rose-500/20 touch-manipulation"
                        >
                          <X size={14} />
                          Rejeitar
                        </button>
                      </>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/diaria/${record.id}`;
                        navigator.clipboard.writeText(url);
                        addNotification("Sucesso", "Link público da diária copiado!", "success");
                      }}
                      className="flex-1 bg-primary/10 text-primary py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-primary/20 touch-manipulation"
                    >
                      <LinkIcon size={14} />
                      Link
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDaily(record);
                      }}
                      className="flex-1 bg-surface-hover hover:bg-border text-text-primary py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-border/60 touch-manipulation"
                    >
                      <Settings size={14} />
                      {record.status === 'pendente' ? 'Ver' : 'Detalhes'}
                    </button>
                    {canDelete && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDaily(record.id);
                        }}
                        className="w-12 h-12 flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl active:scale-95 transition-all touch-manipulation"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  {/* Selection Overlay */}
                  {isDailySelectionMode && (
                    <div 
                      className="absolute inset-0 z-10 rounded-[28px] cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedDailyIds.includes(record.id)) {
                          setSelectedDailyIds(selectedDailyIds.filter(id => id !== record.id));
                        } else {
                          setSelectedDailyIds([...selectedDailyIds, record.id]);
                        }
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Mobile Pagination */}
        <div className="px-4 py-4 border-t border-border/60 print:hidden">
          <PaginationControls
            currentPage={dailyPage}
            totalPages={Math.ceil(filteredDailyRecords.length / dailyPerPage)}
            onPageChange={setDailyPage}
            itemsPerPage={dailyPerPage}
            onItemsPerPageChange={(val) => {
              setDailyPerPage(val);
              setDailyPage(1);
            }}
            totalItems={filteredDailyRecords.length}
            showingItems={paginatedDailyRecords.length}
            label="diárias"
          />
        </div>

        {/* Floating Action Button (FAB) */}
        {canAdd && (
          <button
            onClick={() => {
              setEditingDaily(null);
              setNewDailyData({
                prefeituraId: currentUser.prefeituraId || '1',
                beneficiary: '',
                registrationNumber: '',
                destination: '',
                departureDate: new Date().toISOString().split('T')[0],
                returnDate: '',
                purpose: '',
                value: '',
                status: 'pendente'
              });
              setShowNewDailyModal(true);
            }}
            className="fixed bottom-24 right-5 sm:right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-50 shadow-primary/40 border-2 border-background touch-manipulation active:scale-95 transition-all"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── DESKTOP LAYOUT ────────────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Controle de Diárias</h2>
            <p className="text-text-secondary font-medium">Gestão de solicitações, pagamentos e prestação de contas.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowDailyDiariaReport(true)}
              className="px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
            >
              <Calendar size={18} />
              Relatório Diário / Link
            </button>
            <button 
              onClick={handlePrint}
              className="px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 btn-surface"
            >
              <Printer size={18} />
              Imprimir Geral
            </button>
            {canAdd && (
              <button 
                onClick={() => {
                  setEditingDaily(null);
                    setNewDailyData({
                      prefeituraId: currentUser.prefeituraId || '1',
                      beneficiary: '',
                      registrationNumber: '',
                      destination: '',
                      departureDate: new Date().toISOString().split('T')[0],
                      returnDate: '',
                      purpose: '',
                      value: '',
                      status: 'pendente'
                    });
                  setShowNewDailyModal(true);
                }}
                className="px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 btn-primary"
              >
                <Plus size={18} />
                Nova Solicitação
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total em Diárias" value={`R$ ${totalMonthlyValue.toLocaleString('pt-BR')}`} icon={<Calendar size={24} />} trend={{ value: '+12.5%', isPositive: true }} />
          <StatCard title="Pendências" value={pendingRequests.toString()} icon={<Clock size={24} />} trend={{ value: '-5.2%', isPositive: false }} />
          <StatCard title="Viagens Concluídas" value={filteredDailyRecords.filter(r => r.status === 'concluido').length.toString()} icon={<CheckSquare size={24} />} trend={{ value: '+8.1%', isPositive: true }} />
          <StatCard title="Base de Servidores" value={servidores.length.toString()} icon={<Users size={24} />} trend={{ value: 'Sincronizado', isPositive: true }} />
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-surface border border-border rounded-3xl p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[300px]">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input 
              type="text" 
              placeholder="Pesquisar por motorista, destino, finalidade ou data..."
              className="w-full bg-surface-hover border border-border rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-primary transition-all font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="px-5 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 btn-surface">
            <Filter size={18} />
            Filtros Avançados
          </button>
        </div>

        <div className="glass-card p-0 overflow-hidden flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-hover/50 text-text-secondary text-[10px] font-black uppercase tracking-widest border-b border-border">
                <th className="px-6 py-5">Motorista / Servidor</th>
                <th className="px-6 py-5">Matrícula</th>
                <th className="px-6 py-5">Destino</th>
                <th className="px-6 py-5 max-w-[200px]">Finalidade</th>
                <th className="px-6 py-5">Data Prevista</th>
                <th className="px-6 py-5">Valor</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedDailyRecords.map((record, idx) => {
                const statusCfg = getStatusConfig(record.status);
                return (
                  <tr key={`desktop-daily-${record.id}`} className="hover:bg-surface-hover/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black", statusCfg.avatarBg, statusCfg.avatarText)}>
                          {(record.beneficiary ?? record.driver)?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black">{record.beneficiary ?? record.driver}</p>
                          {servidores.some(s => s.id === record.servidorId || (s.name && (record.beneficiary ?? record.driver) && s.name.trim().toLowerCase() === (record.beneficiary ?? record.driver).trim().toLowerCase())) ? (
                            <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1 mt-0.5">
                              <Database size={8} /> Base Municipal
                            </span>
                          ) : (
                            <span className="text-[9px] text-text-secondary opacity-40 font-black uppercase tracking-widest flex items-center gap-1 mt-0.5">
                              Avulso
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">
                        {record.registrationNumber || servidores.find(s => 
                          s.id === record.servidorId || 
                          (s.name && (record.beneficiary ?? record.driver) && s.name.trim().toLowerCase() === (record.beneficiary ?? record.driver).trim().toLowerCase())
                        )?.registrationNumber || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-text-secondary">{record.destination}</td>
                    <td className="px-6 py-5">
                      <p className="text-xs text-text-secondary line-clamp-2 max-w-[200px] italic font-medium">
                        {record.purpose ? `"${record.purpose}"` : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-text-secondary">{safeFormatDate(record.date)}</td>
                    <td className="px-6 py-5 text-sm font-black text-primary">{formatCurrency(parseCurrencyToNumber(record.value))}</td>
                    <td className="px-6 py-5">
                      <span className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest", statusCfg.color)}>
                        {statusCfg.text}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {record.status === 'pendente' && (
                          <>
                            <button 
                              onClick={() => handleApproveDaily(record)}
                              title="Aprovar"
                              className="p-2 hover:bg-emerald-500/10 rounded-xl text-emerald-500 transition-all active:scale-95"
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              onClick={() => handleRejectDaily(record)}
                              title="Rejeitar"
                              className="p-2 hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all active:scale-95"
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => {
                            const url = `${window.location.origin}/diaria/${record.id}`;
                            navigator.clipboard.writeText(url);
                            addNotification("Sucesso", "Link público da diária copiado!", "success");
                          }}
                          title="Copiar Link Público"
                          className="p-2 hover:bg-primary/10 rounded-xl text-primary transition-all active:scale-95"
                        >
                          <LinkIcon size={18} />
                        </button>
                        <button 
                          onClick={() => handleEditDaily(record)}
                          className="p-2 hover:bg-primary/10 rounded-xl text-primary transition-all active:scale-95"
                        >
                          <Settings size={18} />
                        </button>
                        {canDelete && (
                          <button 
                            onClick={() => handleDeleteDaily(record.id)}
                            title="Excluir Diária"
                            className="p-2 hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all active:scale-95"
                          >
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
          <PaginationControls
            currentPage={dailyPage}
            totalPages={Math.ceil(filteredDailyRecords.length / dailyPerPage)}
            onPageChange={setDailyPage}
            itemsPerPage={dailyPerPage}
            onItemsPerPageChange={(val) => {
              setDailyPerPage(val);
              setDailyPage(1);
            }}
            totalItems={filteredDailyRecords.length}
            showingItems={paginatedDailyRecords.length}
            label="diárias"
          />
        </div>

        {/* Ranking & Servidores (Desktop Only) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          <div className="glass-card">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <Users size={24} className="text-primary" />
              Ranking de Atividade
            </h3>
            <div className="space-y-4">
              {servidorStats.slice(0, 5).map((stat, idx) => (
                <div key={`rank-${idx}`} className="flex items-center justify-between p-4 bg-surface-hover/50 rounded-2xl border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black">{stat.name}</p>
                        {stat.registrationNumber && (
                          <span className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            Mat: {stat.registrationNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest">{stat.count} Viagens Realizadas</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-primary">{formatCurrency(stat.total)}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="glass-card">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <Database size={24} className="text-amber-500" />
              Sincronização de Dados
            </h3>
            <div className="p-8 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center gap-4 hover:bg-surface-hover/50 transition-colors">
              <RefreshCw size={48} className={cn("text-text-secondary/20", isSyncing && "animate-spin")} />
              <div>
                <p className="font-black text-sm uppercase tracking-widest text-amber-500">Base Municipal ({servidores.length} Servidores)</p>
                <p className="text-xs font-medium text-text-secondary mt-1">Sincronize automaticamente os nomes e matrículas para evitar erros.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
                <button 
                  onClick={() => setViewMode('servidores')}
                  className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest btn-surface"
                >
                  Ver Servidores
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Diarias;
