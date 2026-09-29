import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Database, Fuel, ClipboardCheck, RefreshCw, FileText, Truck, Plane,
  Users, CheckCircle2, ChevronRight, Wallet, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { differenceInDays } from 'date-fns';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { User, FuelRecord, DailyRecord, Contract, ChecklistItem, AuditItem, View, SystemSettings, Vehicle } from '../types';
import { parseCurrencyToNumber, safeGetDaysRemaining, safeParseDate } from '../utils/format';
import { getContractTotalValue } from '../services/contracts';
import { generateAuditLogsPDF } from '../utils/pdf';

interface DashboardProps {
  currentUser: User | null;
  fuelRecords: FuelRecord[];          // já filtrados pelo período
  dailyRecords: DailyRecord[];        // já filtrados pelo período
  contracts: Contract[];              // todos
  checklistRecords: ChecklistItem[];  // já filtrados pelo período
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
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const COR = { combustivel: '#0ea5e9', diarias: '#f59e0b', processos: '#10b981' };
const brl = (v: number, casas = 2) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas });
const brlCurto = (v: number) => Math.abs(v) >= 1e6 ? `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  : Math.abs(v) >= 1e3 ? `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil` : brl(v, 0);
const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const pct = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const litros = (q: any) => {
  const s = String(q ?? '').replace(/[^\d.,-]/g, '');
  const n = s.includes(',') ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const diasDesde = (d?: string) => { const x = safeParseDate(d); return x ? differenceInDays(new Date(), x) : 0; };

type Alerta = { nivel: 'urgente' | 'atencao'; texto: string; acao: () => void };

/** Cartão de indicador. */
const Kpi = ({ titulo, valor, sub, icone, onClick, tom = 'normal' }: {
  titulo: string; valor: string; sub?: React.ReactNode; icone: React.ReactNode; onClick?: () => void; tom?: 'normal' | 'bom' | 'alerta' | 'ruim';
}) => (
  <button type="button" onClick={onClick} disabled={!onClick}
    className={cn('glass-card p-4 text-left flex flex-col gap-3 transition-all disabled:cursor-default',
      onClick && 'hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.99]')}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{titulo}</span>
      <span className={cn('p-2 rounded-xl',
        tom === 'bom' ? 'bg-emerald-500/10 text-emerald-600' : tom === 'alerta' ? 'bg-amber-500/10 text-amber-600'
          : tom === 'ruim' ? 'bg-rose-500/10 text-rose-600' : 'bg-primary/10 text-primary')}>{icone}</span>
    </div>
    <div className="min-w-0">
      <p className="text-xl md:text-2xl font-black tracking-tight truncate">{valor}</p>
      {sub && <div className="text-xs text-text-secondary font-medium mt-1">{sub}</div>}
    </div>
  </button>
);

const Painel = ({ titulo, sub, acao, children, className }: { titulo: string; sub?: string; acao?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={cn('glass-card p-5 md:p-6 flex flex-col', className)}>
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="text-base md:text-lg font-black tracking-tight">{titulo}</h3>
        {sub && <p className="text-xs text-text-secondary font-medium">{sub}</p>}
      </div>
      {acao}
    </div>
    <div className="flex-1">{children}</div>
  </section>
);

const Vazio = ({ texto }: { texto: string }) => <p className="text-sm text-text-secondary italic py-6 text-center">{texto}</p>;

const Dashboard = ({
  currentUser, fuelRecords, dailyRecords, contracts, checklistRecords, setActiveView, setContractFilter,
  dashboardDateRange, setDashboardDateRange, dashboardStartDate, setDashboardStartDate, dashboardEndDate, setDashboardEndDate,
  chartData, auditItems, addNotification, systemSettings, onRefresh, isRefreshing = false
}: DashboardProps) => {
  // Dados que não vêm por props: frota e último Relatório Executivo salvo
  const [frota, setFrota] = useState<Vehicle[] | null>(null);
  const [relExec, setRelExec] = useState<any | null>(null);
  useEffect(() => {
    if (!currentUser?.prefeituraId) return;
    supabase.from('frota').select('id, placa, nome, status, km_atual, km_proxima_revisao').eq('prefeituraId', currentUser.prefeituraId)
      .then(({ data, error }) => setFrota(error ? [] : (data as any) || []));
    supabase.from('relatorios_executivos').select('competencia, periodo, data').order('competencia', { ascending: false }).limit(1)
      .then(({ data, error }) => setRelExec(error ? null : data?.[0] || null));
  }, [currentUser?.prefeituraId, isRefreshing]);

  const irContratos = (filtro: string) => setContractFilter(filtro);

  // ── Contratos (independem do período: situação de hoje) ──
  const c = useMemo(() => {
    const comDias = contracts.map(ct => {
      const total = getContractTotalValue(ct);
      const consumo = parseCurrencyToNumber(ct.consumption || '0');
      return { ct, dias: safeGetDaysRemaining(ct.expiryDate), total, consumo, uso: total > 0 ? consumo / total * 100 : 0 };
    });
    const vigentes = comDias.filter(x => x.dias >= 0 && x.ct.status !== 'vencido');
    const valor = vigentes.reduce((a, x) => a + x.total, 0);
    const consumo = vigentes.reduce((a, x) => a + Math.min(x.consumo, x.total || x.consumo), 0);
    return {
      vigentes, valor, consumo, saldo: Math.max(0, valor - consumo), exec: valor > 0 ? consumo / valor * 100 : 0,
      vencendo30: vigentes.filter(x => x.dias <= 30).sort((a, b) => a.dias - b.dias),
      vencendo90: vigentes.filter(x => x.dias <= 90).sort((a, b) => a.dias - b.dias),
      consumo90: vigentes.filter(x => x.uso >= 90),
      vencidosAbertos: comDias.filter(x => x.dias < 0 && x.ct.status !== 'vencido'),
    };
  }, [contracts]);

  // ── Processos de pagamento no período ──
  const p = useMemo(() => {
    const porStatus = { em_analise: 0, pendente: 0, atencao: 0, concluido: 0 } as Record<string, number>;
    checklistRecords.forEach(ch => { porStatus[ch.status] = (porStatus[ch.status] || 0) + 1; });
    const abertos = checklistRecords.filter(ch => ch.status !== 'concluido');
    return {
      total: checklistRecords.length, porStatus,
      valor: checklistRecords.reduce((a, ch) => a + parseCurrencyToNumber(ch.invoiceValue || '0'), 0),
      parados: abertos.filter(ch => diasDesde(ch.submissionDate) > 15),
      concluidosIncompletos: checklistRecords.filter(ch => ch.status === 'concluido' && (ch.items || []).some(i => !i.checked)),
    };
  }, [checklistRecords]);

  // ── Combustível e diárias no período ──
  const f = useMemo(() => {
    const porVeiculo = new Map<string, { nome: string; valor: number; litros: number }>();
    fuelRecords.forEach(r => {
      const k = (r.plate || r.vehicle || 'Sem identificação').toUpperCase();
      const v = porVeiculo.get(k) || { nome: r.vehicle || r.plate || 'Sem identificação', valor: 0, litros: 0 };
      v.valor += parseCurrencyToNumber(r.cost); v.litros += litros(r.quantity);
      porVeiculo.set(k, v);
    });
    const ranking = [...porVeiculo.values()].sort((a, b) => b.valor - a.valor);
    return {
      valor: ranking.reduce((a, v) => a + v.valor, 0), litros: ranking.reduce((a, v) => a + v.litros, 0),
      veiculos: ranking.length, top: ranking.slice(0, 6),
    };
  }, [fuelRecords]);
  const d = useMemo(() => ({
    valor: dailyRecords.reduce((a, r) => a + parseCurrencyToNumber(r.value), 0),
    qtd: dailyRecords.length,
    aguardando: dailyRecords.filter(r => r.approvalStatus === 'pendente' || r.status === 'pendente').length,
  }), [dailyRecords]);

  // ── Frota (situação de hoje) ──
  const fr = useMemo(() => {
    if (!frota) return null;
    const n = (s: string) => frota.filter(v => v.status === s).length;
    const revisao = frota.filter(v => {
      const atual = parseInt(String(v.km_atual || '').replace(/\D/g, '')) || 0;
      const prox = parseInt(String(v.km_proxima_revisao || '').replace(/\D/g, '')) || 0;
      return prox > 0 && atual >= prox;
    });
    return { total: frota.length, em_dia: n('em_dia'), em_uso: n('em_uso'), manutencao: n('manutencao'), parado: n('parado'), revisao };
  }, [frota]);

  // ── Pessoal (último Relatório Executivo salvo) ──
  const pessoal = relExec?.data?.pessoal;
  const indicePessoal: number | undefined = pessoal?.indice_12m ?? pessoal?.indice_mes;
  const tomPessoal = indicePessoal === undefined ? 'normal' : indicePessoal > 54 ? 'ruim' : indicePessoal > 48.6 ? 'alerta' : 'bom';

  // ── Pontos de atenção ──
  const alertas: Alerta[] = [];
  if (indicePessoal !== undefined && indicePessoal > 51.3)
    alertas.push({ nivel: indicePessoal > 54 ? 'urgente' : 'atencao', texto: `Despesa com pessoal em ${pct(indicePessoal)} (${relExec.periodo})${indicePessoal > 54 ? ': acima do limite de 54%' : ': acima do limite prudencial de 51,3%'}`, acao: () => setActiveView('relatorio_executivo') });
  if (c.vencidosAbertos.length)
    alertas.push({ nivel: 'urgente', texto: `${c.vencidosAbertos.length} contrato(s) com vigência encerrada ainda marcados como vigentes`, acao: () => irContratos('vencido') });
  if (c.vencendo30.length)
    alertas.push({ nivel: c.vencendo30.some(x => x.dias <= 7) ? 'urgente' : 'atencao', texto: `${c.vencendo30.length} contrato(s) vencem nos próximos 30 dias`, acao: () => irContratos('vencendo30') });
  if (c.consumo90.length)
    alertas.push({ nivel: 'atencao', texto: `${c.consumo90.length} contrato(s) com 90% ou mais do valor consumido`, acao: () => irContratos('consumo90') });
  if (p.concluidosIncompletos.length)
    alertas.push({ nivel: 'urgente', texto: `${p.concluidosIncompletos.length} processo(s) concluído(s) com documentos pendentes`, acao: () => setActiveView('checklists') });
  if (p.parados.length)
    alertas.push({ nivel: 'atencao', texto: `${p.parados.length} processo(s) em aberto há mais de 15 dias`, acao: () => setActiveView('checklists') });
  if (fr?.revisao.length)
    alertas.push({ nivel: 'atencao', texto: `${fr.revisao.length} veículo(s) com revisão vencida pela quilometragem`, acao: () => setActiveView('frota') });
  if (d.aguardando)
    alertas.push({ nivel: 'atencao', texto: `${d.aguardando} diária(s) aguardando aprovação`, acao: () => setActiveView('diarias') });
  alertas.sort((a, b) => (a.nivel === 'urgente' ? 0 : 1) - (b.nivel === 'urgente' ? 0 : 1));

  const temGrafico = chartData.some(m => (m.combustivel || 0) + (m.diarias || 0) + (m.processos || 0) > 0);
  const periodo = chartData.length ? `${chartData[0].name} a ${chartData[chartData.length - 1].name}` : '';

  const exportarLogs = () => {
    if (!auditItems.length) { addNotification('Aviso', 'Não há registros para exportar.', 'info'); return; }
    generateAuditLogsPDF(auditItems, systemSettings);
    addNotification('Sucesso', 'Relatório de registros gerado.', 'success');
  };

  const statusProc = [
    { k: 'em_analise', label: 'Em análise', cor: 'bg-blue-500' },
    { k: 'pendente', label: 'Pendente', cor: 'bg-rose-500' },
    { k: 'atencao', label: 'Atenção', cor: 'bg-amber-500' },
    { k: 'concluido', label: 'Concluído', cor: 'bg-emerald-500' },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div id="dashboard-content" className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">

          {/* Cabeçalho */}
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight">Painel de Controle</h1>
              <p className="text-text-secondary text-sm font-medium">
                {systemSettings?.entidadeFilha ? `${systemSettings.entidadeFilha} · ` : ''}Situação de hoje e movimentação de {periodo || 'período selecionado'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={dashboardDateRange} onChange={e => setDashboardDateRange(e.target.value)}
                className="bg-surface border border-border rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest outline-none focus:border-primary">
                <option value="3months">Últimos 3 meses</option>
                <option value="6months">Últimos 6 meses</option>
                <option value="12months">Últimos 12 meses</option>
                <option value="custom">Período personalizado</option>
              </select>
              {dashboardDateRange === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input type="date" value={dashboardStartDate} onChange={e => setDashboardStartDate(e.target.value)}
                    className="bg-surface border border-border rounded-xl px-2 py-1.5 text-xs font-bold outline-none focus:border-primary" />
                  <span className="text-xs text-text-secondary font-bold">até</span>
                  <input type="date" value={dashboardEndDate} onChange={e => setDashboardEndDate(e.target.value)}
                    className="bg-surface border border-border rounded-xl px-2 py-1.5 text-xs font-bold outline-none focus:border-primary" />
                </div>
              )}
              {onRefresh && (
                <button onClick={onRefresh} disabled={isRefreshing} title="Atualizar dados"
                  className="p-2 bg-surface border border-border rounded-xl hover:bg-surface-hover disabled:opacity-50">
                  <RefreshCw size={16} className={cn('text-text-secondary', isRefreshing && 'animate-spin')} />
                </button>
              )}
              <button onClick={exportarLogs} title="Exportar registros de atividade (PDF)"
                className="p-2 bg-surface border border-border rounded-xl hover:bg-surface-hover"><Download size={16} className="text-text-secondary" /></button>
              <button onClick={() => setActiveView('relatorio_executivo')}
                className="px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest btn-primary flex items-center gap-2">
                <FileText size={14} /> Relatório Executivo
              </button>
            </div>
          </header>

          {/* Pontos de atenção */}
          {alertas.length > 0 ? (
            <section className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-600" />
                <h2 className="text-xs font-black uppercase tracking-widest">Pontos de atenção ({alertas.length})</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                {alertas.map((a, i) => (
                  <button key={i} onClick={a.acao}
                    className={cn('flex items-center justify-between gap-3 text-left px-3 py-2.5 rounded-xl border text-sm font-bold transition-colors',
                      a.nivel === 'urgente' ? 'border-rose-500/30 bg-rose-500/5 text-rose-700 hover:bg-rose-500/10'
                        : 'border-amber-500/30 bg-amber-500/5 text-amber-800 hover:bg-amber-500/10')}>
                    <span className="flex items-center gap-2"><span className={cn('w-1.5 h-1.5 rounded-full shrink-0', a.nivel === 'urgente' ? 'bg-rose-500' : 'bg-amber-500')} />{a.texto}</span>
                    <ChevronRight size={16} className="shrink-0 opacity-60" />
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="glass-card p-4 flex items-center gap-3 text-sm font-bold text-emerald-700 border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 size={18} /> Nenhum ponto de atenção nos dados cadastrados.
            </section>
          )}

          {/* Indicadores */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
            <Kpi titulo="Contratos vigentes" valor={num(c.vigentes.length)} icone={<Database size={18} />}
              sub={<>Valor total {brlCurto(c.valor)}</>} onClick={() => irContratos('vigente')} />
            <Kpi titulo="Saldo contratual" valor={brlCurto(c.saldo)} icone={<Wallet size={18} />}
              tom={c.exec >= 90 ? 'alerta' : 'normal'} sub={<>{pct(c.exec)} executado</>} onClick={() => irContratos('all')} />
            <Kpi titulo="Processos no período" valor={num(p.total)} icone={<ClipboardCheck size={18} />}
              tom={p.concluidosIncompletos.length ? 'ruim' : p.parados.length ? 'alerta' : 'normal'}
              sub={<>{num(p.total - (p.porStatus.concluido || 0))} em aberto · {brlCurto(p.valor)}</>} onClick={() => setActiveView('checklists')} />
            <Kpi titulo="Combustível no período" valor={brlCurto(f.valor)} icone={<Fuel size={18} />}
              sub={<>{num(f.litros)} litros · {num(f.veiculos)} veículos</>} onClick={() => setActiveView('combustivel')} />
            <Kpi titulo="Diárias no período" valor={brlCurto(d.valor)} icone={<Plane size={18} />}
              tom={d.aguardando ? 'alerta' : 'normal'} sub={<>{num(d.qtd)} diária(s){d.aguardando ? ` · ${d.aguardando} aguardando` : ''}</>} onClick={() => setActiveView('diarias')} />
            <Kpi titulo="Despesa com pessoal" icone={<Users size={18} />} tom={tomPessoal}
              valor={indicePessoal !== undefined ? pct(indicePessoal) : '—'}
              sub={indicePessoal !== undefined ? <>{pessoal?.indice_12m !== undefined ? '12 meses' : 'no mês'} · {relExec.periodo} · limite 54%</> : 'Gere e salve o Relatório Executivo'}
              onClick={() => setActiveView('relatorio_executivo')} />
          </div>

          {/* Gráfico + processos */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
            <Painel titulo="Despesas acompanhadas por mês" sub="Combustível, diárias e notas fiscais dos processos de pagamento" className="xl:col-span-2">
              {temGrafico ? (
                <div className="h-[300px] md:h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} width={64} tickFormatter={v => brlCurto(v).replace('R$ ', '')} />
                      <Tooltip formatter={(v: any) => brl(Number(v))} cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                      <Bar dataKey="combustivel" name="Combustível" stackId="a" fill={COR.combustivel} />
                      <Bar dataKey="diarias" name="Diárias" stackId="a" fill={COR.diarias} />
                      <Bar dataKey="processos" name="Processos (NF)" stackId="a" fill={COR.processos} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <Vazio texto="Sem lançamentos no período selecionado." />}
            </Painel>

            <Painel titulo="Processos de pagamento" sub="Por situação, no período" acao={
              <button onClick={() => setActiveView('checklists')} className="text-xs font-bold text-primary hover:underline">Abrir</button>}>
              {p.total ? (
                <div className="space-y-4">
                  {statusProc.map(s => {
                    const n = p.porStatus[s.k] || 0;
                    return (
                      <div key={s.k}>
                        <div className="flex justify-between text-sm font-bold mb-1"><span>{s.label}</span><span>{n}</span></div>
                        <div className="h-2 rounded-full bg-surface-hover overflow-hidden"><div className={cn('h-full rounded-full', s.cor)} style={{ width: `${p.total ? n / p.total * 100 : 0}%` }} /></div>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-border text-xs text-text-secondary space-y-1">
                    <p>Valor das notas no período: <strong className="text-text-primary">{brl(p.valor)}</strong></p>
                    {p.parados.length > 0 && <p className="text-amber-700 font-bold">{p.parados.length} em aberto há mais de 15 dias</p>}
                    {p.concluidosIncompletos.length > 0 && <p className="text-rose-700 font-bold">{p.concluidosIncompletos.length} concluído(s) com documento pendente</p>}
                  </div>
                </div>
              ) : <Vazio texto="Nenhum processo no período." />}
            </Painel>
          </div>

          {/* Listas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            <Painel titulo="Contratos a vencer" sub="Próximos 90 dias" acao={
              <button onClick={() => irContratos('vencendo30')} className="text-xs font-bold text-primary hover:underline">Ver todos</button>}>
              {c.vencendo90.length ? (
                <ul className="divide-y divide-border">
                  {c.vencendo90.slice(0, 6).map(({ ct, dias, total, consumo }) => (
                    <li key={ct.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{ct.vendor}</p>
                        <p className="text-[11px] text-text-secondary">Nº {ct.number} · saldo {brlCurto(Math.max(0, total - consumo))}</p>
                      </div>
                      <span className={cn('text-[11px] font-black px-2 py-1 rounded-lg whitespace-nowrap',
                        dias <= 7 ? 'bg-rose-500/10 text-rose-600' : dias <= 30 ? 'bg-amber-500/10 text-amber-700' : 'bg-surface-hover text-text-secondary')}>
                        {dias === 0 ? 'vence hoje' : `${dias} dia${dias > 1 ? 's' : ''}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <Vazio texto="Nenhum contrato vence nos próximos 90 dias." />}
            </Painel>

            <Painel titulo="Maiores gastos com combustível" sub="Por veículo, no período" acao={
              <button onClick={() => setActiveView('combustivel')} className="text-xs font-bold text-primary hover:underline">Abrir</button>}>
              {f.top.length ? (
                <ul className="space-y-3">
                  {f.top.map((v, i) => (
                    <li key={i}>
                      <div className="flex justify-between gap-3 text-sm"><span className="font-bold truncate">{v.nome}</span><span className="font-black whitespace-nowrap">{brl(v.valor, 0)}</span></div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden"><div className="h-full rounded-full" style={{ width: `${f.top[0].valor ? v.valor / f.top[0].valor * 100 : 0}%`, backgroundColor: COR.combustivel }} /></div>
                        <span className="text-[11px] text-text-secondary w-20 text-right">{num(v.litros)} L</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <Vazio texto="Sem abastecimentos no período." />}
            </Painel>

            <Painel titulo="Frota municipal" sub="Situação atual" acao={
              <button onClick={() => setActiveView('frota')} className="text-xs font-bold text-primary hover:underline">Abrir</button>}>
              {fr === null ? <Vazio texto="Carregando..." /> : fr.total ? (
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2"><Truck size={18} className="text-primary" /><span className="text-2xl font-black">{fr.total}</span><span className="text-sm text-text-secondary font-bold">veículos</span></div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[['Em dia', fr.em_dia, 'text-emerald-600'], ['Em uso', fr.em_uso, 'text-sky-600'], ['Em manutenção', fr.manutencao, 'text-amber-600'], ['Parados', fr.parado, 'text-rose-600']].map(([l, n, cor]) => (
                      <div key={l as string} className="rounded-xl border border-border p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{l}</p>
                        <p className={cn('text-xl font-black', cor as string)}>{n as number}</p>
                      </div>
                    ))}
                  </div>
                  {fr.revisao.length > 0 && <p className="text-xs font-bold text-amber-700">{fr.revisao.length} com revisão vencida: {fr.revisao.slice(0, 4).map(v => v.placa).join(', ')}{fr.revisao.length > 4 ? '…' : ''}</p>}
                </div>
              ) : <Vazio texto="Nenhum veículo cadastrado. Importe a frota do SIGA." />}
            </Painel>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;