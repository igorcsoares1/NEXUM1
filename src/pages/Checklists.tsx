import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  CheckSquare, 
  Plus, 
  Search, 
  SlidersHorizontal,
  Settings, 
  Trash2,
  MoreVertical,
  X,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { ChecklistItem } from '../types';
import { PaginationControls } from '../components/ui/PaginationControls';
import { RecibosDigitaisComponent } from '../components/RecibosDigitaisComponent';
import { DEFAULT_CHECKLIST_ITEMS } from '../services/checklists';

interface ChecklistsProps {
  checklistRecords: ChecklistItem[];
  filteredChecklists: ChecklistItem[];
  paginatedChecklists: ChecklistItem[];
  checklistSearch: string;
  setChecklistSearch: (search: string) => void;
  checklistPage: number;
  setChecklistPage: (page: number) => void;
  checklistPerPage: number;
  setChecklistPerPage: (val: number) => void;
  setShowDailyChecklistReport: (show: boolean) => void;
  isChecklistSelectionMode: boolean;
  setIsChecklistSelectionMode: (mode: boolean) => void;
  selectedChecklistIds: string[];
  setSelectedChecklistIds: (ids: string[]) => void;
  canAdd: boolean;
  setShowNewChecklistModal: (show: boolean) => void;
  setSelectedChecklist: (item: ChecklistItem) => void;
  setShowDetailsModal: (show: boolean) => void;
  canEdit: boolean;
  handleEditChecklist: (item: ChecklistItem) => void;
  canDelete: boolean;
  handleDeleteChecklist: (id: string) => void;
  handlePrint: () => void;
  systemSettings: any;
  handleToggleChecklistItem: (checklistId: string, itemId: string) => void;
  setDeleteType: (type: any) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  setEditingChecklist: (item: any) => void;
  setNewChecklistData: (data: any) => void;
  confirmations: any[];
  currentUser: any;
  checklistFilters: {
    status: string;
    vendor: string;
    startDate: string;
    endDate: string;
  };
  setChecklistFilters: (filters: any) => void;
}

const Checklists = ({
  checklistRecords,
  filteredChecklists,
  paginatedChecklists,
  checklistSearch,
  setChecklistSearch,
  checklistFilters,
  setChecklistFilters,
  checklistPage,
  setChecklistPage,
  checklistPerPage,
  setChecklistPerPage,
  setShowDailyChecklistReport,
  isChecklistSelectionMode,
  setIsChecklistSelectionMode,
  selectedChecklistIds,
  setSelectedChecklistIds,
  canAdd,
  setShowNewChecklistModal,
  setSelectedChecklist,
  setShowDetailsModal,
  canEdit,
  handleEditChecklist,
  canDelete,
  handleDeleteChecklist,
  handlePrint,
  systemSettings,
  handleToggleChecklistItem,
  setDeleteType,
  setShowDeleteConfirm,
  setEditingChecklist,
  setNewChecklistData,
  confirmations,
  currentUser
}: ChecklistsProps) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [localFilters, setLocalFilters] = useState(checklistFilters);
  const [selectedConfirmation, setSelectedConfirmation] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'processos' | 'recibos'>('processos');

  const handleApplyFilters = () => {
    setChecklistFilters(localFilters);
    setShowFilterModal(false);
    setChecklistPage(1);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      status: '',
      vendor: '',
      startDate: '',
      endDate: ''
    };
    setLocalFilters(emptyFilters);
    setChecklistFilters(emptyFilters);
    setShowFilterModal(false);
    setChecklistPage(1);
  };

  const getNextProcessNumber = () => {
    if (!checklistRecords || checklistRecords.length === 0) return '';
    
    const numbers = checklistRecords
      .map(r => {
        // Try to find the first sequence of digits
        const match = r.processNumber.match(/(\d+)/);
        return match ? parseInt(match[0], 10) : null;
      })
      .filter((n): n is number => n !== null);

    if (numbers.length === 0) return '';
    
    const maxNum = Math.max(...numbers);
    const nextNum = maxNum + 1;

    // Check if the latest one had a suffix like /2024
    const latestRecord = checklistRecords.find(r => {
      const match = r.processNumber.match(/(\d+)/);
      return match && parseInt(match[0], 10) === maxNum;
    });

    if (latestRecord && latestRecord.processNumber.includes('/')) {
      const suffix = latestRecord.processNumber.split('/')[1];
      return `${nextNum}/${suffix}`;
    }

    return nextNum.toString();
  };

  const statsBaseList = checklistRecords.filter(item => {
    const matchesSearch = 
      item.contractNumber.toLowerCase().includes(checklistSearch.toLowerCase()) ||
      item.processNumber.toLowerCase().includes(checklistSearch.toLowerCase()) ||
      item.vendor.toLowerCase().includes(checklistSearch.toLowerCase()) ||
      item.object.toLowerCase().includes(checklistSearch.toLowerCase());
    
    const matchesVendor = !checklistFilters.vendor || item.vendor.toLowerCase().includes(checklistFilters.vendor.toLowerCase());
    
    let matchesDate = true;
    if (checklistFilters.startDate && checklistFilters.endDate) {
      matchesDate = item.submissionDate >= checklistFilters.startDate && item.submissionDate <= checklistFilters.endDate;
    }

    return matchesSearch && matchesVendor && matchesDate;
  });

  const totalProcessosCount = statsBaseList.length;
  const totalConcluidosCount = statsBaseList.filter(i => i.status === 'concluido').length;
  const totalPendentesCount = statsBaseList.filter(i => i.status === 'pendente').length;
  const totalAndamentoCount = totalProcessosCount - totalConcluidosCount - totalPendentesCount;

  const toggleStatusFilter = (status: string) => {
    setChecklistFilters({
      ...checklistFilters,
      status: checklistFilters.status === status ? '' : status
    });
    setChecklistPage(1);
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'concluido': 
        return { 
          color: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30', 
          text: 'Concluído', 
          dot: 'bg-emerald-500',
          avatarBg: 'bg-emerald-500/10',
          avatarText: 'text-emerald-500'
        };
      case 'pendente': 
        return { 
          color: 'bg-rose-500/15 text-rose-500 border border-rose-500/30', 
          text: 'Pendente', 
          dot: 'bg-rose-500',
          avatarBg: 'bg-rose-500/10',
          avatarText: 'text-rose-500'
        };
      case 'atencao':
        return {
          color: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
          text: 'Atenção / Urgente',
          dot: 'bg-amber-500',
          avatarBg: 'bg-amber-500/10',
          avatarText: 'text-amber-500'
        };
      case 'em_analise':
        return {
          color: 'bg-blue-500/15 text-blue-500 border border-blue-500/30',
          text: 'Em Análise',
          dot: 'bg-blue-500',
          avatarBg: 'bg-blue-500/10',
          avatarText: 'text-blue-500'
        };
      default: 
        return { 
          color: 'bg-slate-500/15 text-slate-500 border border-slate-500/30', 
          text: 'Em Andamento', 
          dot: 'bg-slate-400',
          avatarBg: 'bg-slate-500/10',
          avatarText: 'text-slate-500'
        };
    }
  };

  const getInitials = (processNumber: string) => {
    return processNumber ? processNumber.slice(0, 2).toUpperCase() : 'PR';
  };

  const openDetails = (item: ChecklistItem) => {
    setSelectedChecklist(item);
    setShowDetailsModal(true);
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      
      {/* ── MOBILE LAYOUT ─────────────────────────────────── */}
      <div className="flex flex-col xl:hidden min-h-full bg-background">

        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 pt-4 pb-3 print:hidden">
          
          {/* Title Row */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-black tracking-tight">Checklists</h2>
            <div className="flex items-center gap-2">
              {/* Metrics Badge */}
              <div className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span className="text-xs font-black">{filteredChecklists.length}</span>
              </div>
              {/* 3-dot menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 rounded-full hover:bg-surface-hover transition-colors text-text-secondary active:scale-95"
                >
                  <MoreVertical size={20} />
                </button>
                {showMobileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-border rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col overflow-hidden">
                      <button
                        onClick={() => { setShowDailyChecklistReport(true); setShowMobileMenu(false); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-hover text-sm font-bold text-text-primary transition-colors"
                      >
                        <FileText size={16} className="text-primary" /> Relatório do Dia
                      </button>
                      <button
                        onClick={() => { setIsChecklistSelectionMode(true); setShowMobileMenu(false); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-hover text-sm font-bold text-text-primary transition-colors"
                      >
                        <CheckSquare size={16} className="text-primary" /> Selecionar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar — pill arredondada estilo nativo */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60" />
              <input
                type="text"
                placeholder="Buscar processo ou fornecedor..."
                className="w-full bg-surface-hover border-0 rounded-full pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm font-medium placeholder:text-text-secondary/50"
                value={checklistSearch}
                onChange={(e) => setChecklistSearch(e.target.value)}
              />
              {checklistSearch && (
                <button
                  onClick={() => setChecklistSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-border"
                >
                  <X size={12} className="text-text-secondary" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilterModal(true)}
              className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center shrink-0 text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors active:scale-95"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

          {/* Stats Chips — scroll horizontal */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border/40 print:hidden">
            <button 
              onClick={() => setActiveTab('processos')}
              className={cn(
                "flex items-center gap-1.5 border rounded-full px-3 py-1.5 shrink-0 transition-all",
                activeTab === 'processos' ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-surface border-border text-text-secondary"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">Processos</span>
              <span className="text-xs font-black">{filteredChecklists.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab('recibos')}
              className={cn(
                "flex items-center gap-1.5 border rounded-full px-3 py-1.5 shrink-0 transition-all",
                activeTab === 'recibos' ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-surface border-border text-text-secondary"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">Recibos</span>
              <span className="text-xs font-black">{confirmations.length}</span>
            </button>
            <div className="w-4 shrink-0"></div> {/* Spacer */}
          </div>

          {/* Feed de Posts / Recibos */}
          <div className="flex flex-col flex-1 p-4">
            {activeTab === 'processos' ? (
              paginatedChecklists.length > 0 ? (
                paginatedChecklists.map((item, idx) => {
                  const statusCfg = getStatusConfig(item.status);
                  const initials = getInitials(item.processNumber);

                  return (
                    <div
                      key={`feed-checklist-${item.id}-${idx}`}
                      onClick={() => openDetails(item)}
                      className="w-full text-left border-b border-border/50 last:border-0 px-4 py-4 active:bg-surface-hover/70 transition-colors relative cursor-pointer"
                    >
                      <div className="flex gap-3 items-start">
                        {/* Avatar circle */}
                        <div className={cn(
                          "w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black text-sm border",
                          statusCfg.avatarBg,
                          statusCfg.avatarText,
                          "border-current/20"
                        )}>
                          {initials}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-2">
                          {/* Row 1: Process number + status badge */}
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-base font-black text-text-primary leading-tight truncate">
                              {item.processNumber}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {item.items && item.items.length > 0 && (
                                <span className="text-[9px] font-black bg-surface border border-border px-1.5 py-0.5 rounded text-text-secondary">
                                  {item.items.filter(i => i.checked).length}/{item.items.length}
                                </span>
                              )}
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1",
                                statusCfg.color
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusCfg.dot)}></span>
                                {statusCfg.text}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Vendor */}
                          <p className="text-sm font-semibold text-text-primary truncate leading-snug">
                            {item.vendor || 'Fornecedor não especificado'}
                          </p>

                          {/* Row 3: Contract number */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                            <p className="text-xs text-text-secondary truncate">
                              Contrato: <span className="font-bold text-text-secondary/80">{item.contractNumber}</span>
                            </p>
                            <p className="text-xs text-text-secondary truncate">
                              Nota: <span className="font-bold text-rose-500">{item.invoiceNumber || '-'}</span>
                            </p>
                          </div>

                          {/* Row 4: Action bar */}
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs font-black text-primary flex items-center gap-1">
                              Ver detalhes <ChevronRight size={12} />
                            </span>
                            {(canEdit || canDelete) && (
                              <div className="flex gap-2 ml-auto" onClick={e => e.stopPropagation()}>
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditChecklist(item)}
                                    className="p-1.5 rounded-full hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                                    title="Editar"
                                  >
                                    <Settings size={14} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteChecklist(item.id)}
                                    className="p-1.5 rounded-full hover:bg-rose-500/10 text-text-secondary hover:text-rose-500 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-24 px-8 text-center text-text-secondary">
                  <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center">
                    <Search size={28} className="opacity-40" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-text-primary">Nenhum processo encontrado</p>
                    <p className="text-sm mt-1 text-text-secondary/70">Tente ajustar seus filtros ou busca.</p>
                  </div>
                </div>
              )
            ) : (
              <RecibosDigitaisComponent currentUser={currentUser} />
            )}
          </div>

        {/* Pagination */}
        <div className="px-4 py-4 border-t border-border/60 print:hidden">
          <PaginationControls
            currentPage={checklistPage}
            totalPages={Math.ceil(filteredChecklists.length / checklistPerPage)}
            onPageChange={setChecklistPage}
            itemsPerPage={checklistPerPage}
            onItemsPerPageChange={(val) => {
              setChecklistPerPage(val);
              setChecklistPage(1);
            }}
            totalItems={filteredChecklists.length}
            showingItems={paginatedChecklists.length}
            label="processos"
          />
        </div>

        {/* FAB — Floating Action Button */}
        {canAdd && (
          <button
            onClick={() => {
              const nextProcess = getNextProcessNumber();
              setEditingChecklist(null);
              setNewChecklistData({
                prefeituraId: currentUser.prefeituraId || '1',
                processNumber: nextProcess,
                contractNumber: '',
                vendor: '',
                object: '',
                value: '',
                invoiceValue: '',
                invoiceNumber: '',
                submissionDate: new Date().toISOString().split('T')[0],
                status: 'em_analise',
                items: DEFAULT_CHECKLIST_ITEMS.map(item => ({ ...item, id: crypto.randomUUID() }))
              });
              setShowNewChecklistModal(true);
            }}
            className="fixed bottom-6 right-5 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all animate-pulse-slow"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── DESKTOP LAYOUT ────────────────────────────────── */}
      <div className="hidden xl:flex flex-col gap-6 p-8 flex-1 overflow-y-auto">

        {/* Desktop Header */}
        <div className="flex justify-between items-center gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold">Checklists de Processos</h2>
            <p className="text-sm text-text-secondary mt-0.5">Acompanhamento de conformidade e etapas de processos de pagamento.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDailyChecklistReport(true)}
              className="px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm btn-surface"
            >
              <FileText size={18} /> Relatório do Dia
            </button>
            <button
              onClick={() => setIsChecklistSelectionMode(true)}
              className="px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm btn-surface"
            >
              <CheckSquare size={18} /> Selecionar
            </button>
            {canAdd && (
              <button
                onClick={() => {
                  const nextProcess = getNextProcessNumber();
                  setEditingChecklist(null);
                  setNewChecklistData({
                    prefeituraId: currentUser.prefeituraId || '1',
                    processNumber: nextProcess,
                    contractNumber: '',
                    vendor: '',
                    object: '',
                    value: '',
                    invoiceValue: '',
                    invoiceNumber: '',
                    submissionDate: new Date().toISOString().split('T')[0],
                    status: 'em_analise',
                    items: DEFAULT_CHECKLIST_ITEMS.map(item => ({ ...item, id: crypto.randomUUID() }))
                   });
                  setShowNewChecklistModal(true);
                }}
                className="px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm btn-primary"
              >
                <Plus size={18} /> Novo Processo
              </button>
            )}
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="flex items-center gap-4 border-b border-border/60 pb-1">
          <button
            onClick={() => setActiveTab('processos')}
            className={cn(
              "px-4 py-2 text-sm font-black uppercase tracking-widest transition-all relative",
              activeTab === 'processos' ? "text-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            Processos
            {activeTab === 'processos' && (
              <motion.div layoutId="activeTabDesktop" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('recibos')}
            className={cn(
              "px-4 py-2 text-sm font-black uppercase tracking-widest transition-all relative",
              activeTab === 'recibos' ? "text-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            Recibos Digitais
            {activeTab === 'recibos' && (
              <motion.div layoutId="activeTabDesktop" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        {/* Desktop Stats */}
        <div className="grid grid-cols-4 gap-4 print:hidden">
          <div 
            onClick={() => toggleStatusFilter('')}
            className={cn(
              "bg-surface border rounded-xl p-4 cursor-pointer transition-all hover:border-primary/50 active:scale-[0.98]",
              !checklistFilters.status ? "border-primary ring-1 ring-primary/20 shadow-lg" : "border-border"
            )}
          >
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-black mb-1">Total</p>
            <p className="text-2xl font-black">{totalProcessosCount}</p>
          </div>
          <div 
            onClick={() => toggleStatusFilter('concluido')}
            className={cn(
              "border rounded-xl p-4 cursor-pointer transition-all hover:border-emerald-500/50 active:scale-[0.98]",
              checklistFilters.status === 'concluido' ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/20 shadow-lg" : "bg-emerald-500/5 border-emerald-500/20"
            )}
          >
            <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-black mb-1">Concluídos</p>
            <p className="text-2xl font-black text-emerald-500">{totalConcluidosCount}</p>
          </div>
          <div 
            onClick={() => toggleStatusFilter('andamento')}
            className={cn(
              "border rounded-xl p-4 cursor-pointer transition-all hover:border-amber-500/50 active:scale-[0.98]",
              checklistFilters.status === 'andamento' ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/20 shadow-lg" : "bg-amber-500/5 border-amber-500/20"
            )}
          >
            <p className="text-[10px] text-amber-500 uppercase tracking-widest font-black mb-1">Andamento</p>
            <p className="text-2xl font-black text-amber-500">{totalAndamentoCount}</p>
          </div>
          <div 
            onClick={() => toggleStatusFilter('pendente')}
            className={cn(
              "border rounded-xl p-4 cursor-pointer transition-all hover:border-rose-500/50 active:scale-[0.98]",
              checklistFilters.status === 'pendente' ? "bg-rose-500/10 border-rose-500 ring-1 ring-rose-500/20 shadow-lg" : "bg-rose-500/5 border-rose-500/20"
            )}
          >
            <p className="text-[10px] text-rose-500 uppercase tracking-widest font-black mb-1">Pendentes</p>
            <p className="text-2xl font-black text-rose-500">{totalPendentesCount}</p>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          {activeTab === 'processos' ? (
            <>
              {/* Desktop Search */}
              <div className="flex items-center gap-3 mb-6 print:hidden">
                <div className="relative flex-1">
                  <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Buscar contrato ou processo..."
                    className="w-full bg-surface-hover border border-border rounded-xl pl-11 pr-4 py-3 outline-none focus:border-primary transition-all text-sm font-medium"
                    value={checklistSearch}
                    onChange={(e) => setChecklistSearch(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="px-5 py-3 border border-border rounded-xl hover:bg-surface-hover text-text-primary flex items-center gap-2 font-bold text-sm bg-surface"
                >
                  <SlidersHorizontal size={18} /> Filtros
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="w-full">
                  {/* Desktop Table */}
                  <div className="overflow-x-auto border border-border/60 rounded-2xl bg-surface/30 shadow-inner no-scrollbar">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-[1000px] w-full text-left border-collapse">
                        <thead>
                          <tr className="text-text-secondary text-[10px] font-black uppercase tracking-[0.15em] border-b border-border/60 bg-surface/50">
                            <th className="px-6 py-5">Nº Processo</th>
                            <th className="px-4 py-5">Contrato</th>
                            <th className="px-4 py-5">Fornecedor</th>
                            <th className="px-4 py-5">Nota</th>
                            <th className="px-4 py-5 max-w-[200px]">Objeto</th>
                            <th className="px-4 py-5">Valor</th>
                            <th className="px-4 py-5">Data</th>
                            <th className="px-4 py-5">Status</th>
                            <th className="px-6 py-5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {paginatedChecklists.length > 0 ? (
                            paginatedChecklists.map((item, idx) => {
                              const statusCfg = getStatusConfig(item.status);
                              return (
                                <tr key={`desktop-checklist-${item.id}-${idx}`} className="hover:bg-primary/5 transition-all group">
                                  <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0 group-hover:scale-110 transition-transform">
                                        <FileText size={18} />
                                      </div>
                                      <p className="text-sm font-black tracking-tight whitespace-nowrap">{item.processNumber}</p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-5">
                                    <p className="text-xs font-bold text-text-primary whitespace-nowrap">{item.contractNumber}</p>
                                  </td>
                                  <td className="px-4 py-5">
                                    <p className="text-xs font-black text-text-primary truncate max-w-[150px]" title={item.vendor}>{item.vendor}</p>
                                  </td>
                                  <td className="px-4 py-5">
                                    <p className="text-xs font-bold text-rose-500 whitespace-nowrap">{item.invoiceNumber || '-'}</p>
                                  </td>
                                  <td className="px-4 py-5">
                                    <p className="text-[11px] text-text-secondary font-medium max-w-[180px] truncate leading-relaxed" title={item.object}>{item.object}</p>
                                  </td>
                                  <td className="px-4 py-5">
                                    <div className="flex flex-col gap-0.5">
                                      <p className="text-xs font-black text-text-primary">{item.value}</p>
                                      {item.invoiceValue && (
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Nota: {item.invoiceValue.startsWith('R$') ? item.invoiceValue : `R$ ${item.invoiceValue}`}</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-5">
                                    <p className="text-[11px] text-text-secondary font-bold whitespace-nowrap">
                                      {format(parseISO(item.submissionDate), 'dd/MM/yy', { locale: ptBR })}
                                    </p>
                                  </td>
                                  <td className="px-4 py-5">
                                    <span className={cn(
                                      "text-[9px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1.5 w-fit shadow-sm",
                                      statusCfg.color
                                    )}>
                                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", statusCfg.dot)}></span>
                                      {statusCfg.text}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5 text-right">
                                    <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => openDetails(item)}
                                        className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                        title="Detalhes"
                                      >
                                        <Search size={14} />
                                      </button>
                                      {canEdit && (
                                        <button 
                                          onClick={() => handleEditChecklist(item)} 
                                          className="p-2 bg-surface-hover border border-border rounded-xl text-text-secondary hover:text-primary hover:border-primary/40 transition-all shadow-sm" 
                                          title="Editar"
                                        >
                                          <Settings size={14} />
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button 
                                          onClick={() => handleDeleteChecklist(item.id)} 
                                          className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm" 
                                          title="Excluir"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={9} className="px-4 py-20 text-center">
                                <div className="flex flex-col items-center justify-center gap-2 opacity-30">
                                  <FileText size={48} />
                                  <p className="text-xs font-black uppercase tracking-widest">Nenhum processo</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <PaginationControls
                    currentPage={checklistPage}
                    totalPages={Math.ceil(filteredChecklists.length / checklistPerPage)}
                    onPageChange={setChecklistPage}
                    itemsPerPage={checklistPerPage}
                    onItemsPerPageChange={(val) => {
                      setChecklistPerPage(val);
                      setChecklistPage(1);
                    }}
                    totalItems={filteredChecklists.length}
                    showingItems={paginatedChecklists.length}
                    label="registros"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="p-4">
              <RecibosDigitaisComponent currentUser={currentUser} />
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Details Modal */}
      <AnimatePresence>
        {selectedConfirmation && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedConfirmation(null)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-background w-full max-w-lg relative z-10 rounded-[32px] overflow-hidden shadow-2xl border border-border"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-surface-hover/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <CheckSquare size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Recibo de Recebimento</h3>
                    <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest">Protocolo Digital</p>
                  </div>
                </div>
                <button onClick={() => setSelectedConfirmation(null)} className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary"><X size={20} /></button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Confirmado por</p>
                    <p className="text-sm font-bold text-text-primary">{selectedConfirmation.nome_confirmante}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Data e Hora</p>
                    <p className="text-sm font-bold text-text-primary">
                      {format(new Date(selectedConfirmation.data_confirmacao), "dd/MM/yyyy 'às' HH:mm:ss")}
                    </p>
                  </div>
                </div>

                {selectedConfirmation.checklist && (
                  <div className="space-y-4">
                    <div className="p-4 bg-surface-hover/40 border border-border rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-3">Informações do Processo</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-[10px] text-text-secondary font-medium">Nº Processo</p>
                          <p className="text-sm font-black text-primary">{selectedConfirmation.checklist.processNumber}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-secondary font-medium">Nº Contrato</p>
                          <p className="text-sm font-black text-text-primary">{selectedConfirmation.checklist.contractNumber}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[10px] text-text-secondary font-medium">Fornecedor</p>
                          <p className="text-sm font-bold text-text-primary">{selectedConfirmation.checklist.vendor}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Documentos / Etapas do Processo</p>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedConfirmation.checklist.items?.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-surface border border-border/50 rounded-xl">
                            <span className="text-xs font-bold text-text-primary">{item.label}</span>
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center border-2",
                              item.checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-border text-transparent"
                            )}>
                              <CheckSquare size={12} strokeWidth={3} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border bg-surface-hover/30 flex justify-end">
                <button 
                  onClick={() => setSelectedConfirmation(null)}
                  className="px-6 py-3 bg-text-primary text-background rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:opacity-90 active:scale-95"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FILTER MODAL ──────────────────────────────────── */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
          <div className="glass-card max-w-sm w-full p-6 space-y-6 rounded-t-3xl sm:rounded-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black flex items-center gap-2">
                <SlidersHorizontal size={20} className="text-primary" />
                Filtros
              </h3>
              <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Situação</label>
                <select 
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 outline-none focus:border-primary text-sm font-bold appearance-none"
                  value={localFilters.status}
                  onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
                >
                  <option value="">Todos os status</option>
                  <option value="concluido">Concluído</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="pendente">Pendente</option>
                  <option value="atencao">Atenção</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Fornecedor</label>
                <input 
                  type="text" 
                  placeholder="Digite o nome..." 
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 outline-none focus:border-primary text-sm font-bold"
                  value={localFilters.vendor}
                  onChange={(e) => setLocalFilters({ ...localFilters, vendor: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClearFilters}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-surface-hover text-text-primary text-sm border border-border hover:bg-border"
              >
                Limpar
              </button>
              <button
                onClick={handleApplyFilters}
                className="flex-[2] py-3 px-4 rounded-xl font-bold bg-primary text-white text-sm hover:opacity-90 shadow-lg shadow-primary/20"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checklists;
