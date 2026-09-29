import React, { useState } from 'react';
import { Upload, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { FuelRecord, User } from '../types';
import { formatCurrency } from '../utils/format';
import { lerConsumoSiga, normalizarPlaca, RelatorioConsumoSiga } from '../utils/sigaCombustivel';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const litrosBR = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Mês (nome) e ano de um lançamento, como a tela de combustível usa. */
const mesAnoDo = (r: FuelRecord): { mes: string; ano: string } => {
  let mes = (r.month || '').trim().toLowerCase(), ano = '';
  if (r.date) {
    try {
      const d = parseISO(r.date);
      if (!isNaN(d.getTime())) { ano = String(d.getFullYear()); if (!mes) mes = format(d, 'MMMM', { locale: ptBR }).toLowerCase(); }
    } catch { /* data inválida */ }
  }
  return { mes, ano };
};

interface Props {
  currentUser: User;
  fuelRecords: FuelRecord[];
  onImportado: () => void;
  compacto?: boolean; // ícone só (barra do celular)
}

export function ImportarCombustivelSiga({ currentUser, fuelRecords, onImportado, compacto }: Props) {
  const [aberto, setAberto] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [rel, setRel] = useState<(RelatorioConsumoSiga & { arquivo: string }) | null>(null);
  const [competencia, setCompetencia] = useState('');
  const [frota, setFrota] = useState<Map<string, string>>(new Map());
  const [modo, setModo] = useState<'siga' | 'todos'>('siga');

  const abrir = async () => {
    setAberto(true); setRel(null); setErro(''); setModo('siga');
    // nomes da Frota Municipal, para mostrar "Hilux (PLACA)" em vez de só a placa
    const { data } = await supabase.from('frota').select('placa, nome').eq('prefeituraId', currentUser.prefeituraId);
    setFrota(new Map((data || []).map((v: any) => [normalizarPlaca(v.placa), v.nome])));
  };

  const ler = async (file?: File) => {
    if (!file) return;
    setLendo(true); setErro('');
    try {
      const r = await lerConsumoSiga(file);
      setRel({ ...r, arquivo: file.name });
      setCompetencia(r.competencia || format(new Date(), 'yyyy-MM'));
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível ler o PDF.');
    } finally {
      setLendo(false);
    }
  };

  const [ano, mesNum] = competencia.split('-');
  const mesNome = mesNum ? MESES[Number(mesNum) - 1] : '';
  const marcaSiga = `SIGA ${mesNum}/${ano}`;
  const doMes = fuelRecords.filter(r => { const m = mesAnoDo(r); return m.mes === mesNome && (!m.ano || m.ano === ano); });
  const doMesSiga = doMes.filter(r => (r.sheet || '').startsWith('SIGA'));
  const doMesOutros = doMes.length - doMesSiga.length;
  const aApagar = modo === 'todos' ? doMes : doMesSiga;
  const totalLitros = rel?.linhas.reduce((a, l) => a + l.litros, 0) || 0;
  const totalValor = rel?.linhas.reduce((a, l) => a + l.valor, 0) || 0;
  const foraDaFrota = rel && frota.size ? rel.linhas.filter(l => !frota.has(l.placaNorm)) : [];

  const importar = async () => {
    if (!rel || !competencia) return;
    setSalvando(true); setErro('');
    try {
      const registros: any[] = rel.linhas.map(l => {
        const nome = frota.get(l.placaNorm);
        return {
          prefeituraId: currentUser.prefeituraId || '1',
          vehicle: nome ? `${nome} (${l.placa.toUpperCase()})` : l.placa.toUpperCase(),
          plate: l.placa.toUpperCase(),
          driver: '',
          date: `${ano}-${mesNum}-01`,
          month: mesNome,
          quantity: String(l.litros),
          cost: formatCurrency(l.valor),
          unitPrice: l.litros ? formatCurrency(l.valor / l.litros) : '',
          fuelType: l.combustivel,
          status: 'concluido',
          sheet: marcaSiga,
        };
      });

      // insere primeiro; só depois apaga os antigos (se a inserção falhar, nada se perde)
      let semColunaSheet = false;
      const inserir = async (dados: any[]) => {
        for (let i = 0; i < dados.length; i += 100) {
          const { error } = await supabase.from('fuelRecords').insert(dados.slice(i, i + 100));
          if (error) throw error;
        }
      };
      try {
        await inserir(registros);
      } catch (e: any) {
        if (!/sheet/i.test(e?.message || '')) throw e;
        semColunaSheet = true;
        await inserir(registros.map(({ sheet, ...r }) => r));
      }
      if (aApagar.length) {
        const ids = aApagar.map(r => r.id);
        for (let i = 0; i < ids.length; i += 200) {
          const { error } = await supabase.from('fuelRecords').delete().in('id', ids.slice(i, i + 200));
          if (error) throw error;
        }
      }
      onImportado();
      setAberto(false);
      if (semColunaSheet) alert('Importado. Para o NEXUM reconhecer esta importação numa próxima substituição, rode o arquivo supabase_update_combustivel_siga.sql no Supabase.');
    } catch (e: any) {
      console.error('Erro ao importar consumo do SIGA:', e);
      setErro(`Erro ao gravar: ${e?.message || 'verifique sua permissão'}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      {compacto ? (
        <button onClick={abrir} title="Importar do SIGA"
          className="p-2 rounded-full hover:bg-surface-hover text-text-secondary active:scale-95 transition-colors">
          <Upload size={18} />
        </button>
      ) : (
        <button onClick={abrir} title="Importar o relatório Consumo Combustível do SIGA"
          className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs btn-surface">
          <Upload size={15} />
          <span>SIGA</span>
        </button>
      )}

      <AnimatePresence>
        {aberto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !salvando && setAberto(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-background border border-border rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Importar consumo do SIGA</h3>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">
                    {rel ? `${rel.unidade} · emitido em ${rel.emissao}` : 'Relatórios › Consumo Combustível (PDF)'}
                  </p>
                </div>
                <button onClick={() => setAberto(false)} disabled={salvando} className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {erro && <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-600">{erro}</div>}

                {!rel ? (
                  <label className="block rounded-3xl border-2 border-dashed border-border p-10 text-center cursor-pointer hover:border-primary hover:bg-surface-hover/40 transition-all"
                    onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); ler(e.dataTransfer.files[0]); }}>
                    <input type="file" accept=".pdf" className="hidden" onChange={e => { ler(e.target.files?.[0]); e.target.value = ''; }} />
                    {lendo ? <Loader2 size={30} className="mx-auto text-primary animate-spin" /> : <Upload size={30} className="mx-auto text-text-secondary" />}
                    <p className="mt-3 font-black">{lendo ? 'Lendo o relatório...' : 'Arraste o PDF "Consumo Combustível" do SIGA'}</p>
                    <p className="text-xs text-text-secondary mt-1">ou clique para escolher. Um arquivo por mês.</p>
                  </label>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-4 gap-3">
                      <label className="rounded-2xl border border-border p-3 space-y-1">
                        <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Competência</span>
                        <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)}
                          className="w-full bg-transparent font-black outline-none" />
                      </label>
                      <div className="rounded-2xl border border-border p-3">
                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Veículos</p>
                        <p className="text-xl font-black">{rel.linhas.length}</p>
                      </div>
                      <div className="rounded-2xl border border-border p-3">
                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Litros</p>
                        <p className="text-xl font-black">{litrosBR(totalLitros)}</p>
                      </div>
                      <div className="rounded-2xl border border-border p-3">
                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Valor</p>
                        <p className="text-xl font-black">{formatCurrency(totalValor)}</p>
                      </div>
                    </div>

                    {rel.totalInformado !== null && Math.abs(rel.totalInformado - totalValor) <= 0.05 && (
                      <p className="flex items-center gap-2 text-xs text-emerald-600 font-bold"><CheckCircle2 size={14} /> Soma das linhas confere com o Valor Total do SIGA.</p>
                    )}
                    {rel.competencia && competencia !== rel.competencia && (
                      <p className="flex items-center gap-2 text-xs text-amber-600 font-bold"><AlertTriangle size={14} /> O arquivo é de {rel.competencia.split('-').reverse().join('/')}; você escolheu outro mês.</p>
                    )}
                    {rel.avisos.map((a, i) => <p key={i} className="flex items-center gap-2 text-xs text-amber-600"><AlertTriangle size={14} /> {a}</p>)}

                    {doMes.length > 0 && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2 text-sm">
                        <p className="font-bold">Já existem {doMes.length} lançamento(s) em {mesNome}/{ano}
                          {doMesSiga.length ? ` (${doMesSiga.length} de importação anterior do SIGA)` : ''}.</p>
                        {doMesSiga.length > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={modo === 'siga'} onChange={() => setModo('siga')} />
                            Substituir só a importação anterior do SIGA ({doMesSiga.length}){doMesOutros ? ` e manter os outros ${doMesOutros}` : ''}
                          </label>
                        )}
                        {doMesSiga.length === 0 && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={modo === 'siga'} onChange={() => setModo('siga')} />
                            Manter os lançamentos existentes e adicionar os do SIGA
                          </label>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" checked={modo === 'todos'} onChange={() => setModo('todos')} />
                          Substituir todos os {doMes.length} lançamentos de {mesNome}/{ano} pelo SIGA
                        </label>
                        {modo === 'siga' && doMesOutros > 0 && (
                          <p className="text-xs text-amber-700">Atenção: se os lançamentos existentes forem do mesmo consumo, o mês ficará em dobro.</p>
                        )}
                      </div>
                    )}

                    {foraDaFrota.length > 0 && (
                      <div className="rounded-2xl border border-border bg-surface-hover/30 p-4 text-xs text-text-secondary">
                        <p className="font-bold text-text-primary">{foraDaFrota.length} placa(s) abastecida(s) não estão cadastradas na Frota Municipal do NEXUM:</p>
                        <p className="mt-1">{foraDaFrota.map(l => l.placa.toUpperCase()).join(', ')}</p>
                        <p className="mt-1">A importação grava assim mesmo, pela placa. Vale conferir se são veículos da prefeitura.</p>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-surface-hover/50 text-[10px] uppercase tracking-widest text-text-secondary">
                          <tr><th className="p-2.5 text-left">Veículo</th><th className="p-2.5 text-left">Combustível</th><th className="p-2.5 text-right">Litros</th><th className="p-2.5 text-right">Valor</th><th className="p-2.5 text-right">R$/L</th></tr>
                        </thead>
                        <tbody>
                          {rel.linhas.map((l, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="p-2.5 font-bold">{frota.get(l.placaNorm) ? <>{frota.get(l.placaNorm)} <span className="text-text-secondary font-normal">({l.placa.toUpperCase()})</span></> : l.placa.toUpperCase()}</td>
                              <td className="p-2.5">{l.combustivel}</td>
                              <td className="p-2.5 text-right">{litrosBR(l.litros)}</td>
                              <td className="p-2.5 text-right">{formatCurrency(l.valor)}</td>
                              <td className="p-2.5 text-right text-text-secondary">{l.litros ? formatCurrency(l.valor / l.litros) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {rel && (
                <div className="p-5 border-t border-border flex flex-wrap justify-between items-center gap-3">
                  <button onClick={() => setRel(null)} className="text-xs font-bold text-text-secondary hover:text-primary">Trocar arquivo ({rel.arquivo})</button>
                  <button onClick={importar} disabled={salvando || !competencia}
                    className={cn("flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-primary hover:bg-primary/90 disabled:opacity-40")}>
                    {salvando && <Loader2 size={14} className="animate-spin" />}
                    Importar {rel.linhas.length} lançamento(s) em {mesNome}/{ano}{aApagar.length ? ` · substitui ${aApagar.length}` : ''}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
