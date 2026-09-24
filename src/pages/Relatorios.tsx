import React from 'react';
import { 
  Printer, 
  Download, 
  Fuel, 
  Calendar, 
  ClipboardCheck, 
  FileText 
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
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { PrintHeader } from '../components/PrintHeader';
import { User } from '../types';

interface RelatoriosProps {
  currentUser: User | null;
  fuelRecords: any[];
  dailyRecords: any[];
  contracts: any[];
  checklistRecords: any[];
  handleExportPDF: (reportName: string) => void;
  isExportingPDF: boolean;
  chartData: any[];
  handlePrint: () => void;
}

const Relatorios = ({
  currentUser,
  fuelRecords,
  dailyRecords,
  contracts,
  checklistRecords,
  handlePrint,
  handleExportPDF,
  isExportingPDF,
  chartData
}: RelatoriosProps) => {

  const reportOptions = [
    { title: 'Combustível', type: 'combustivel', icon: Fuel, color: 'text-primary', bg: 'bg-primary/10', hover: 'hover:bg-primary hover:text-white', borderColor: 'hover:border-primary' },
    { title: 'Diárias', type: 'diarias', icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10', hover: 'hover:bg-emerald-500 hover:text-white', borderColor: 'hover:border-emerald-500' },
    { title: 'Checklists', type: 'checklists', icon: ClipboardCheck, color: 'text-amber-500', bg: 'bg-amber-500/10', hover: 'hover:bg-amber-500 hover:text-white', borderColor: 'hover:border-amber-500' },
    { title: 'Contratos', type: 'contratos', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-500/10', hover: 'hover:bg-rose-500 hover:text-white', borderColor: 'hover:border-rose-500' },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden" id="report-content">
      <PrintHeader title="Relatórios e Auditoria" />
      
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8">
        
        {/* ── MOBILE LAYOUT ─────────────────────────────────── */}
        <div className="flex flex-col lg:hidden">
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 pt-6 pb-4 flex justify-between items-end print:hidden">
            <div>
              <h2 className="text-2xl font-black tracking-tighter">Relatórios</h2>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mt-1">Auditoria & Analytics</p>
            </div>
            {currentUser?.role !== 'visualizador' && (
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
                  onClick={() => handleExportPDF(opt.type)}
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
            {currentUser?.role !== 'visualizador' && (
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

          <div className="grid grid-cols-4 gap-6 print:hidden">
            {reportOptions.map((opt) => (
              <div 
                key={`desk-rep-${opt.type}`}
                onClick={() => handleExportPDF(opt.type)}
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

          <div className="grid grid-cols-2 gap-8">
            <div className="glass-card p-10">
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

            <div className="glass-card p-10">
              <h3 className="text-xl font-black tracking-tight mb-8">Consolidação de Contratos</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Vigente', value: 30, color: '#10b981' },
                        { name: 'Vencido', value: 2, color: '#f43f5e' },
                        { name: 'Atenção', value: 5, color: '#f59e0b' },
                      ]}
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
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
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#0f172a' }} labelStyle={{ color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"/> <span className="text-xs font-bold text-text-secondary uppercase">Vigente</span></div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"/> <span className="text-xs font-bold text-text-secondary uppercase">Vencido</span></div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"/> <span className="text-xs font-bold text-text-secondary uppercase">Atenção</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
