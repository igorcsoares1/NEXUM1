import React from 'react';
import {
  X,
  Save,
  Trash2,
  AlertTriangle, 
  Printer, 
  FileText, 
  CheckSquare, 
  Calendar, 
  UserCircle, 
  Fuel, 
  Search, 
  Filter, 
  Settings, 
  Plus, 
  Info, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Briefcase, 
  ChevronRight,
  AlertCircle,
  ClipboardCheck,
  Users,
  Check,
  RefreshCw,
  Database,
  Share2,
  ExternalLink,
  Copy,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Contract, FuelRecord, DailyRecord, ChecklistItem, User, SystemSettings, Servidor, ChecklistConfirmation } from '../types';
import { DEFAULT_CHECKLIST_DOCUMENTS } from '../constants';
import { generateChecklistPDF, generateChecklistsReportPDF } from '../utils/pdf';
import { fetchChecklistConfirmations, deleteChecklistConfirmation } from '../services/checklists';
import { PrintHeader } from './ui/PrintHeader';
import { processCurrencyInput, parseCurrencyToNumber, formatCurrency } from '../utils/format';

interface ModalsProps {
  showNewContractModal: boolean;
  setShowNewContractModal: (show: boolean) => void;
  editingContract: Contract | null;
  newContractData: any;
  setNewContractData: (data: any) => void;
  handleSaveContract: (e: React.FormEvent) => void;
  isSaving: boolean;
  showNewFuelModal: boolean;
  setShowNewFuelModal: (show: boolean) => void;
  editingFuel: FuelRecord | null;
  newFuelData: any;
  setNewFuelData: (data: any) => void;
  handleSaveFuel: (e: React.FormEvent) => void;
  showNewDailyModal: boolean;
  setShowNewDailyModal: (show: boolean) => void;
  editingDaily: DailyRecord | null;
  newDailyData: any;
  setNewDailyData: (data: any) => void;
  handleSaveDaily: (e: React.FormEvent) => void;
  showNewChecklistModal: boolean;
  setShowNewChecklistModal: (show: boolean) => void;
  editingChecklist: ChecklistItem | null;
  newChecklistData: any;
  setNewChecklistData: (data: any) => void;
  handleSaveChecklist: (e: React.FormEvent) => void;
  showNewUserModal: boolean;
  setShowNewUserModal: (show: boolean) => void;
  editingUser: User | null;
  newUserData: any;
  setNewUserData: (data: any) => void;
  handleSaveUser: (e: React.FormEvent) => void;
  showNewServidorModal: boolean;
  setShowNewServidorModal: (show: boolean) => void;
  editingServidor: Servidor | null;
  newServidorData: any;
  setNewServidorData: (data: any) => void;
  handleSaveServidor: (e: React.FormEvent) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  deleteType: string;
  setDeleteType: (type: any) => void;
  handleDeleteConfirm: () => void;
  showChecklistSelectionModal: boolean;
  setShowChecklistSelectionModal: (show: boolean) => void;
  selectedChecklistIds: string[];
  setSelectedChecklistIds: (ids: string[]) => void;
  checklistRecords: ChecklistItem[];
  contracts: Contract[];
  showDailyChecklistReport: boolean;
  setShowDailyChecklistReport: (show: boolean) => void;
  systemSettings: SystemSettings | null;
  showDetailsModal: boolean;
  setShowDetailsModal: (show: boolean) => void;
  selectedChecklist: ChecklistItem | null;
  handleToggleChecklistItem: (checklistId: string, itemId: string) => void;
  handleAddTramitation: (checklistId: string, sector: string, action: string) => void;
  showCriticalModal: boolean;
  setShowCriticalModal: (show: boolean) => void;
  criticalContracts: Contract[];
  showSelectedChecklistReport: boolean;
  setShowSelectedChecklistReport: (show: boolean) => void;
  handleGenerateAIItems: () => void;
  isGeneratingAI: boolean;
  newItemLabel: string;
  setNewItemLabel: (label: string) => void;
  handleAddItem: () => void;
  handleRemoveItem: (id: string) => void;
  servidores: Servidor[];
  canDelete?: boolean;
  handleDeleteDaily?: (id: string) => void;
  handleDeleteChecklist?: (id: string) => void;
}

export const Modals = ({
  showNewContractModal, setShowNewContractModal, editingContract, newContractData, setNewContractData, handleSaveContract, isSaving,
  showNewFuelModal, setShowNewFuelModal, editingFuel, newFuelData, setNewFuelData, handleSaveFuel,
  showNewDailyModal, setShowNewDailyModal, editingDaily, newDailyData, setNewDailyData, handleSaveDaily,
  showNewChecklistModal, setShowNewChecklistModal, editingChecklist, newChecklistData, setNewChecklistData, handleSaveChecklist,
  showNewUserModal, setShowNewUserModal, editingUser, newUserData, setNewUserData, handleSaveUser,
  showNewServidorModal, setShowNewServidorModal, editingServidor, newServidorData, setNewServidorData, handleSaveServidor,
  showDeleteConfirm, setShowDeleteConfirm, deleteType, setDeleteType, handleDeleteConfirm,
  showChecklistSelectionModal, setShowChecklistSelectionModal, selectedChecklistIds, setSelectedChecklistIds, checklistRecords,
  showDailyChecklistReport, setShowDailyChecklistReport, systemSettings,
  showDetailsModal, setShowDetailsModal, selectedChecklist, handleToggleChecklistItem,
  handleAddTramitation,
  showCriticalModal, setShowCriticalModal, criticalContracts,
  showSelectedChecklistReport, setShowSelectedChecklistReport,
  handleGenerateAIItems, isGeneratingAI, newItemLabel, setNewItemLabel, handleAddItem, handleRemoveItem, contracts, servidores = [],
  canDelete, handleDeleteDaily, handleDeleteChecklist
}: ModalsProps) => {
  const [newTramitation, setNewTramitation] = React.useState({ sector: '', action: '' });
  const [showTramitationForm, setShowTramitationForm] = React.useState(false);
  const [isSavingTramitation, setIsSavingTramitation] = React.useState(false);
  const [confirmations, setConfirmations] = React.useState<ChecklistConfirmation[]>([]);
  const [sharedId, setSharedId] = React.useState<string | null>(null);
  const [contractSearchTerm, setContractSearchTerm] = React.useState('');
  const [showContractDropdown, setShowContractDropdown] = React.useState(false);

  const filteredContractsForSelection = React.useMemo(() => {
    if (!contractSearchTerm) return contracts;
    const lowerSearch = contractSearchTerm.toLowerCase();
    return contracts.filter(c => 
      (c.vendor && c.vendor.toLowerCase().includes(lowerSearch)) || 
      (c.number && c.number.toLowerCase().includes(lowerSearch))
    );
  }, [contracts, contractSearchTerm]);

  React.useEffect(() => {
    if (showNewChecklistModal) {
      if (editingChecklist) {
        setContractSearchTerm(editingChecklist.vendor || '');
      } else {
        setContractSearchTerm('');
      }
    }
  }, [showNewChecklistModal, editingChecklist]);

  React.useEffect(() => {
    if (showDetailsModal && selectedChecklist) {
      const loadConfirmations = async () => {
        const data = await fetchChecklistConfirmations(selectedChecklist.id);
        setConfirmations(data);
      };
      loadConfirmations();
    }
  }, [showDetailsModal, selectedChecklist]);

  const handleShareLink = (id: string) => {
    const shareUrl = `${window.location.origin}/checklist/${id}`;
    navigator.clipboard.writeText(shareUrl);
    setSharedId(id);
    setTimeout(() => setSharedId(null), 2000);
  };

  const handleShare = () => {
    if (!selectedChecklist) return;
    handleShareLink(selectedChecklist.id);
  };

  const handleAddStep = async () => {
    if (!selectedChecklist || !newTramitation.sector || !newTramitation.action) return;
    
    setIsSavingTramitation(true);
    try {
      await handleAddTramitation(selectedChecklist.id, newTramitation.sector, newTramitation.action);
      setNewTramitation({ sector: '', action: '' });
      setShowTramitationForm(false);
    } catch (err) {
      console.error("Erro ao registrar etapa:", err);
    } finally {
      setIsSavingTramitation(false);
    }
  };

  const handleDeleteConf = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta confirmação?')) return;
    
    const success = await deleteChecklistConfirmation(id);
    if (success) {
      setConfirmations(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <>
      {/* Critical Contracts Modal */}
      <AnimatePresence>
        {showCriticalModal && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCriticalModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-2xl bg-background sm:glass-card border border-border rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            >
              <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/20 rounded-xl text-rose-500">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-rose-500">Contratos Críticos</h3>
                    <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest mt-0.5">Ações imediatas necessárias</p>
                  </div>
                </div>
                <button onClick={() => setShowCriticalModal(false)} className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors"><X size={24} /></button>
              </div>

              <div className="p-6 overflow-y-auto no-scrollbar flex-1 flex flex-col gap-4">
                {criticalContracts.length > 0 ? (
                  criticalContracts.map((contract, idx) => (
                    <div key={`critical-contract-${contract.id || idx}`} className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-hover transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold">{contract.number}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                            contract.status === 'atencao' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                          )}>
                            {contract.status === 'atencao' ? 'Vencendo em breve' : 'Vencido'}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{contract.vendor}</p>
                        <p className="text-xs text-text-secondary mt-1">{contract.object}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Vigência</p>
                        <p className="text-sm font-bold text-rose-500">{contract.validity.split(' - ')[1] || contract.expiryDate}</p>
                        <button className="mt-2 text-xs font-bold text-primary hover:underline">
                          Renovar Agora
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <ClipboardCheck size={48} className="mx-auto text-emerald-500 opacity-20 mb-4" />
                    <p className="text-text-secondary">Nenhum contrato crítico no momento.</p>
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8 bg-surface-hover/30 border-t border-border flex gap-4 shrink-0 mt-auto sticky bottom-0 bg-background/80 backdrop-blur-xl z-20">
                <button 
                  onClick={() => setShowCriticalModal(false)}
                  className="flex-1 py-3.5 px-4 bg-surface border border-border rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-surface-hover transition-all active:scale-95 shadow-inner"
                >
                  Fechar
                </button>
                <button className="flex-[2] py-3.5 px-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2">
                   <Printer size={16} />
                   Gerar Relatório de Crise
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selected Checklist Report Modal */}
      <AnimatePresence>
        {showSelectedChecklistReport && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 print:p-0 print:static print:bg-white">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSelectedChecklistReport(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="bg-background sm:glass-card w-full max-w-4xl relative z-10 max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-t-[32px] sm:rounded-[32px] overflow-hidden print:shadow-none print:border-none print:rounded-none"
            >
              <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0 print:bg-transparent print:border-b-2 print:border-black">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner print:hidden">
                    <Printer size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight print:text-black">Relatório de Checklists Selecionados</h3>
                    <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-0.5 print:text-black">
                      {selectedChecklistIds.length} itens selecionados — Gestão de Processos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button 
                    onClick={() => {
                      const selectedChecklists = checklistRecords.filter(c => selectedChecklistIds.includes(c.id));
                      generateChecklistsReportPDF(selectedChecklists, 'Relatório de Processos Selecionados', systemSettings);
                    }}
                    className="p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors border border-border"
                    title="Imprimir Seleção"
                  >
                    <Printer size={20} />
                  </button>
                  <button 
                    onClick={() => setShowSelectedChecklistReport(false)}
                    className="p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-8 overflow-y-auto print:overflow-visible no-scrollbar">
                <PrintHeader title="Relatório de Processos Selecionados" />
                <div className="space-y-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-text-secondary text-[10px] uppercase tracking-widest border-b border-border print:text-black print:border-black">
                        <th className="px-4 py-3 font-bold">Nº Processo</th>
                        <th className="px-4 py-3 font-bold">Fornecedor</th>
                        <th className="px-4 py-3 font-bold">Objeto</th>
                        <th className="px-4 py-3 font-bold">Valor Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border print:divide-black/20">
                      {checklistRecords.filter(c => selectedChecklistIds.includes(c.id)).map((checklist, idx) => (
                        <tr key={`selected-report-check-${checklist.id || idx}`} className="print:text-black hover:bg-surface-hover/30 transition-colors">
                          <td className="px-4 py-4 text-sm font-bold">{checklist.processNumber}</td>
                          <td className="px-4 py-4 text-sm font-medium">{checklist.vendor}</td>
                          <td className="px-4 py-4 text-xs text-text-secondary max-w-[200px]">{checklist.object}</td>
                          <td className="px-4 py-4 text-sm font-black text-primary">{checklist.invoiceValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="p-6 sm:p-8 bg-surface-hover/30 border-t border-border flex gap-4 shrink-0 mt-auto sticky bottom-0 bg-background/80 backdrop-blur-xl z-20 print:hidden">
                <button 
                   onClick={() => setShowSelectedChecklistReport(false)}
                   className="flex-1 py-3.5 px-4 bg-surface border border-border rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-surface-hover transition-all active:scale-95 shadow-inner"
                >
                  Fechar
                </button>
                <button 
                  onClick={() => {
                    const selectedChecklists = checklistRecords.filter(c => selectedChecklistIds.includes(c.id));
                    generateChecklistsReportPDF(selectedChecklists, 'Relatório de Processos Selecionados', systemSettings);
                  }}
                  className="flex-[2] py-3.5 px-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Printer size={16} />
                  Imprimir Relatório
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New/Edit Contract Modal */}
      <AnimatePresence>
        {showNewContractModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewContractModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 100 }} 
              className="bg-background sm:glass-card w-full max-w-2xl relative z-10 flex flex-col rounded-t-[32px] sm:rounded-[32px] overflow-hidden max-h-[95vh] sm:max-h-[90vh]"
            >
              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary"><FileText size={20} /></div>
                  <h3 className="text-xl font-bold">{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</h3>
                </div>
                <button onClick={() => setShowNewContractModal(false)} className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveContract} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col no-scrollbar">
                {editingContract && parseCurrencyToNumber(newContractData.totalValue) > 0 && (() => {
                  const total = parseCurrencyToNumber(newContractData.totalValue);
                  const consumed = parseCurrencyToNumber(newContractData.consumption);
                  const percentage = total > 0 ? (consumed / total) * 100 : 0;
                  const balance = total - consumed;
                  const isNearZero = percentage >= 90;

                  return (
                    <div className="bg-surface-hover/30 rounded-[28px] p-6 border border-border/50 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-1">Gráfico de Consumo</h4>
                          <p className="text-sm font-bold">Resumo de Execução Financeira</p>
                        </div>
                        {isNearZero && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20 animate-pulse">
                            <AlertTriangle size={12} />
                            <span className="text-[10px] font-black uppercase tracking-wider">Saldo Crítico</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className={cn(
                            "text-2xl font-black tracking-tight",
                            isNearZero ? "text-rose-500" : "text-primary"
                          )}>
                            {percentage.toFixed(1)}%
                          </span>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Saldo Restante</p>
                            <p className={cn(
                              "text-sm font-black",
                              isNearZero ? "text-rose-600" : "text-emerald-500"
                            )}>
                              {formatCurrency(balance)}
                            </p>
                          </div>
                        </div>

                        <div className="w-full h-3 bg-background rounded-full overflow-hidden border border-border/40 p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, percentage)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full transition-all shadow-sm",
                              isNearZero ? "bg-rose-500 shadow-rose-500/20" : "bg-primary shadow-primary/20"
                            )}
                          />
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-text-secondary uppercase opacity-60">Consumido</span>
                            <span className="text-xs font-bold">{formatCurrency(consumed)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-text-secondary uppercase opacity-60">Total</span>
                            <span className="text-xs font-bold text-text-secondary">{formatCurrency(total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Número do Contrato</label><input type="text" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newContractData.number} onChange={(e) => setNewContractData({ ...newContractData, number: e.target.value })} required /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Fornecedor</label><input type="text" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newContractData.vendor} onChange={(e) => setNewContractData({ ...newContractData, vendor: e.target.value })} required /></div>
                  <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Objeto do Contrato</label><textarea className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner min-h-[80px] resize-none" value={newContractData.object} onChange={(e) => setNewContractData({ ...newContractData, object: e.target.value })} required /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Vigência (Ex: 12 meses)</label><input type="text" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newContractData.validity} onChange={(e) => setNewContractData({ ...newContractData, validity: e.target.value })} required /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Data de Vencimento</label><input type="date" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newContractData.expiryDate} onChange={(e) => setNewContractData({ ...newContractData, expiryDate: e.target.value })} required /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Valor Total (R$)</label><input type="text" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newContractData.totalValue} onChange={(e) => setNewContractData({ ...newContractData, totalValue: processCurrencyInput(e.target.value) })} required /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Consumo Atual (R$)</label><input type="text" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newContractData.consumption} onChange={(e) => setNewContractData({ ...newContractData, consumption: processCurrencyInput(e.target.value) })} /></div>
                </div>

                {editingContract && (
                  <div className="pt-6 border-t border-border">
                    <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-4">Processos Associados</h4>
                    <div className="space-y-2">
                      {checklistRecords.filter(c => 
                        c.contractNumber?.trim().toLowerCase() === editingContract.number?.trim().toLowerCase() ||
                        editingContract.number?.trim().toLowerCase().includes((c.contractNumber || '').replace(/^(N[ºo].?\s*|Contrato\s*)/i, '').trim().toLowerCase()) && c.contractNumber?.length > 2
                      ).length > 0 ? (
                        checklistRecords
                          .filter(c => 
                            c.contractNumber?.trim().toLowerCase() === editingContract.number?.trim().toLowerCase() ||
                            editingContract.number?.trim().toLowerCase().includes((c.contractNumber || '').replace(/^(N[ºo].?\s*|Contrato\s*)/i, '').trim().toLowerCase()) && c.contractNumber?.length > 2
                          )
                          .map((c) => (
                            <div key={c.id} className="flex items-center justify-between p-3 bg-surface-hover/50 border border-border rounded-xl">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">{c.processNumber}</span>
                                <span className="text-[10px] text-text-secondary">{c.submissionDate}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-rose-500">{c.invoiceValue}</span>
                                <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary">{c.status}</p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-6 border border-dashed border-border rounded-xl">
                          <p className="text-[10px] font-bold text-text-secondary uppercase">Nenhum processo vinculado</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-border mt-auto shrink-0">
                  <button type="button" onClick={() => setShowNewContractModal(false)} className="flex-1 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-text-secondary hover:bg-surface-hover transition-all">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-[2] bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20">
                    {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    {isSaving ? 'Salvando...' : 'Salvar Contrato'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New/Edit Daily Modal */}
      <AnimatePresence>
        {showNewDailyModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewDailyModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 100 }} 
              className="bg-background sm:glass-card w-full max-w-lg relative z-10 flex flex-col rounded-t-[32px] sm:rounded-[32px] overflow-hidden max-h-[95vh] sm:max-h-[90vh]"
            >
              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary"><Calendar size={20} /></div>
                  <h3 className="text-xl font-bold">{editingDaily ? 'Editar Diária' : 'Nova Diária'}</h3>
                </div>
                <button onClick={() => setShowNewDailyModal(false)} className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveDaily} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col no-scrollbar">
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1 flex justify-between">
                        <span>Beneficiário</span>
                        {servidores.some(s => s.name.trim().toLowerCase() === newDailyData.beneficiary?.trim().toLowerCase()) && (
                          <span className="text-emerald-500 flex items-center gap-1"><Database size={10} /> Base Municipal</span>
                        )}
                      </label>
                      <input 
                        type="text" 
                        list="servidores-list"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" 
                        value={newDailyData.beneficiary} 
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = servidores.find(s => s.name.trim().toLowerCase() === val.trim().toLowerCase());
                          setNewDailyData({ 
                            ...newDailyData, 
                            beneficiary: val,
                            registrationNumber: found ? (found.registrationNumber || '') : newDailyData.registrationNumber
                          });
                        }} 
                        required 
                      />
                      <datalist id="servidores-list">
                        {servidores.map((s, idx) => (
                          <option key={`servidor-datalist-opt-${s.id || idx}`} value={s.name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Matrícula</label>
                      <input type="text" placeholder="Ex: 12345" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newDailyData.registrationNumber || ''} onChange={(e) => setNewDailyData({ ...newDailyData, registrationNumber: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Destino</label>
                    <input type="text" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newDailyData.destination} onChange={(e) => setNewDailyData({ ...newDailyData, destination: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Partida</label>
                      <input type="date" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newDailyData.departureDate} onChange={(e) => setNewDailyData({ ...newDailyData, departureDate: e.target.value })} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Retorno</label>
                      <input type="date" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newDailyData.returnDate} onChange={(e) => setNewDailyData({ ...newDailyData, returnDate: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Valor (R$)</label>
                      <input type="text" className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" value={newDailyData.value} onChange={(e) => setNewDailyData({ ...newDailyData, value: processCurrencyInput(e.target.value) })} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Status</label>
                      <select className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner appearance-none" value={newDailyData.status} onChange={(e) => setNewDailyData({ ...newDailyData, status: e.target.value })}>
                        <option value="pendente">Pendente</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="pago">Pago</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Finalidade da Viagem</label>
                  <textarea 
                    className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner min-h-[100px] resize-none" 
                    placeholder="Descreva o objetivo da viagem detalhadamente..."
                    value={newDailyData.purpose || ''} 
                    onChange={(e) => setNewDailyData({ ...newDailyData, purpose: e.target.value })} 
                  />
                </div>
                <div className="flex gap-3 pt-4 border-t border-border mt-auto shrink-0">
                  {editingDaily && canDelete && handleDeleteDaily && (
                    <button 
                      type="button" 
                      onClick={() => {
                        handleDeleteDaily(editingDaily.id);
                        setShowNewDailyModal(false);
                      }} 
                      className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                      title="Excluir Diária"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button type="button" onClick={() => setShowNewDailyModal(false)} className="flex-1 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-text-secondary hover:bg-surface-hover transition-all">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-[2] bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20">
                    {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    {isSaving ? 'Salvando...' : 'Salvar Diária'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New/Edit Checklist Modal */}
      <AnimatePresence>
        {showNewChecklistModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowNewChecklistModal(false);
                setNewChecklistData({ ...newChecklistData, items: [] });
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full bg-background sm:glass-card border border-border rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{editingChecklist ? 'Editar Processo' : 'Novo Processo'}</h3>
                    <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest mt-0.5">Gestão de Pagamentos</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNewChecklistModal(false)}
                  className="p-2.5 hover:bg-surface-hover rounded-2xl transition-colors text-text-secondary"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1 flex justify-between">
                      <span>Nº do Processo</span>
                      {!editingChecklist && newChecklistData.processNumber && (
                        <span className="text-emerald-500 flex items-center gap-1"><Check size={10} /> Sugerido</span>
                      )}
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: 2026/000123"
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3.5 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                      value={newChecklistData.processNumber || ''}
                      onChange={(e) => setNewChecklistData({...newChecklistData, processNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Nº do Contrato</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 01/2026"
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3.5 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                      value={newChecklistData.contractNumber || ''}
                      onChange={(e) => setNewChecklistData({...newChecklistData, contractNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Fornecedor / Contrato</label>
                    <div className="relative">
                      <div className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                        <input 
                          type="text"
                          placeholder="Buscar por fornecedor ou contrato..."
                          className="w-full bg-surface-hover border border-border rounded-xl pl-11 pr-4 py-3.5 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                          value={contractSearchTerm}
                          onChange={(e) => {
                            setContractSearchTerm(e.target.value);
                            setShowContractDropdown(true);
                          }}
                          onFocus={() => setShowContractDropdown(true)}
                        />
                      </div>

                      <AnimatePresence>
                        {showContractDropdown && (
                          <div key="contract-dropdown-wrapper">
                            <div className="fixed inset-0 z-[110]" onClick={() => setShowContractDropdown(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-2xl shadow-2xl z-[120] overflow-hidden max-h-[300px] flex flex-col"
                            >
                              <div className="overflow-y-auto no-scrollbar">
                                {filteredContractsForSelection.length > 0 ? (
                                  filteredContractsForSelection.map((contract) => (
                                    <button
                                      key={contract.id}
                                      type="button"
                                      className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors flex flex-col gap-0.5 border-b border-border/50 last:border-0"
                                      onClick={() => {
                                        setNewChecklistData({
                                          ...newChecklistData,
                                          vendor: contract.vendor,
                                          contractNumber: contract.number,
                                          object: contract.object,
                                          value: contract.totalValue 
                                        });
                                        setContractSearchTerm(contract.vendor);
                                        setShowContractDropdown(false);
                                      }}
                                    >
                                      <span className="text-sm font-black text-text-primary">{contract.vendor}</span>
                                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Contrato: {contract.number}</span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="p-4 text-center">
                                    <p className="text-xs font-bold text-text-secondary">Nenhum contrato encontrado</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1 flex justify-between">
                      <span>Valor da Nota Fiscal</span>
                      {(() => {
                        const stripped = (newChecklistData.contractNumber || '').replace(/^(N[ºo].?\s*|Contrato\s*)/i, '').trim();
                        const contract = contracts.find(c => 
                          c.number?.trim().toLowerCase() === newChecklistData.contractNumber?.trim().toLowerCase() ||
                          c.number?.trim().toLowerCase().includes(stripped.toLowerCase()) && stripped.length > 2
                        );
                        if (contract) {
                          const total = parseCurrencyToNumber(contract.totalValue || '0');
                          const consumed = parseCurrencyToNumber(contract.consumption || '0');
                          const balance = total - consumed;
                          const currentInvoice = parseCurrencyToNumber(newChecklistData.invoiceValue || '0');
                          
                          if (currentInvoice > balance && balance > 0) {
                            return <span className="text-rose-500 flex items-center gap-1"><AlertTriangle size={10} /> Excede Saldo ({formatCurrency(balance)})</span>;
                          }
                          return <span className="text-emerald-500">Saldo Disp: {formatCurrency(balance)}</span>;
                        }
                        return null;
                      })()}
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: R$ 1.500,00"
                      className={cn(
                        "w-full bg-surface-hover border border-border rounded-xl px-4 py-3.5 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner",
                        parseCurrencyToNumber(newChecklistData.invoiceValue) > 0 ? "text-rose-500" : "text-text-primary"
                      )}
                      value={newChecklistData.invoiceValue || ''}
                      onChange={(e) => {
                        const newInvoiceVal = processCurrencyInput(e.target.value);
                        setNewChecklistData({...newChecklistData, invoiceValue: newInvoiceVal});
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Nº da Nota Fiscal</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 123456"
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3.5 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                      value={newChecklistData.invoiceNumber || ''}
                      onChange={(e) => setNewChecklistData({...newChecklistData, invoiceNumber: e.target.value})}
                    />
                  </div>

                  <div className="col-span-full space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Objeto do Contrato</label>
                    <textarea 
                      placeholder="Descrição resumida do objeto..."
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3.5 outline-none focus:border-primary transition-all font-bold text-sm min-h-[80px] resize-none shadow-inner"
                      value={newChecklistData.object || ''}
                      onChange={(e) => setNewChecklistData({...newChecklistData, object: e.target.value})}
                    />
                  </div>
                </div>

                {/* Seção das Etapas */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Documentação e Etapas</label>
                    <button 
                      type="button"
                      onClick={handleGenerateAIItems}
                      disabled={isGeneratingAI || (!newChecklistData.object && !newChecklistData.processNumber)}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                      {isGeneratingAI ? (
                        <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      Sugerir com IA
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {newChecklistData.items?.map((item: any) => (
                      <div 
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border text-[10px] font-black uppercase tracking-tight text-left transition-all",
                          item.checked 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" 
                            : "bg-surface-hover/50 border-border text-text-secondary"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = newChecklistData.items.map((i: any) => 
                              i.id === item.id ? { ...i, checked: !i.checked } : i
                            );
                            setNewChecklistData({ ...newChecklistData, items: newItems });
                          }}
                          className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0",
                            item.checked ? "bg-emerald-500 border-emerald-500 text-white" : "bg-surface border-border text-transparent"
                          )}
                        >
                          <Check size={12} strokeWidth={4} />
                        </button>
                        <span className="flex-1 truncate">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = newChecklistData.items.filter((i: any) => i.id !== item.id);
                            setNewChecklistData({ ...newChecklistData, items: newItems });
                          }}
                          className="p-1 hover:bg-rose-500/10 text-text-secondary hover:text-rose-500 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">Adicionar Novos Itens</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DEFAULT_CHECKLIST_DOCUMENTS.filter(docName => 
                        !newChecklistData.items?.some((i: any) => i.label === docName)
                      ).map((docName) => (
                        <button
                          key={docName}
                          type="button"
                          onClick={() => {
                            const newItem = { id: crypto.randomUUID(), label: docName, checked: false };
                            setNewChecklistData({ ...newChecklistData, items: [...(newChecklistData.items || []), newItem] });
                          }}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-hover/30 text-[10px] font-black uppercase tracking-tight text-left hover:border-primary/50 transition-all text-text-secondary"
                        >
                          <Plus size={14} className="text-primary" />
                          <span className="flex-1">{docName}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Adicionar etapa manualmente..."
                      className="flex-1 bg-surface-hover border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-all font-bold shadow-inner"
                      value={newItemLabel}
                      onChange={(e) => setNewItemLabel(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                    />
                    <button 
                      type="button"
                      onClick={handleAddItem}
                      className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all active:scale-95 shadow-inner"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-surface-hover/30 border-t border-border flex gap-4 shrink-0 px-4 sm:px-8 mt-auto sticky bottom-0 bg-background/80 backdrop-blur-xl z-20">
                {editingChecklist && canDelete && handleDeleteChecklist && (
                  <button 
                    type="button" 
                    onClick={() => {
                      handleDeleteChecklist(editingChecklist.id);
                      setShowNewChecklistModal(false);
                    }} 
                    className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                    title="Excluir Processo"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setShowNewChecklistModal(false)}
                  className="flex-1 py-3.5 px-4 sm:px-6 bg-surface border border-border rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-surface-hover transition-all active:scale-95"
                >
                  Cancelar
                </button>
                {editingChecklist && (
                  <div className="relative flex-1">
                    <button 
                      type="button"
                      onClick={handleShare}
                      className="w-full h-full bg-surface border border-border rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-surface-hover transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Share2 size={16} />
                      <span className="hidden xs:inline">Link</span>
                    </button>
                    <AnimatePresence>
                      {sharedId === editingChecklist.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-text-primary text-background text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl z-50"
                        >
                          Copiado!
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <button 
                  type="button"
                  onClick={handleSaveChecklist}
                  disabled={isSaving}
                  className="flex-[2] py-3.5 px-4 sm:px-6 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  {isSaving ? 'Salvando...' : 'Salvar Processo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New/Edit Fuel Modal */}
      <AnimatePresence>
        {showNewFuelModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewFuelModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-3xl bg-background sm:glass-card border border-border rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-border flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner">
                    <Fuel size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">
                      {editingFuel ? 'Editar Abastecimento' : 'Novo Abastecimento'}
                    </h3>
                    <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest mt-0.5">
                      Registro de Combustível
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewFuelModal(false)}
                  className="p-2.5 hover:bg-surface-hover rounded-2xl transition-colors text-text-secondary"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 no-scrollbar">

                {/* Seção: Identificação do Veículo */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center gap-2">
                    <span className="w-4 h-px bg-border inline-block"></span>
                    Identificação do Veículo
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Veículo / Fabricante *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Fiat Strada"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                        value={newFuelData.vehicle || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, vehicle: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Motorista / Servidor *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: João Silva"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                        value={newFuelData.driver || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, driver: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Placa
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: ABC-1234"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm uppercase shadow-inner"
                        value={newFuelData.plate || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, plate: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Renavam
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 00000000000"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                        value={newFuelData.renavam || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, renavam: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Ano / Modelo
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 2022/2023"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                        value={newFuelData.yearModel || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, yearModel: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Oficial Responsável
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Secretaria de Transportes"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                        value={newFuelData.official || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, official: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Seção: Dados do Abastecimento */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center gap-2">
                    <span className="w-4 h-px bg-border inline-block"></span>
                    Dados do Abastecimento
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Data *
                      </label>
                      <input
                        type="date"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                        value={newFuelData.date || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Tipo de Combustível
                      </label>
                      <select
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm appearance-none shadow-inner"
                        value={newFuelData.fuelType || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, fuelType: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        <option value="Gasolina">Gasolina</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Etanol">Etanol</option>
                        <option value="GNV">GNV</option>
                        <option value="Elétrico">Elétrico</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Qt. Litros *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 50"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                        value={newFuelData.quantity || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Valor Unitário (R$/L)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 5,89"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                        value={newFuelData.unitPrice || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, unitPrice: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Valor Total (R$) *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: R$ 294,50"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm text-primary shadow-inner"
                        value={newFuelData.cost || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, cost: processCurrencyInput(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Status
                      </label>
                      <select
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm appearance-none shadow-inner"
                        value={newFuelData.status || 'concluido'}
                        onChange={(e) => setNewFuelData({ ...newFuelData, status: e.target.value })}
                      >
                        <option value="concluido">Concluído</option>
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em Andamento</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seção: Dados de KM */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center gap-2">
                    <span className="w-4 h-px bg-border inline-block"></span>
                    Hodômetro
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        KM Atual (Dezena)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 45.230"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                        value={newFuelData.kmReading || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, kmReading: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                        Rendimento (KM/L)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 12.4"
                        className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-sm shadow-inner"
                        value={newFuelData.kmPerLiter || ''}
                        onChange={(e) => setNewFuelData({ ...newFuelData, kmPerLiter: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 sm:p-8 bg-surface-hover/30 border-t border-border flex gap-4 shrink-0 mt-auto sticky bottom-0 bg-background/80 backdrop-blur-xl z-20">
                <button
                  type="button"
                  onClick={() => setShowNewFuelModal(false)}
                  className="flex-1 px-6 py-4 bg-surface border border-border rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-surface-hover transition-all active:scale-95 shadow-inner"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFuel}
                  disabled={!newFuelData.vehicle || !newFuelData.driver || !newFuelData.quantity || !newFuelData.cost}
                  className="flex-[2] px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {editingFuel ? 'Salvar Alterações' : 'Registrar Abastecimento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 100 }} 
              className="bg-background sm:glass-card w-full max-w-sm relative z-10 text-center p-8 rounded-t-[32px] sm:rounded-[32px] overflow-hidden"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6 shrink-0"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-bold mb-2">Confirmar Exclusão</h3>
              <p className="text-text-secondary text-sm mb-8">Esta ação é irreversível. Tem certeza que deseja excluir {deleteType.includes('Bulk') ? 'os itens selecionados' : 'este registro'}?</p>
              <div className="flex flex-col gap-2">
                <button onClick={handleDeleteConfirm} className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-rose-500/20">Sim, Excluir</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs text-text-secondary hover:bg-surface-hover transition-all">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checklist Selection Modal */}
      <AnimatePresence>
        {showChecklistSelectionModal && (
          <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowChecklistSelectionModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 100 }} 
              className="relative w-full h-full sm:h-auto sm:max-w-5xl bg-background sm:glass-card border border-border sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] z-10 rounded-t-[32px]"
            >
              <div className="p-6 sm:p-8 border-b border-border flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner">
                    <CheckSquare size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">Selecionar Processos</h3>
                    <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest mt-0.5">Selecione os itens para impressão ou exclusão</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedChecklistIds.length > 0 && (
                    <button 
                      onClick={() => {
                        const selectedChecklists = checklistRecords.filter(c => selectedChecklistIds.includes(c.id));
                        generateChecklistsReportPDF(selectedChecklists, 'Relatório de Processos Selecionados', systemSettings);
                      }}
                      className="p-2.5 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-colors border border-primary/20 flex items-center gap-2 text-xs font-bold"
                      title="Imprimir Selecionados"
                    >
                      <Printer size={18} />
                      <span className="hidden sm:inline">Imprimir</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setShowChecklistSelectionModal(false)}
                    className="p-2.5 hover:bg-surface-hover rounded-2xl transition-colors text-text-secondary"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-8 overflow-y-auto no-scrollbar flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-text-secondary text-[10px] uppercase tracking-widest border-b border-border">
                      <th className="px-4 py-4 font-bold w-10">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-surface-hover"
                          checked={checklistRecords.length > 0 && selectedChecklistIds.length === checklistRecords.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChecklistIds(checklistRecords.map(r => r.id));
                            } else {
                              setSelectedChecklistIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-4 font-bold">Nº Processo</th>
                      <th className="px-4 py-4 font-bold hidden md:table-cell">Fornecedor</th>
                      <th className="px-4 py-4 font-bold hidden sm:table-cell">Objeto</th>
                      <th className="px-4 py-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {checklistRecords.map((item, idx) => (
                      <tr key={`select-modal-${item.id}-${idx}`} className={cn(
                        "hover:bg-surface-hover/50 transition-colors group border-b border-border/50 last:border-0",
                        selectedChecklistIds.includes(item.id) && "bg-primary/5"
                      )}>
                        <td className="px-4 py-5">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-surface-hover"
                            checked={selectedChecklistIds.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedChecklistIds([...selectedChecklistIds, item.id]);
                              } else {
                                setSelectedChecklistIds(selectedChecklistIds.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm font-bold tracking-tight">{item.processNumber}</p>
                          <p className="text-[10px] text-text-secondary md:hidden mt-0.5">{item.vendor} — {item.contractNumber}</p>
                        </td>
                        <td className="px-4 py-5 text-sm text-text-secondary hidden md:table-cell font-medium">{item.vendor}</td>
                        <td className="px-4 py-5 text-xs text-text-secondary hidden sm:table-cell truncate max-w-[200px]">{item.object}</td>
                        <td className="px-4 py-5">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest",
                            item.status === 'concluido' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                          )}>
                            {(item.status || '').replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="p-6 sm:p-8 border-t border-border bg-surface-hover/30 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                {selectedChecklistIds.length > 0 && (
                  <button 
                    onClick={() => {
                      setDeleteType('checklistBulk');
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full sm:w-auto px-6 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                  >
                    <Trash2 size={18} />
                    Excluir Selecionados ({selectedChecklistIds.length})
                  </button>
                )}
                <button 
                  onClick={() => setShowChecklistSelectionModal(false)}
                  className="w-full sm:w-auto px-12 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 active:scale-95"
                >
                  <CheckCircle2 size={18} />
                  Concluir Seleção
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Checklist Report Modal */}
      <AnimatePresence>
        {showDailyChecklistReport && (
          <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDailyChecklistReport(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 100 }} 
              className="bg-background sm:glass-card w-full h-full sm:h-auto sm:max-w-5xl relative z-10 flex flex-col rounded-t-[32px] sm:rounded-[32px] overflow-hidden max-h-[95vh] sm:max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner"><Printer size={28} /></div>
                  <div>
                    <h3 className="text-xl font-bold">Relatório de Processos</h3>
                    <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-0.5">Visão Geral do Dia • {format(new Date(), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const today = format(new Date(), 'yyyy-MM-dd');
                      const shareUrl = `${window.location.origin}/checklist/dia/${today}`;
                      navigator.clipboard.writeText(shareUrl);
                      setSharedId('day-report');
                      setTimeout(() => setSharedId(null), 2000);
                    }}
                    className="relative p-2.5 bg-surface border border-border hover:bg-primary/10 hover:text-primary rounded-xl text-text-secondary transition-colors"
                    title="Compartilhar Link do Dia"
                  >
                    <Share2 size={20} />
                    <AnimatePresence>
                      {sharedId === 'day-report' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-text-primary text-background text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none"
                        >
                          Link Copiado!
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                  <button 
                    onClick={() => {
                      const dailyRecords = checklistRecords.filter(c => c.submissionDate === format(new Date(), 'yyyy-MM-dd'));
                      generateChecklistsReportPDF(dailyRecords, `Relatório Diário de Processos - ${format(new Date(), 'dd/MM/yyyy')}`, systemSettings);
                    }}
                    className="p-2.5 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-colors border border-primary/20"
                    title="Imprimir Relatório"
                  >
                    <Printer size={20} />
                  </button>
                  <button 
                    onClick={() => setShowDailyChecklistReport(false)} 
                    className="p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar">
                <div className="space-y-6">
                  {checklistRecords.filter(c => c.submissionDate === format(new Date(), 'yyyy-MM-dd')).length === 0 ? (
                    <div className="text-center py-20 text-text-secondary">
                      <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-6 opacity-40">
                        <ClipboardCheck size={40} />
                      </div>
                      <p className="text-lg font-bold tracking-tight">Nenhum processo registrado hoje.</p>
                      <p className="text-sm opacity-60">Os novos checklists aparecerão aqui conforme forem preenchidos.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-hover/30 text-text-secondary text-[10px] uppercase tracking-widest border-b border-border">
                            <th className="px-6 py-4 font-black">Nº Processo</th>
                            <th className="px-6 py-4 font-black">Fornecedor</th>
                            <th className="px-6 py-4 font-black">Nº Nota</th>
                            <th className="px-6 py-4 font-black text-rose-500">Valor Nota</th>
                            <th className="px-6 py-4 font-black text-center">Link Público</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {checklistRecords.filter(c => c.submissionDate === format(new Date(), 'yyyy-MM-dd')).map((checklist, idx) => (
                            <tr key={`report-check-row-${checklist.id || idx}`} className="hover:bg-surface-hover/20 transition-colors">
                              <td className="px-6 py-4 text-sm font-black text-primary">{checklist.processNumber}</td>
                              <td className="px-6 py-4 text-sm font-medium">{checklist.vendor}</td>
                              <td className="px-6 py-4 text-sm font-medium text-text-secondary">{checklist.invoiceNumber || '-'}</td>
                              <td className="px-6 py-4 text-sm font-black text-rose-500">
                                {checklist.invoiceValue ? (checklist.invoiceValue.startsWith('R$') ? checklist.invoiceValue : `R$ ${checklist.invoiceValue}`) : '-'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="relative inline-block">
                                  <button
                                    onClick={() => handleShareLink(checklist.id)}
                                    className="p-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                                    title="Copiar Link de Compartilhamento"
                                  >
                                    <Share2 size={16} />
                                  </button>
                                  <AnimatePresence>
                                    {sharedId === checklist.id && (
                                      <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-text-primary text-background text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none"
                                      >
                                        Link Copiado!
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 sm:p-8 border-t border-border bg-surface-hover/30 flex justify-end sticky bottom-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <button 
                  onClick={() => setShowDailyChecklistReport(false)} 
                  className="w-full sm:w-auto px-12 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                  Fechar Relatório
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedChecklist && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowDetailsModal(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 100 }} 
              className="bg-background sm:glass-card w-full max-w-3xl relative z-10 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-t-[32px] sm:rounded-[32px] p-0"
            >
              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary"><Info size={20} /></div>
                  <div>
                    <h3 className="text-xl font-bold">Detalhes do Processo</h3>
                    <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Nº {selectedChecklist.processNumber}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 no-scrollbar">
                {/* Header Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                  <div className="glass-card bg-surface-hover/30 border-border/50 p-4">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Data de Envio</p>
                    <div className="flex items-center gap-2 text-text-primary">
                      <Calendar size={18} />
                      <span className="text-sm font-black tracking-tight">{format(parseISO(selectedChecklist.submissionDate), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                  <div className="glass-card bg-surface-hover/30 border-border/50 p-4">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Valor da Nota</p>
                    <div className="flex items-center gap-2 text-rose-500">
                      <FileText size={18} />
                      <span className="text-sm font-black tracking-tight">{selectedChecklist.invoiceValue || 'Não informado'}</span>
                    </div>
                  </div>
                  <div className="glass-card bg-surface-hover/30 border-border/50 p-4">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Nº da Nota</p>
                    <div className="flex items-center gap-2 text-text-primary">
                      <Hash size={18} className="text-primary" />
                      <span className="text-sm font-black tracking-tight">{selectedChecklist.invoiceNumber || 'Não informado'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Briefcase size={18} className="text-primary" />
                    <h4 className="text-sm font-black uppercase tracking-widest">Informações do Contrato</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div><label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1">Fornecedor</label><p className="text-sm font-bold text-text-primary leading-tight">{selectedChecklist.vendor}</p></div>
                      <div><label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1">Nº do Contrato</label><p className="text-sm font-black text-primary tracking-tight">{selectedChecklist.contractNumber}</p></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1">Objeto</label><p className="text-sm font-medium text-text-secondary leading-relaxed">{selectedChecklist.object}</p></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <h4 className="text-sm font-black uppercase tracking-widest">Checklist de Conformidade</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {selectedChecklist.items?.map((item, idx) => (
                      <div 
                        key={`detail-check-item-${item.id || idx}`} 
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all",
                          item.checked 
                            ? "bg-emerald-500/5 border-emerald-500/30 shadow-sm" 
                            : "bg-surface-hover/20 border-border/50 shadow-none"
                        )}
                      >
                        <span className={cn(
                          "text-xs font-bold transition-all flex-1 pr-4",
                          item.checked ? "text-emerald-500" : "text-text-secondary"
                        )}>
                          {item.label}
                        </span>
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                          item.checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-border/60 text-transparent"
                        )}>
                          <CheckCircle2 size={14} strokeWidth={3} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirmations Section */}
                {confirmations.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <UserCircle size={18} className="text-primary" />
                      <h4 className="text-sm font-black uppercase tracking-widest">Confirmações de Recebimento</h4>
                    </div>
                    <div className="space-y-3">
                      {confirmations.map((conf, idx) => (
                        <div key={`confirmation-log-${conf.id || idx}`} className="p-4 bg-surface-hover/30 border border-border/50 rounded-2xl flex items-center justify-between group/conf">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold group-hover/conf:bg-primary group-hover/conf:text-white transition-all">
                              {conf.nome_confirmante.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-text-primary">{conf.nome_confirmante}</p>
                              <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">
                                Recebimento Confirmado
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs font-bold text-text-primary">{format(new Date(conf.data_confirmacao), "dd/MM/yyyy")}</p>
                              <p className="text-[10px] text-text-secondary font-medium">{format(new Date(conf.data_confirmacao), "HH:mm:ss")}</p>
                            </div>
                            {canDelete && (
                              <button 
                                onClick={() => handleDeleteConf(conf.id)}
                                className="p-2 text-text-secondary/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover/conf:opacity-100"
                                title="Excluir Confirmação"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-8 border-t border-border bg-surface-hover/30 flex gap-4 sticky bottom-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                {canDelete && handleDeleteChecklist && (
                  <button 
                    onClick={() => {
                      handleDeleteChecklist(selectedChecklist.id);
                      setShowDetailsModal(false);
                    }}
                    className="p-4 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-2xl transition-all border border-rose-500/20 active:scale-95"
                    title="Excluir Processo"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  onClick={() => setShowDetailsModal(false)} 
                  className="flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs text-text-secondary bg-surface border border-border hover:bg-surface-hover transition-all active:scale-95 shadow-inner"
                >
                  Fechar
                </button>
                <button 
                  onClick={() => generateChecklistPDF(selectedChecklist, systemSettings)}
                  className="flex-1 bg-surface border border-border hover:bg-surface-hover text-text-primary py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Printer size={18} /> Imprimir
                </button>
                <div className="relative flex-1">
                  <button 
                    onClick={handleShare}
                    className="w-full bg-primary hover:bg-primary/90 text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 active:scale-95"
                  >
                    <Share2 size={18} /> 
                    <span className="hidden xs:inline">Compartilhar</span>
                  </button>
                  <AnimatePresence>
                    {sharedId === selectedChecklist.id && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-text-primary text-background text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl z-50"
                      >
                        Link Copiado!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* New/Edit User Modal */}
      <AnimatePresence>
        {showNewUserModal && (
          <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewUserModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 100 }} 
              className="bg-background sm:glass-card w-full max-w-lg relative z-10 flex flex-col rounded-t-[32px] sm:rounded-[32px] overflow-hidden max-h-[95vh] sm:max-h-[90vh]"
            >
              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary"><UserCircle size={20} /></div>
                  <h3 className="text-xl font-bold">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                </div>
                <button onClick={() => setShowNewUserModal(false)} className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 flex flex-col no-scrollbar">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" 
                    value={newUserData.name} 
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Usuário / Login</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" 
                      value={newUserData.username} 
                      onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Senha</label>
                    <input 
                      type="password" 
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" 
                      placeholder={editingUser ? "Alterar senha..." : "Senha de acesso"}
                      value={newUserData.password} 
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} 
                      required={!editingUser}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">E-mail (Opcional)</label>
                  <input 
                    type="email" 
                    className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" 
                    value={newUserData.email} 
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Nível de Acesso</label>
                    <select 
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner appearance-none"
                      value={newUserData.role}
                      onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as any })}
                    >
                      <option value="superadmin">Super Admin</option>
                      <option value="gestor">Gestor</option>
                      <option value="compras">Compras</option>
                      <option value="visualizador">Visualizador</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Status</label>
                    <select 
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner appearance-none"
                      value={newUserData.status}
                      onChange={(e) => setNewUserData({ ...newUserData, status: e.target.value })}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Departamento / Setor</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" 
                    value={newUserData.department} 
                    onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })} 
                    required 
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Permissões de Acesso (Selecione os módulos permitidos. Superadmins possuem acesso total.)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'dashboard', label: 'Dashboard' },
                      { id: 'combustivel', label: 'Combustível' },
                      { id: 'diarias', label: 'Diárias' },
                      { id: 'checklists', label: 'Checklists' },
                      { id: 'contratos', label: 'Contratos' },
                      { id: 'notas_fiscais', label: 'Notas Fiscais' },
                      { id: 'usuarios', label: 'Usuários' },
                      { id: 'relatorios', label: 'Relatórios' },
                      { id: 'relatorio_executivo', label: 'Rel. Executivo' },
                      { id: 'protocolo-entrada', label: 'Protocolo - Entrada' },
                      { id: 'protocolo-saida', label: 'Protocolo - Saída' },
                      { id: 'protocolo-processos', label: 'Protocolo - Processos' },
                      { id: 'protocolo-tramitacao', label: 'Protocolo - Tramitação' },
                      { id: 'protocolo-pendencias', label: 'Protocolo - Pendências' },
                      { id: 'protocolo-arquivos', label: 'Protocolo - Arquivos' },
                      { id: 'manual', label: 'Manual' },
                      { id: 'configuracoes', label: 'Configurações' }
                    ].map(perm => (
                      <label key={perm.id} className="flex items-center gap-2 p-2 rounded-xl border border-border hover:bg-surface-hover cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-primary rounded border-border" 
                          checked={newUserData.permissions?.includes(perm.id) || false}
                          onChange={(e) => {
                            const current = newUserData.permissions || [];
                            const newPerms = e.target.checked 
                              ? [...current, perm.id]
                              : current.filter((p: string) => p !== perm.id);
                            setNewUserData({ ...newUserData, permissions: newPerms });
                          }}
                        />
                        <span className="text-xs font-bold text-text-primary">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-6 sm:p-8 bg-surface-hover/30 border-t border-border flex gap-4 sticky bottom-0 bg-background/80 backdrop-blur-xl z-20 shrink-0 mt-8 -mx-6 sm:-mx-8">
                  <button 
                    type="button" 
                    onClick={() => setShowNewUserModal(false)} 
                    className="flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs text-text-secondary bg-surface border border-border hover:bg-surface-hover transition-all active:scale-95 shadow-inner"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving} 
                    className="flex-[2] bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/10 active:scale-95"
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    {isSaving ? 'Salvando...' : (editingUser ? 'Salvar Alterações' : 'Criar Usuário')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New/Edit Servidor Modal */}
      <AnimatePresence>
        {showNewServidorModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowNewServidorModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 100 }} 
              className="relative w-full max-w-2xl bg-background border border-border rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[95vh] sm:max-h-[85vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner">
                    <Users size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">
                      {editingServidor ? 'Editar Servidor' : 'Cadastrar Servidor'}
                    </h3>
                    <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest mt-0.5">
                      Base de Dados de Funcionários
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNewServidorModal(false)} 
                  className="p-2.5 hover:bg-surface-hover rounded-2xl transition-colors text-text-secondary"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveServidor} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 no-scrollbar pb-32 sm:pb-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Nome Completo *</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" 
                    value={newServidorData.name} 
                    onChange={(e) => setNewServidorData({ ...newServidorData, name: e.target.value })} 
                    placeholder="Ex: João da Silva Santos"
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Matrícula</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" 
                      value={newServidorData.registrationNumber || ''} 
                      onChange={(e) => setNewServidorData({ ...newServidorData, registrationNumber: e.target.value })} 
                      placeholder="Número da matrícula"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Identificação / CPF</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner" 
                      value={newServidorData.cpf} 
                      onChange={(e) => setNewServidorData({ ...newServidorData, cpf: e.target.value })} 
                      placeholder="Somente números"
                    />
                  </div>
                </div>

                <div className="p-6 sm:p-8 bg-surface-hover/30 border-t border-border flex gap-4 sticky bottom-0 bg-background/80 backdrop-blur-xl z-20 shrink-0 mt-8 -mx-6 sm:-mx-8">
                  <button 
                    type="button" 
                    onClick={() => setShowNewServidorModal(false)} 
                    className="flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs text-text-secondary bg-surface border border-border hover:bg-surface-hover transition-all active:scale-95 shadow-inner"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving} 
                    className="flex-[2] bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/10 active:scale-95"
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    {isSaving ? 'Salvando...' : (editingServidor ? 'Salvar Alterações' : 'Cadastrar Servidor')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};