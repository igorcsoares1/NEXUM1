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
import { FuelRecord, DailyRecord, Contract, ChecklistItem, AuditItem, View } from '../types';
import { parseCurrencyToNumber } from '../utils/format';

interface DashboardProps {
  fuelRecords: FuelRecord[];
  dailyRecords: DailyRecord[];
  contracts: Contract[];
  checklistRecords: ChecklistItem[];
  setActiveView: (view: View) => void;
  setContractFilter: (filter: string) => void;
  dashboardDateRange: string;
  setDashboardDateRange: (range: string) => void;
  chartData: any[];
  auditItems: AuditItem[];
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const Dashboard = ({
  fuelRecords,
  dailyRecords,
  contracts,
  checklistRecords,
  setActiveView,
  setContractFilter,
  dashboardDateRange,
  setDashboardDateRange,
  chartData,
  auditItems,
  addNotification
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

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div id="dashboard-content" className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-20 xl:pb-8">

        {/* ── MOBILE DASHBOARD ──────────────────────────────── */}
        <div className="flex flex-col xl:hidden p-4 space-y-4">

          {criticalContracts.length > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative p-5 rounded-[2rem] bg-rose-500 overflow-hidden shadow-2xl shadow-rose-500/30"
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
                  onClick={() => { setActiveView('contratos'); setContractFilter('vencendo30'); }}
                  className="w-full py-3.5 bg-white text-rose-500 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-sm border border-zinc-200 hover:bg-zinc-50 active:scale-95"
                >
                  Verificar agora
                </button>
              </div>
            </motion.div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div whileTap={{ scale: 0.95 }} className="bg-surface border border-border/60 p-5 rounded-[2rem] flex flex-col gap-4 shadow-sm">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Database size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest leading-none mb-1.5">Total Contratos</p>
                <p className="text-sm font-black truncate">{totalActiveContractsValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
              </div>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }} className="bg-surface border border-border/60 p-5 rounded-[2rem] flex flex-col gap-4 shadow-sm">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest leading-none mb-1.5">Consumo Médio</p>
                <p className="text-sm font-black">{budgetConsumptionPercent.toFixed(1)}%</p>
              </div>
            </motion.div>
          </div>

          {/* Charts Mobile */}
          <section className="space-y-4">
            <h3 className="text-lg font-black tracking-tight px-1">Distribuição de Gastos</h3>
            <div className="bg-surface border border-border/60 rounded-[2.5rem] p-6">
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                      {distributionData.map((entry, index) => <Cell key={`pie-cell-${entry.name}-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#0f172a' }} labelStyle={{ color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 gap-3 mt-4">
                {distributionData.map((item, index) => (
                  <div key={`mob-distribution-${item.name}-${index}`} className="flex items-center justify-between bg-surface-hover/30 p-3 rounded-2xl border border-border/20">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-text-secondary">{item.name}</span>
                    </div>
                    <span className="text-xs font-black">{item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Recent Audits Feed */}
          <section className="space-y-4">
            <div className="flex justify-between items-end px-1">
              <h3 className="text-lg font-black tracking-tight">Atividade Recente</h3>
              <button onClick={() => setActiveView('relatorios')} className="text-[11px] font-black text-primary uppercase tracking-widest">
                Ver todas
              </button>
            </div>
            <div className="space-y-3">
              {auditItems.slice(0, 4).map((item, idx) => (
                <div key={`mob-audit-feed-${item.id || idx}`} className="flex items-center gap-4 p-4 rounded-3xl bg-surface border border-border/40 transition-all">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                    item.type === 'fuel' && "bg-blue-500/10 text-blue-500",
                    item.type === 'checklist' && "bg-emerald-500/10 text-emerald-500",
                    item.type === 'daily' && "bg-amber-500/10 text-amber-500",
                    item.type === 'contract' && "bg-rose-500/10 text-rose-500",
                  )}>
                    <Clock size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black truncate leading-tight">{item.title}</p>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">{item.time} • {item.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── DESKTOP DASHBOARD ─────────────────────────────── */}
        <div className="hidden xl:flex flex-col p-8 space-y-8 max-w-[1600px] mx-auto w-full">
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tighter">Dashboard Operacional</h1>
              <p className="text-text-secondary font-medium text-lg">Central de monitoramento e indicadores de gestão municipal.</p>
            </div>
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
              <button onClick={() => { setActiveView('contratos'); setContractFilter('vencendo30'); }} className="px-8 py-3 bg-rose-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95">Acessar Contratos</button>
            </motion.div>
          )}

          <div className="grid grid-cols-4 gap-6">
            <StatCard title="Total em Vigor" value={totalActiveContractsValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={<Database size={24} />} />
            <StatCard title="Consumo Mensal" value={totalFuelCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={<Fuel size={24} />} />
            <StatCard title="Orçamentário" value={`${budgetConsumptionPercent.toFixed(1)}%`} icon={<BarChart3 size={24} />} trend={{ value: budgetConsumptionPercent > 80 ? 'Alerta' : 'Estável', isPositive: budgetConsumptionPercent < 80 }} />
            <StatCard title="Auditorias" value={checklistRecords.length.toString()} icon={<ClipboardCheck size={24} />} trend={{ value: '+12%', isPositive: true }} />
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 glass-card p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black tracking-tight">Evolução de Despesas</h3>
                  <p className="text-text-secondary text-sm font-medium">Histórico consolidado nos últimos meses</p>
                </div>
                <select value={dashboardDateRange} onChange={(e) => setDashboardDateRange(e.target.value)} className="bg-surface border border-border rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:border-primary">
                  <option value="3months">3 Meses</option>
                  <option value="6months">6 Meses</option>
                  <option value="12months">1 ano</option>
                </select>
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

          <div className="grid grid-cols-3 gap-8 pb-12">
            <div className="col-span-2 glass-card p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black tracking-tight">Timeline de Auditoria</h3>
                <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest btn-surface">Exportar Logs</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {auditItems.map((item, idx) => (
                  <div key={`dash-audit-${item.id}-${idx}`} className="flex items-center gap-4 p-5 bg-surface-hover/30 border border-border rounded-2xl hover:border-primary/40 hover:bg-surface-hover/50 transition-all group cursor-pointer">
                    <div className={cn("p-3 rounded-xl", item.type === 'fuel' && "bg-blue-500/10 text-blue-500", item.type === 'checklist' && "bg-emerald-500/10 text-emerald-500", item.type === 'daily' && "bg-amber-500/10 text-amber-500", item.type === 'contract' && "bg-rose-500/10 text-rose-500")}>
                      <Clock size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-[10px] text-text-secondary font-black uppercase tracking-tighter mt-1">{item.user} • {item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-8 bg-primary/5 border-primary/20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center text-primary mb-6 shadow-2xl shadow-primary/20">
                <BarChart3 size={40} />
              </div>
              <h4 className="text-2xl font-black tracking-tighter mb-3">Relatórios Dinâmicos</h4>
              <p className="text-text-secondary font-medium mb-8">Acesse análises customizadas e exporte dados para apresentações em PDF ou Excel.</p>
              <button onClick={() => setActiveView('relatorios')} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs btn-primary">Ir para Relatórios</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
