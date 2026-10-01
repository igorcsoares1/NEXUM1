import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  Fuel, 
  Calendar, 
  ClipboardCheck, 
  FileText,
  Receipt,
  X,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PrintHeader } from '../components/PrintHeader';
import { User } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RelatoriosProps {
  currentUser: User | null;
  fuelRecords: any[];
  dailyRecords: any[];
  contracts: any[];
  checklistRecords: any[];
  notasFiscais: any[];
  handleExportPDF: (reportName: string, filters?: { startDate: string, endDate: string }) => void;
  isExportingPDF: boolean;
  chartData: any[];
  handlePrint: () => void;
}

type PeriodType = 'tudo' | 'hoje' | 'semana' | 'mes' | 'custom';

const Relatorios = ({
  currentUser,
  fuelRecords,
  dailyRecords,
  contracts,
  checklistRecords,
  notasFiscais,
  handlePrint,
  handleExportPDF,
  isExportingPDF,
  chartData
}: RelatoriosProps) => {
  const [showPeriodModal, setShowPeriodModal] = React.useState(false);
  const [selectedReportType, setSelectedReportType] = React.useState<string | null>(null);
  const [periodType, setPeriodType] = React.useState<PeriodType>('mes');
  const [customDateStart, setCustomDateStart] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [customDateEnd, setCustomDateEnd] = React.useState(format(new Date(), 'yyyy-MM-dd'));

  const reportOptions = [
    { title: 'Combustível', type: 'combustivel', icon: Fuel, color: 'text-primary', bg: 'bg-primary/10', hover: 'hover:bg-primary hover:text-white', borderColor: 'hover:border-primary' },
    { title: 'Diárias', type: 'diarias', icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10', hover: 'hover:bg-emerald-500 hover:text-white', borderColor: 'hover:border-emerald-500' },
    { title: 'Checklists', type: 'checklists', icon: ClipboardCheck, color: 'text-amber-500', bg: 'bg-amber-500/10', hover: 'hover:bg-amber-500 hover:text-white', borderColor: 'hover:border-amber-500' },
    { title: 'Notas Fiscais', type: 'notas-fiscais', icon: Receipt, color: 'text-indigo-500', bg: 'bg-indigo-500/10', hover: 'hover:bg-indigo-500 hover:text-white', borderColor: 'hover:border-indigo-500' },
    { title: 'Contratos', type: 'contratos', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-500/10', hover: 'hover:bg-rose-500 hover:text-white', borderColor: 'hover:border-rose-500' },
  ];

  const handleReportClick = (type: string) => {
    setSelectedReportType(type);
    setShowPeriodModal(true);
  };

  const onConfirmExport = () => {
    if (!selectedReportType) return;

    let startDate = '';
    let endDate = '';

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    if (periodType !== 'tudo') {
      switch (periodType) {
        case 'hoje':
          startDate = todayStr;
          endDate = todayStr;
          break;
        case 'semana':
          startDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          endDate = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          break;
        case 'mes':
          startDate = format(startOfMonth(today), 'yyyy-MM-dd');
          endDate = format(endOfMonth(today), 'yyyy-MM-dd');
          break;
        case 'custom':
          startDate = customDateStart;
          endDate = customDateEnd;
          break;
      }
    }

    handleExportPDF(selectedReportType, startDate && endDate ? { startDate, endDate } : undefined);
    setShowPeriodModal(false);
  };

  const getPeriodLabel = () => {
    const today = new Date();
    switch (periodType) {
      case 'tudo': return 'Todo o período';
      case 'hoje': return `Hoje (${format(today, 'dd/MM/yyyy')})`;
      case 'semana': return 'Esta semana';
      case 'mes': return format(today, 'MMMM/yyyy', { locale: ptBR });
      case 'custom': return `${format(new Date(customDateStart + 'T12:00:00'), 'dd/MM/yyyy')} - ${format(new Date(customDateEnd + 'T12:00:00'), 'dd/MM/yyyy')}`;
      default: return '';
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden" id="report-content">
      <PrintHeader title="Relatórios e Auditoria" />
      
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8">
        
        {/* ── MOBILE LAYOUT ─────────────────────────────────── */}
        <div className="flex flex-col lg:hidden">
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 pt-6 pb-4 flex justify-between items-end print:hidden">
            <div>
              <h2 className="text-2xl font-black tracking-tighter">Relatórios</h2>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mt-1">Auditoria & Análise</p>
            </div>
            {currentUser && (
              <div className="flex gap-2">
                 <button onClick={handlePrint} className="w-10 h-10 flex items-center justify-center bg-surface border border-border rounded-xl text-text-primary active:scale-95 transition-all">
                  <Printer size={18} />
                </button>
                <button 
                  onClick={() => handleExportPDF('geral')} 
                  disabled={isExportingPDF}
                  className="px-4 h-10 flex items-center justify-center bg-primary text-white rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest gap-2"
                >
                  {isExportingPDF ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={14} />}
                  Exportar
                </button>
              </div>
            )}
          </header>

          <div className="p-4 space-y-6">
            {/* Quick Report Cards Feed */}
            <div className="grid grid-cols-2 gap-4">
              {reportOptions.map((opt, idx) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  key={`mob-rep-${opt.type}`}
                  onClick={() => handleReportClick(opt.type)}
                  className="bg-surface border border-border/60 rounded-[2rem] p-6 flex flex-col items-center text-center gap-4 active:scale-95 transition-all shadow-sm group"
                >
                  <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all", opt.bg, opt.color)}>
                    <opt.icon size={32} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black tracking-tight">{opt.title}</h4>
                    <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Gerar PDF</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts Feed */}
            <section className="space-y-4 pt-4">
               <h3 className="text-lg font-black tracking-tight px-1">Distribuição de Recursos</h3>
               <div className="bg-surface border border-border/60 rounded-[2.5rem] p-6">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#0f172a' }} labelStyle={{ color: '#64748b' }} />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </section>
          </div>
        </div>

        {/* ── DESKTOP LAYOUT ────────────────────────────────── */}
        <div className="hidden lg:flex flex-col p-8 space-y-8 max-w-[1600px] mx-auto w-full">
           <header className="flex justify-between items-end print:hidden">
            <div>
              <h1 className="text-4xl font-black tracking-tighter">Relatórios e Auditoria</h1>
              <p className="text-text-secondary font-medium text-lg">Gere documentos oficiais e analise indicadores municipais.</p>
            </div>
            {currentUser && (
              <div className="flex gap-3">
                <button onClick={handlePrint} className="px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 btn-surface">
                  <Printer size={18} /> Imprimir Página
                </button>
                <button 
                  onClick={() => handleExportPDF('geral')} 
                  disabled={isExportingPDF}
                  className="px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 btn-primary"
                >
                  {isExportingPDF ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={18} />}
                  Exportar Relatório Geral
                </button>
              </div>
            )}
          </header>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 print:hidden">
            {reportOptions.map((opt) => (
              <div 
                key={`desk-rep-${opt.type}`}
                onClick={() => handleReportClick(opt.type)}
                className={cn("glass-card flex flex-col items-center text-center gap-6 p-8 cursor-pointer border-2 border-transparent transition-all group", opt.borderColor)}
              >
                <div className={cn("p-6 rounded-3xl transition-all shadow-lg", opt.bg, opt.color, opt.hover)}>
                  <opt.icon size={40} />
                </div>
                <div>
                  <h4 className="text-xl font-black tracking-tight">{opt.title}</h4>
                  <p className="text-[10px] text-text-secondary font-black uppercase tracking-[0.2em] mt-2">Relatório Completo</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="glass-card p-10 xl:col-span-2">
              <h3 className="text-xl font-black tracking-tight mb-8">Consumo de Combustível por Período</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }} itemStyle={{ color: '#0f172a' }} labelStyle={{ color: '#64748b' }} />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="glass-card p-8">
                <h3 className="text-lg font-black tracking-tight mb-6">Consolidação de Contratos</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Vigente', value: 30, color: '#10b981' },
                          { name: 'Vencido', value: 2, color: '#f43f5e' },
                          { name: 'Atenção', value: 5, color: '#f59e0b' },
                        ]}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { name: 'Vigente', value: 30, color: '#10b981' },
                          { name: 'Vencido', value: 2, color: '#f43f5e' },
                          { name: 'Atenção', value: 5, color: '#f59e0b' },
                        ].map((entry, index) => (
                          <Cell key={`pie-cell-contract-${entry.name}-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"/> <span className="text-[10px] font-bold text-text-secondary uppercase">Vigente</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"/> <span className="text-[10px] font-bold text-text-secondary uppercase">Vencido</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"/> <span className="text-[10px] font-bold text-text-secondary uppercase">Atenção</span></div>
                </div>
              </div>

              <div className="glass-card p-8">
                <h3 className="text-lg font-black tracking-tight mb-6">Status das Notas Fiscais</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Recebidas', value: notasFiscais.filter(n => n.status === 'recebido').length || 1, color: '#10b981' },
                          { name: 'Pendentes', value: notasFiscais.filter(n => n.status === 'pendente').length || 0, color: '#f59e0b' },
                        ]}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { name: 'Recebidas', value: notasFiscais.filter(n => n.status === 'recebido').length || 1, color: '#10b981' },
                          { name: 'Pendentes', value: notasFiscais.filter(n => n.status === 'pendente').length || 0, color: '#f59e0b' },
                        ].map((entry, index) => (
                          <Cell key={`pie-cell-nf-${entry.name}-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"/> <span className="text-[10px] font-bold text-text-secondary uppercase">Recebidas</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"/> <span className="text-[10px] font-bold text-text-secondary uppercase">Pendentes</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL - Seletor de Período para Relatórios */}
      <AnimatePresence>
        {showPeriodModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPeriodModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border/40 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-text-primary tracking-tight">Período do Relatório</h2>
                    <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mt-0.5">Selecione o intervalo de datas</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPeriodModal(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-surface-hover rounded-xl text-text-secondary transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'tudo', label: 'Todo o Período' },
                    { value: 'mes', label: 'Este Mês' },
                    { value: 'semana', label: 'Esta Semana' },
                    { value: 'hoje', label: 'Hoje' },
                    { value: 'custom', label: 'Personalizado' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPeriodType(option.value as PeriodType)}
                      className={cn(
                        "px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-between group",
                        periodType === option.value
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-background text-text-secondary hover:text-text-primary border border-border/40"
                      )}
                    >
                      {option.label}
                      <ChevronRight size={14} className={cn("transition-transform", periodType === option.value ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
                    </button>
                  ))}
                </div>

                {periodType === 'custom' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-4 bg-background rounded-[2rem] p-6 border border-border/40"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Data Inicial</label>
                        <input
                          type="date"
                          value={customDateStart}
                          onChange={e => setCustomDateStart(e.target.value)}
                          className="w-full bg-surface border border-border/40 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Data Final</label>
                        <input
                          type="date"
                          value={customDateEnd}
                          onChange={e => setCustomDateEnd(e.target.value)}
                          className="w-full bg-surface border border-border/40 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 opacity-60">Visualização:</p>
                    <p className="text-sm font-black text-text-primary">{getPeriodLabel()}</p>
                  </div>
                  <Download className="text-primary opacity-20" size={24} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPeriodModal(false)}
                    className="flex-1 px-6 py-4 bg-background border border-border/60 text-text-primary rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-surface-hover transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={onConfirmExport}
                    disabled={isExportingPDF}
                    className="flex-[1.5] px-6 py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isExportingPDF ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Download size={16} />
                        Gerar Relatório
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Relatorios;
