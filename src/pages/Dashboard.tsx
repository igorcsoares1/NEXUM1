import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Database,
  Fuel,
  TrendingUp,
  ClipboardCheck,
  BarChart3,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, differenceInDays, parseISO } from 'date-fns';
import { StatCard } from '../components/ui/StatCard';
import { cn } from '../lib/utils';
import { User, FuelRecord, DailyRecord, Contract, ChecklistItem, AuditItem, View, SystemSettings } from '../types';
import { parseCurrencyToNumber } from '../utils/format';
import { generateAuditLogsPDF } from '../utils/pdf';

interface DashboardProps {
  currentUser: User | null;
  fuelRecords: FuelRecord[];
  dailyRecords: DailyRecord[];
  contracts: Contract[];
  checklistRecords: ChecklistItem[];
  setActiveView: (view: View) => void;
  setContractFilter: (filter: string) => void;
  dashboardDateRange: string;
  setDashboardDateRange: (range: string) => void;
  dashboardStartDate: string;
  setDashboardStartDate: (date: string) => void;
  dashboardEndDate: string;
  setDashboardEndDate: (date: string) => void;
  chartData: any[];
  auditItems: AuditItem[];
  addNotification: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  systemSettings: SystemSettings;
}

const Dashboard = ({
  currentUser,
  fuelRecords,
  dailyRecords,
  contracts,
  checklistRecords,
  setActiveView,
  setContractFilter,
  dashboardDateRange,
  setDashboardDateRange,
  dashboardStartDate,
  setDashboardStartDate,
  dashboardEndDate,
  setDashboardEndDate,
  chartData,
  auditItems,
  addNotification,
  systemSettings
}: DashboardProps) => {
  const totalFuelCost = fuelRecords.reduce((acc, record) => {
    const cost = parseCurrencyToNumber(record.cost);
    return acc + cost;
  }, 0);

  const totalDailyCost = dailyRecords.reduce((acc, record) => {
    const val = parseCurrencyToNumber(record.value);
    return acc + val;
  }, 0);

  const totalContractConsumption = contracts.reduce((acc, record) => {
    const cons = parseCurrencyToNumber(record.consumption);
    return acc + cons;
  }, 0);

  const totalActiveContractsValue = contracts
    .filter(c => c.status === 'vigente' || c.status === 'atencao' || c.status === 'aditivado')
    .reduce((acc, c) => {
      const val = parseCurrencyToNumber(c.totalValue);
      return acc + val;
    }, 0);

  const budgetConsumptionPercent = totalActiveContractsValue > 0
    ? (totalContractConsumption / totalActiveContractsValue) * 100
    : 0;

  const criticalContracts = contracts.filter(c => {
    const days = differenceInDays(parseISO(c.expiryDate), new Date());
    return days >= 0 && days <= 7;
  });

  const distributionData = [
    { name: 'Combustível', value: totalFuelCost, color: '#0ea5e9' },
    { name: 'Diárias', value: totalDailyCost, color: '#f59e0b' },
    { name: 'Contratos', value: totalContractConsumption, color: '#10b981' },
  ];

  const handleExportLogs = () => {
    if (auditItems.length === 0) {
      addNotification("Aviso", "Não há logs para exportar.", "info");
      return;
    }
    generateAuditLogsPDF(auditItems, systemSettings);
    addNotification("Sucesso", "Relatório de logs gerado com sucesso!", "success");
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div id="dashboard-content" className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8">

        {/* ── MOBILE/TABLET DASHBOARD ───────────────────────── */}
        <div className="flex flex-col lg:hidden p-4 sm:p-6 md:p-8 space-y-6">
          <header className="px-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Dashboard Operacional</h1>
            <p className="text-text-secondary text-xs sm:text-sm font-medium mt-1">Gestão e indicadores municipais.</p>
          </header>

          {criticalContracts.length > 0 && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative p-6 rounded-[2rem] bg-rose-500 overflow-hidden shadow-2xl shadow-rose-500/30"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <AlertTriangle size={20} className="text-white" />
                  </div>
                  <span className="text-white font-black uppercase text-[10px] tracking-widest">Ação Necessária</span>
                </div>
                <h4 className="text-white text-lg font-black leading-tight mb-4">
                  {criticalContracts.length} contratos expiram em menos de 7 dias
                </h4>
                <button
                  onClick={() => { setContractFilter('vencendo30'); }}
                  className="w-full py-3.5 bg-white text-rose-500 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-sm hover:bg-zinc-50 active:scale-95"
                >
                  Verificar agora
                </button>
              </div>
            </motion.div>
          )}

          {/* Quick Stats Grid - More responsive with md:grid-cols-4 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              title="Total Contratos" 
              value={totalActiveContractsValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} 
              icon={<Database size={20} />} 
              onClick={() => setActiveView('contratos')}
            />
            <StatCard 
              title="Consumo Médio" 
              value={`${budgetConsumptionPercent.toFixed(1)}%`} 
              icon={<TrendingUp size={20} />} 
              trend={{ value: budgetConsumptionPercent > 80 ? 'Alerta' : 'Estável', isPositive: budgetConsumptionPercent < 80 }}
            />
            <StatCard 
              title="Combustível" 
              value={totalFuelCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} 
              icon={<Fuel size={20} />} 
              onClick={() => setActiveView('combustivel')}
            />
            <StatCard 
              title="Auditorias" 
              value={checklistRecords.length.toString()} 
              icon={<ClipboardCheck size={20} />} 
              onClick={() => setActiveView('checklists')}
            />
          </div>

          {/* Charts Mobile/Tablet */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-black tracking-tight px-1">Distribuição de Gastos</h3>
              <div className="bg-surface border border-border/60 rounded-[2.5rem] p-6 h-full flex flex-col justify-between shadow-sm">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                        {distributionData.map((entry, index) => <Cell key={`pie-cell-${entry.name}-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#0f172a' }} labelStyle={{ color: '#64748b' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {distributionData.map((item, index) => (
                    <div key={`mob-distribution-${item.name}-${index}`} className="flex items-center justify-between bg-surface-hover/30 p-2.5 rounded-xl border border-border/20">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] font-bold text-text-secondary uppercase">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-black">{item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end px-1">
                <h3 className="text-lg font-black tracking-tight">Evolução</h3>
                <div className="flex items-center gap-2">
                  {dashboardDateRange === 'custom' && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                      <input 
                        type="date" 
                        value={dashboardStartDate} 
                        onChange={(e) => setDashboardStartDate(e.target.value)}
                        className="bg-surface border border-border rounded-lg px-2 py-1 text-[9px] font-bold outline-none"
                      />
                      <span className="text-[9px] font-bold text-text-secondary">até</span>
                      <input 
                        type="date" 
                        value={dashboardEndDate} 
                        onChange={(e) => setDashboardEndDate(e.target.value)}
                        className="bg-surface border border-border rounded-lg px-2 py-1 text-[9px] font-bold outline-none"
                      />
                    </div>
                  )}
                  <select value={dashboardDateRange} onChange={(e) => setDashboardDateRange(e.target.value)} className="bg-surface border border-border rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest outline-none">
                    <option value="3months">3M</option>
                    <option value="6months">6M</option>
                    <option value="12months">1A</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
              </div>
              <div className="bg-surface border border-border/60 rounded-[2.5rem] p-6 h-[280px] shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="mobGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} fontWeight={700} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#64748b" fontSize={9} fontWeight={700} axisLine={false} tickLine={false} hide />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} fill="url(#mobGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        {/* ── DESKTOP DASHBOARD ─────────────────────────────── */}
        <div className="hidden lg:flex flex-col p-8 space-y-8 max-w-[1600px] mx-auto w-full">
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tighter">Dashboard Operacional</h1>
              <p className="text-text-secondary font-medium text-lg">Central de monitoramento e indicadores de gestão municipal.</p>
            </div>
            {currentUser?.role !== 'visualizador' && (
              <div className="flex items-center gap-3">
                 <button onClick={handleExportLogs} className="px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest bg-surface border border-border hover:bg-surface-hover transition-all active:scale-95 shadow-sm">
                    Exportar Logs
                 </button>
                 <button onClick={() => setActiveView('relatorios')} className="px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest btn-primary">
                    Relatórios
                 </button>
              </div>
            )}
          </header>

          {criticalContracts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="text-rose-500" size={20} />
                  <span className="text-rose-500 font-black uppercase text-xs tracking-widest">Alerta de Inconformidade</span>
                </div>
                <p className="text-text-secondary">Identificamos <strong>{criticalContracts.length} contratos</strong> com vigência expirando nos próximos 7 dias.</p>
              </div>
              <button onClick={() => { setContractFilter('vencendo30'); }} className="px-8 py-3 bg-rose-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95">Acessar Contratos</button>
            </motion.div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total em Vigor" 
              value={totalActiveContractsValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
              icon={<Database size={24} />} 
              onClick={() => setActiveView('contratos')}
            />
            <StatCard 
              title="Consumo Mensal" 
              value={totalFuelCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
              icon={<Fuel size={24} />} 
              onClick={() => setActiveView('combustivel')}
            />
            <StatCard 
              title="Orçamentário" 
              value={`${budgetConsumptionPercent.toFixed(1)}%`} 
              icon={<BarChart3 size={24} />} 
              trend={{ value: budgetConsumptionPercent > 80 ? 'Alerta' : 'Estável', isPositive: budgetConsumptionPercent < 80 }} 
            />
            <StatCard 
              title="Auditorias" 
              value={checklistRecords.length.toString()} 
              icon={<ClipboardCheck size={24} />} 
              onClick={() => setActiveView('checklists')}
              trend={{ value: '+12%', isPositive: true }} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-card p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black tracking-tight">Evolução de Despesas</h3>
                  <p className="text-text-secondary text-sm font-medium">Histórico consolidado nos últimos meses</p>
                </div>
                <div className="flex items-center gap-3">
                  {dashboardDateRange === 'custom' && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                      <input 
                        type="date" 
                        value={dashboardStartDate} 
                        onChange={(e) => setDashboardStartDate(e.target.value)}
                        className="bg-surface border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary transition-all shadow-sm"
                      />
                      <span className="text-xs font-black text-text-secondary uppercase tracking-widest">até</span>
                      <input 
                        type="date" 
                        value={dashboardEndDate} 
                        onChange={(e) => setDashboardEndDate(e.target.value)}
                        className="bg-surface border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary transition-all shadow-sm"
                      />
                    </div>
                  )}
                  <select value={dashboardDateRange} onChange={(e) => setDashboardDateRange(e.target.value)} className="bg-surface border border-border rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:border-primary cursor-pointer transition-all shadow-sm hover:border-primary/50">
                    <option value="3months">3 Meses</option>
                    <option value="6months">6 Meses</option>
                    <option value="12months">1 ano</option>
                    <option value="custom">Período Customizado</option>
                  </select>
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#64748b" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v / 1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px' }} itemStyle={{ color: '#0f172a' }} labelStyle={{ color: '#64748b' }} />
                    <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={4} fill="url(#dashGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-8 flex flex-col">
              <h3 className="text-xl font-black tracking-tight mb-8">Alocação de Recursos</h3>
              <div className="flex-1 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distributionData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value">
                      {distributionData.map((e, i) => <Cell key={`dash-cell-${e.name}-${i}`} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }} itemStyle={{ color: '#0f172a' }} labelStyle={{ color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4 pt-4 border-t border-border">
                {distributionData.map((item, i) => (
                  <div key={`dash-legend-${item.name}-${i}`} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-bold text-text-secondary">{item.name}</span>
                    </div>
                    <span className="text-sm font-black">{item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8 pb-12">
            <div className="glass-card p-8 bg-primary/5 border-primary/20 flex flex-col items-center justify-center text-center py-16">
              <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center text-primary mb-6 shadow-2xl shadow-primary/20">
                <BarChart3 size={40} />
              </div>
              <h4 className="text-2xl font-black tracking-tighter mb-3">Relatórios Dinâmicos</h4>
              <p className="text-text-secondary font-medium mb-8 max-w-lg mx-auto">Acesse análises customizadas e exporte dados para apresentações em PDF ou Excel.</p>
              {currentUser?.role !== 'visualizador' && (
                <button onClick={() => setActiveView('relatorios')} className="max-w-xs w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs btn-primary shadow-lg shadow-primary/20">Ir para Relatórios</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
