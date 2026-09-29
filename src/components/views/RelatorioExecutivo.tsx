import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileBarChart, 
  Upload, 
  Printer, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  ChevronRight,
  FileDown,
  FileText,
  FileSearch,
  Save,
  History,
  Trash2,
  CalendarDays
} from 'lucide-react';
import { Circle, X, Loader2, ChevronDown } from 'lucide-react';
import { generateMultiPagePDF } from '../../utils/pdf';
import { useAuth } from '../../hooks/useAuth';
import { analyzeDataForReport } from '../../services/geminiService';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
// Se a importação do SIGA falhar, só a aba mostra o erro; o resto do sistema continua funcionando.

class SigaBoundary extends React.Component<{ children: React.ReactNode }, { erro: string | null }> {
  state = { erro: null as string | null };
  static getDerivedStateFromError(e: any) { return { erro: e?.message || String(e) }; }
  componentDidCatch(e: any) { console.error('Erro na importação do SIGA:', e); }
  render() {
    if (this.state.erro) return (
      <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm text-left">
        <strong>Não foi possível abrir a importação do SIGA.</strong><br />
        Detalhe técnico: {this.state.erro}
      </div>
    );
    return (this as any).props.children;
  }
}

const MAX_PDF_MB = 30;          // limite seguro para envio ao servidor (express aceita 50mb em base64)
const MAX_TEXT_CHARS = 400_000; // evita estourar o limite de requisição com planilhas gigantes

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};


interface RelatorioExecutivoProps {
  addNotification?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function RelatorioExecutivo({ addNotification }: RelatorioExecutivoProps) {
  const [reportData, setReportData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportStatus, setPdfExportStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<'siga' | 'ia'>('siga');
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentUser } = useAuth();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('relatorios_executivos')
        .select('*')
        .order('competencia', { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message?.includes('relatorios_executivos')) {
          console.warn('Tabela relatorios_executivos não encontrada.');
          setHistory([]);
        } else {
          throw error;
        }
      } else if (data) {
        setHistory(data);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  const handleSave = async () => {
    if (!reportData) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('relatorios_executivos')
        .upsert({
          competencia: reportData.competencia,
          periodo: reportData.periodo,
          data: reportData,
          created_at: new Date().toISOString()
        }, { onConflict: 'competencia' });

      if (error) throw error;
      if (addNotification) addNotification("Sucesso", `Relatório de ${reportData.periodo} salvo com sucesso!`, "success");
      loadHistory();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      if (addNotification) addNotification("Erro", 'Erro ao salvar relatório. Verifique se a tabela relatorios_executivos foi criada no Supabase.', "error");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteReport = async (id: string) => {
    if (currentUser?.role === 'visualizador') {
      if (addNotification) addNotification("Acesso Negado", 'Você não tem permissão para excluir relatórios.', "error");
      return;
    }
    try {
      await supabase.from('relatorios_executivos').delete().eq('id', id);
      loadHistory();
      if (addNotification) addNotification("Sucesso", "Relatório excluído com sucesso!", "success");
      setReportToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir:', err);
      if (addNotification) addNotification("Erro", "Falha ao excluir relatório.", "error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // limpa o input para permitir selecionar o MESMO arquivo novamente
    e.target.value = '';
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const name = file.name.toLowerCase();
      const buffer = await file.arrayBuffer();

      if (name.endsWith('.pdf')) {
        if (file.size > MAX_PDF_MB * 1024 * 1024) {
          throw new Error(`O PDF tem ${(file.size / 1024 / 1024).toFixed(1)} MB. O limite é ${MAX_PDF_MB} MB — envie apenas as páginas do balancete/RREO/RGF.`);
        }
        const analysis = await analyzeDataForReport({
          kind: 'pdf',
          base64: arrayBufferToBase64(buffer),
          fileName: file.name
        });
        setReportData(analysis);
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
        const wb = XLSX.read(buffer, { type: 'array' });
        // Lê TODAS as abas em formato CSV (planilhas contábeis têm títulos e células mescladas,
        // que ficam ilegíveis com sheet_to_json)
        let text = wb.SheetNames.map((sheetName) => {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { blankrows: false, strip: true });
          return `### ABA: ${sheetName}\n${csv}`;
        }).join('\n\n');

        if (!text.replace(/[#,\s]/g, '').length) {
          throw new Error('A planilha parece estar vazia.');
        }
        if (text.length > MAX_TEXT_CHARS) {
          text = text.slice(0, MAX_TEXT_CHARS) + '\n[...conteúdo truncado por tamanho...]';
        }

        const analysis = await analyzeDataForReport({ kind: 'text', text, fileName: file.name });
        setReportData(analysis);
      } else {
        throw new Error('Formato não suportado. Envie um arquivo .xlsx, .xls, .csv ou .pdf.');
      }
    } catch (err: any) {
      console.error("Erro ao processar arquivo:", err);
      setError(err.message || "Não foi possível processar o arquivo. Verifique se o formato é suportado e se o conteúdo é válido.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    setIsExportingPdf(true);
    setPdfExportStatus('Iniciando exportação...');

    try {
      const filename = `relatorio_executivo_${reportData.periodo?.replace(/\//g, '_') || 'mensal'}.pdf`;
      await generateMultiPagePDF('relatorio-executivo-content', filename, (msg) => {
        setPdfExportStatus(msg);
      });
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      if (addNotification) addNotification("Erro", 'Erro ao gerar PDF: ' + (err.message || 'Erro desconhecido'), "error");
    } finally {
      setIsExportingPdf(false);
      setPdfExportStatus(null);
    }
  };

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || isNaN(Number(val))) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  };

  const formatCompact = (val: any) => {
    if (val === undefined || val === null || isNaN(Number(val))) return 'R$ 0,00';
    const num = Number(val);
    if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(2)} M`;
    if (num >= 1000) return `R$ ${(num / 1000).toFixed(0)} K`;
    return formatCurrency(num);
  };

  if (reportData) {
    const r = reportData;
    const pct = (v: any) => (v === null || v === undefined || isNaN(Number(v)) ? 'N/D' : `${Number(v).toFixed(2).replace('.', ',')}%`);
    const has = (v: any) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);

    // ---- Conferência automática (recalcula os índices e totais) ----
    const indices = (r.indices_constitucionais || []).filter((i: any) => i && has(i.base_calculo) && has(i.valor_aplicado)).map((i: any) => {
      const base = Number(i.base_calculo) || 0;
      const aplicado = Number(i.valor_aplicado) || 0;
      const minimo = base * (Number(i.percentual_minimo) || 0) / 100;
      const perc = base > 0 ? (aplicado / base) * 100 : 0;
      const dif = aplicado - minimo;
      const informado = Number(i.percentual_aplicado);
      const divergente = !isNaN(informado) && Math.abs(informado - perc) > 0.1;
      return { ...i, base, aplicado, minimo, perc, dif, ok: dif >= 0, divergente, informado };
    });

    const checks: { secao: string; descricao: string }[] = [...(r.divergencias || [])];
    indices.filter((i: any) => i.divergente).forEach((i: any) => checks.push({
      secao: i.nome,
      descricao: `Percentual informado ${pct(i.informado)}, mas ${formatCurrency(i.aplicado)} ÷ ${formatCurrency(i.base)} = ${pct(i.perc)}.`
    }));
    const secs = r.processos?.por_secretaria || [];
    const comQtd = secs.some((x: any) => x.liq_qtd !== null && x.liq_qtd !== undefined);
    if (secs.length && has(r.processos?.liquidados_valor)) {
      const soma = secs.reduce((a: number, s: any) => a + (Number(s.liq_valor) || 0), 0);
      if (Math.abs(soma - Number(r.processos.liquidados_valor)) > 1) checks.push({
        secao: 'Processos Liquidados', descricao: `Soma das secretarias (${formatCurrency(soma)}) difere do total (${formatCurrency(r.processos.liquidados_valor)}).`
      });
    }
    if (has(r.processos?.liquidados_valor) && has(r.resumo_geral?.despesa_liquidada) &&
        Math.abs(Number(r.processos.liquidados_valor) - Number(r.resumo_geral.despesa_liquidada)) > 1) {
      checks.push({ secao: 'Processos x Execução', descricao: `Liquidado por processos (${formatCurrency(r.processos.liquidados_valor)}) difere do liquidado na execução orçamentária (${formatCurrency(r.resumo_geral.despesa_liquidada)}).` });
    }

    let secaoCount = 0;
    const next = () => ++secaoCount; // numeração calculada no componente pai (seguro com StrictMode)
    const Secao = ({ titulo, num, children }: { titulo: string; num: number; children: React.ReactNode }) => {
      return (
        <div className="report-secao">
          <div className="report-secao-cabecalho">
            <div className="report-secao-num">{String(num).padStart(2, '0')}</div>
            <div className="report-secao-titulo">{titulo}</div>
          </div>
          {children}
        </div>
      );
    };
    const Texto = ({ t }: { t?: string }) => t ? <div className="report-texto">{t.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div> : null;
    const Acao = ({ t }: { t?: string }) => t ? <div className="report-acao"><strong>Ações de Correção:</strong> {t}</div> : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Relatório Executivo</h1>
            <p className="text-slate-500 font-medium">{reportData?.origem === 'siga' ? 'Relatório mensal de controle interno gerado a partir dos dados do SIGA.' : 'Relatório mensal de controle interno gerado via IA.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setReportData(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
              <RefreshCw size={18} /> Novo Relatório
            </button>
            {currentUser?.role !== 'visualizador' && (
              <button onClick={handleSave} disabled={isSaving} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50">
                <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Competência'}
              </button>
            )}
            <button 
              onClick={handleDownloadPdf} 
              disabled={isExportingPdf}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
            >
              {isExportingPdf ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span className="text-[10px] uppercase">{pdfExportStatus || 'Gerando...'}</span>
                </>
              ) : (
                <>
                  <FileDown size={18} /> Baixar PDF
                </>
              )}
            </button>
            <button onClick={handlePrint} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
              <Printer size={18} /> Imprimir
            </button>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');
          .report-root { --azul:#0d2d5e; --azul-md:#1a4a8a; --azul-lt:#e6edf8; --ouro:#b8922a; --verde:#155f3a; --verde-lt:#e3f4eb;
            --vermelho:#b52222; --vermelho-lt:#fbeaea; --laranja:#c96a00; --laranja-lt:#fef3e2; --cinza:#f5f6f8; --borda:#dde2ea; --txt:#1a2535; --txt2:#4b5870; }
          .report-root * { box-sizing: border-box; }
          .report-root { font-family:'Source Sans 3',sans-serif; font-size:14px; color:var(--txt); background:#fff; line-height:1.65; max-width:960px; margin:0 auto; }
          .report-capa { background:var(--azul); color:#fff; }
          .report-capa-topo { background:var(--ouro); height:6px; }
          .report-capa-corpo { padding:44px 60px 40px; }
          .report-capa-rotulo { font-size:11px; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:var(--ouro); margin-bottom:12px; }
          .report-capa h1 { font-family:'Playfair Display',serif; font-size:46px; font-weight:700; line-height:1.1; margin-bottom:8px; }
          .report-capa-sub { font-size:15px; opacity:.8; margin-bottom:36px; }
          .report-capa-rodape { border-top:1px solid rgba(255,255,255,.15); padding-top:22px; display:flex; gap:36px; flex-wrap:wrap; }
          .report-capa-label { font-size:10px; text-transform:uppercase; letter-spacing:.1em; opacity:.55; margin-bottom:3px; }
          .report-capa-val { font-size:13px; font-weight:500; }
          .report-faixa-alerta { background:var(--vermelho); color:#fff; padding:12px 60px; font-size:13px; font-weight:500; }
          .report-corpo { padding:0 60px 60px; }
          .report-secao { padding-top:40px; break-inside:avoid-page; }
          .report-secao-cabecalho { display:flex; align-items:center; gap:14px; margin-bottom:18px; padding-bottom:12px; border-bottom:2.5px solid var(--azul-lt); }
          .report-secao-num { width:34px; height:34px; background:var(--azul); color:#fff; border-radius:9px; font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
          .report-secao-titulo { font-family:'Playfair Display',serif; font-size:21px; font-weight:700; color:var(--azul); }
          .report-sub { font-weight:700; color:var(--azul); font-size:15px; margin:24px 0 10px; }
          .report-texto p { margin:0 0 10px; text-align:justify; }
          .report-acao { margin-top:10px; padding:10px 14px; background:var(--cinza); border-left:4px solid var(--ouro); border-radius:6px; font-size:13px; }
          .report-mgrid { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); margin:14px 0; }
          .report-mcard { background:var(--cinza); border:1px solid var(--borda); border-radius:12px; padding:14px 16px; }
          .report-mcard.azul { background:var(--azul); border-color:var(--azul); color:#fff; }
          .report-mlabel { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.09em; color:var(--txt2); margin-bottom:6px; }
          .report-mcard.azul .report-mlabel { color:rgba(255,255,255,.65); }
          .report-mval { font-size:19px; font-weight:600; line-height:1.15; }
          .report-box { border-radius:10px; padding:14px 18px; margin:12px 0; border:1px solid; border-left-width:4px; }
          .report-box-crit { background:var(--vermelho-lt); border-color:#f2b8b8; border-left-color:var(--vermelho); }
          .report-box-ok { background:var(--verde-lt); border-color:#b5dcc6; border-left-color:var(--verde); }
          .report-box-warn { background:var(--laranja-lt); border-color:#f3d2a4; border-left-color:var(--laranja); }
          .report-tabela-wrap { overflow-x:auto; margin:10px 0; }
          .report-tabela { width:100%; border-collapse:collapse; font-size:12.5px; }
          .report-tabela th { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.07em; color:var(--txt2); padding:8px 10px; background:var(--cinza); border-bottom:1px solid var(--borda); text-align:left; }
          .report-tabela td { padding:8px 10px; border-bottom:1px solid var(--borda); vertical-align:top; }
          .report-tabela .num { text-align:right; white-space:nowrap; }
          .report-tabela tr.total td { font-weight:700; background:var(--azul-lt); }
          .report-tabela tr.grupo td { font-weight:700; }
          .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:800; text-transform:uppercase; }
          .badge-ok { background:#d1fae5; color:#047857; } .badge-crit { background:#ffe4e6; color:#be123c; }
          .report-assin { margin-top:60px; text-align:center; }
          .report-assin-linha { width:320px; margin:0 auto 6px; border-top:1px solid var(--txt); }
          @media print {
            body * { visibility:hidden; }
            .report-root, .report-root * { visibility:visible; }
            .report-root { position:absolute; left:0; top:0; border:none !important; box-shadow:none !important; }
            .report-capa, .report-faixa-alerta, .report-tabela th, .report-mcard, .report-box, .report-acao { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          }
        `}} />

        <div id="relatorio-executivo-content" className="report-root border border-slate-200 rounded-3xl overflow-hidden shadow-2xl">
          {/* CAPA */}
          <div className="report-capa">
            <div className="report-capa-topo"></div>
            <div className="report-capa-corpo">
              <div className="report-capa-rotulo">Relatório Mensal de Controle Interno · Res. TCM-BA nº 1.120/2005</div>
              <h1>{r.periodo}</h1>
              <div className="report-capa-sub">
                Prefeitura Municipal de Coaraci — BA · Controladoria-Geral do Município<br />
                Destinatário: Exmo. Sr. Prefeito <strong>Milton Dias Cerqueira Micheli Santos</strong>
              </div>
              <div className="report-capa-rodape">
                <div><div className="report-capa-label">Elaborado por</div><div className="report-capa-val">Igor Silva Soares Carvalho</div></div>
                <div><div className="report-capa-label">Cargo</div><div className="report-capa-val">Controlador-Geral do Município</div></div>
                <div><div className="report-capa-label">Emissão</div><div className="report-capa-val">{new Date().toLocaleDateString('pt-BR')}</div></div>
              </div>
            </div>
          </div>
          {r.alerta_capa && <div className="report-faixa-alerta">⚠ {r.alerta_capa}</div>}

          <div className="report-corpo">
            <Secao num={next()} titulo="Painel do Mês">
              <div className="report-mgrid">
                <div className="report-mcard azul"><div className="report-mlabel">Receita arrecadada</div><div className="report-mval">{formatCompact(r.resumo_geral?.receita_arrecadada ?? r.receita?.arrecadada_liquida)}</div></div>
                <div className="report-mcard"><div className="report-mlabel">Empenhado</div><div className="report-mval">{formatCompact(r.resumo_geral?.despesa_empenhada)}</div></div>
                <div className="report-mcard"><div className="report-mlabel">Liquidado</div><div className="report-mval">{formatCompact(r.resumo_geral?.despesa_liquidada)}</div></div>
                <div className="report-mcard"><div className="report-mlabel">Pago</div><div className="report-mval">{formatCompact(r.resumo_geral?.despesa_paga)}</div></div>
                <div className="report-mcard"><div className="report-mlabel">RP Processados</div><div className="report-mval">{formatCompact(r.resumo_geral?.restos_a_pagar_processados)}</div></div>
                <div className="report-mcard"><div className="report-mlabel">Pessoal / RCL</div>
                  <div className="report-mval" style={{ color: Number(r.pessoal?.indice ?? r.resumo_geral?.indice_pessoal) > 54 ? 'var(--vermelho)' : 'var(--verde)' }}>{pct(r.pessoal?.indice ?? r.resumo_geral?.indice_pessoal)}</div></div>
              </div>
              {indices.length > 0 && (
                <div className="report-tabela-wrap"><table className="report-tabela">
                  <thead><tr><th>Índice</th><th className="num">Mínimo</th><th className="num">Aplicado</th><th className="num">Diferença</th><th>Situação</th></tr></thead>
                  <tbody>{indices.map((i: any) => (
                    <tr key={i.id || i.nome}><td>{i.nome}</td><td className="num">{i.percentual_minimo}%</td><td className="num">{pct(i.perc)}</td>
                      <td className="num" style={{ color: i.ok ? 'var(--verde)' : 'var(--vermelho)' }}>{formatCurrency(i.dif)}</td>
                      <td><span className={cn('badge', i.ok ? 'badge-ok' : 'badge-crit')}>{i.ok ? 'Cumprido' : 'Não cumprido'}</span></td></tr>
                  ))}</tbody>
                </table></div>
              )}
            </Secao>

            {checks.length > 0 && (
              <div className="print:hidden">
                <div className="report-box report-box-warn" style={{ marginTop: 32 }}>
                  <strong>Conferência automática — revise antes de assinar ({checks.length})</strong>
                  <ul style={{ margin: '8px 0 0 18px', listStyle: 'disc' }}>
                    {checks.map((c, i) => <li key={i}><strong>{c.secao}:</strong> {c.descricao}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {has(r.processos) && (
              <Secao num={next()} titulo="Dos Processos Pagos e Liquidados">
                <Texto t={r.processos.texto} />
                {secs.length > 0 && (
                  <div className="report-tabela-wrap"><table className="report-tabela">
                    <thead><tr><th>Secretaria</th>{comQtd && <th className="num">Qtd. Liq.</th>}<th className="num">Valor Liquidado</th>{comQtd && <th className="num">Qtd. Pag.</th>}<th className="num">Valor Pago</th></tr></thead>
                    <tbody>
                      {secs.map((s: any, i: number) => (
                        <tr key={i}><td>{s.nome}</td>{comQtd && <td className="num">{s.liq_qtd ?? '-'}</td>}<td className="num">{formatCurrency(s.liq_valor)}</td>{comQtd && <td className="num">{s.pag_qtd ?? '-'}</td>}<td className="num">{formatCurrency(s.pag_valor)}</td></tr>
                      ))}
                      <tr className="total"><td>TOTAL — {secs.length}</td>{comQtd && <td className="num">{r.processos.liquidados_qtd}</td>}<td className="num">{formatCurrency(r.processos.liquidados_valor)}</td>{comQtd && <td className="num">{r.processos.pagos_qtd}</td>}<td className="num">{formatCurrency(r.processos.pagos_valor)}</td></tr>
                    </tbody>
                  </table></div>
                )}
              </Secao>
            )}

            {has(r.execucao_orcamentaria) && (
              <Secao num={next()} titulo="Execução Orçamentária">
                <Texto t={r.execucao_orcamentaria.texto} />
                {has(r.execucao_orcamentaria.creditos_adicionais) && (
                  <>
                    <div className="report-sub">Créditos Adicionais Abertos no Mês</div>
                    <div className="report-tabela-wrap"><table className="report-tabela">
                      <thead><tr><th>Data</th><th>Lei</th><th>Decreto</th><th className="num">Suplementares</th><th className="num">Especiais</th><th className="num">Superávit Fin.</th><th className="num">Anulação</th><th className="num">Excesso Arrec.</th></tr></thead>
                      <tbody>
                        {r.execucao_orcamentaria.creditos_adicionais.map((c: any, i: number) => (
                          <tr key={i}><td>{c.data}</td><td>{c.lei}</td><td>{c.decreto}</td><td className="num">{formatCurrency(c.suplementares)}</td><td className="num">{formatCurrency(c.especiais)}</td><td className="num">{formatCurrency(c.superavit)}</td><td className="num">{formatCurrency(c.anulacao)}</td><td className="num">{formatCurrency(c.excesso)}</td></tr>
                        ))}
                        <tr className="total"><td colSpan={3}>TOTAL</td>
                          {['suplementares', 'especiais', 'superavit', 'anulacao', 'excesso'].map(k => (
                            <td key={k} className="num">{formatCurrency(r.execucao_orcamentaria.creditos_adicionais.reduce((a: number, c: any) => a + (Number(c[k]) || 0), 0))}</td>
                          ))}</tr>
                      </tbody>
                    </table></div>
                  </>
                )}
                <div className="report-tabela-wrap"><table className="report-tabela">
                  <tbody>
                    {[['Valor fixado total conforme a LOA', 'loa_total'], ['Total do Poder Legislativo', 'legislativo'], ['Total do Poder Executivo', 'executivo'],
                      ['Valor máximo disponível acumulado', 'max_disponivel_acumulado'], ['Valor máximo autorizado para o decreto anual', 'max_autorizado_anual'],
                      ['Total dos créditos suplementares acumulado', 'suplementar_acumulado']]
                      .filter(([, k]) => has(r.execucao_orcamentaria[k]))
                      .map(([l, k]) => <tr key={k}><td>{l}</td><td className="num"><strong>{formatCurrency(r.execucao_orcamentaria[k])}</strong></td></tr>)}
                  </tbody>
                </table></div>
                <Acao t={r.execucao_orcamentaria.recomendacao} />
              </Secao>
            )}

            {has(r.pessoal) && (
              <Secao num={next()} titulo="Despesas com Pessoal">
                <div className={cn('report-box', Number(r.pessoal.indice) > 54 ? 'report-box-crit' : Number(r.pessoal.indice) > 48.6 ? 'report-box-warn' : 'report-box-ok')}>
                  <strong>Índice apurado: {pct(r.pessoal.indice)}</strong> — limite máximo 54% · prudencial 51,3% · alerta 48,6% (art. 20, III, "b" e art. 22 da LRF)
                </div>
                <div className="report-mgrid">
                  {has(r.pessoal.valor) && <div className="report-mcard"><div className="report-mlabel">Despesa com pessoal</div><div className="report-mval">{formatCompact(r.pessoal.valor)}</div></div>}
                  {has(r.pessoal.rcl) && <div className="report-mcard"><div className="report-mlabel">RCL</div><div className="report-mval">{formatCompact(r.pessoal.rcl)}</div></div>}
                </div>
                {Array.isArray(r.pessoal.composicao) && (
                  <div className="report-tabela-wrap"><table className="report-tabela">
                    <thead><tr><th>Composição da despesa com pessoal – mês</th><th className="num">Valor</th></tr></thead>
                    <tbody>{r.pessoal.composicao.map((c: any, i: number) => (
                      <tr key={i} className={c.total ? 'total' : ''}><td style={{ paddingLeft: c.nivel === 2 ? 26 : 10 }}>{c.item}</td><td className="num">{formatCurrency(c.valor)}</td></tr>
                    ))}</tbody>
                  </table></div>
                )}
                <Texto t={r.pessoal.texto} /><Acao t={r.pessoal.recomendacao} />
              </Secao>
            )}

            {has(r.patrimonio) && (
              <Secao num={next()} titulo="Os Bens Patrimoniais">
                {has(r.patrimonio.valor_incorporado) && <div className="report-mgrid"><div className="report-mcard"><div className="report-mlabel">Bens incorporados no mês</div><div className="report-mval">{formatCurrency(r.patrimonio.valor_incorporado)}</div></div></div>}
                <Texto t={r.patrimonio.texto} /><Acao t={r.patrimonio.recomendacao} />
              </Secao>
            )}

            {has(r.almoxarifado) && <Secao num={next()} titulo="Os Bens do Almoxarifado"><Texto t={r.almoxarifado.texto} /><Acao t={r.almoxarifado.recomendacao} /></Secao>}

            {has(r.combustivel) && (
              <Secao num={next()} titulo="Consumo de Combustível">
                {(has(r.combustivel.valor) || has(r.combustivel.litros)) && (
                  <div className="report-mgrid">
                    {has(r.combustivel.valor) && <div className="report-mcard"><div className="report-mlabel">Gasto no mês</div><div className="report-mval">{formatCurrency(r.combustivel.valor)}</div></div>}
                    {has(r.combustivel.litros) && <div className="report-mcard"><div className="report-mlabel">Litros</div><div className="report-mval">{Number(r.combustivel.litros).toLocaleString('pt-BR')}</div></div>}
                  </div>
                )}
                <Texto t={r.combustivel.texto} /><Acao t={r.combustivel.recomendacao} />
              </Secao>
            )}

            {has(r.licitacoes) && (
              <Secao num={next()} titulo="As Licitações, Contratos e Convênios">
                <Texto t={r.licitacoes.texto} />
                {has(r.licitacoes.contratos) && (<>
                  <div className="report-sub">Contratos de Despesa ({r.licitacoes.contratos.length})</div>
                  <div className="report-tabela-wrap"><table className="report-tabela">
                    <thead><tr><th>Contrato</th><th>Fornecedor</th><th>Procedimento</th><th className="num">Valor</th><th>Publicação</th></tr></thead>
                    <tbody>
                      {r.licitacoes.contratos.map((c: any, i: number) => <tr key={i}><td>{c.numero}</td><td>{c.fornecedor}{c.cnpj ? <><br /><small>{c.cnpj}</small></> : null}</td><td>{c.procedimento}</td><td className="num">{formatCurrency(c.valor)}</td><td>{c.publicacao}</td></tr>)}
                      <tr className="total"><td colSpan={3}>TOTAL</td><td className="num">{formatCurrency(r.licitacoes.contratos.reduce((a: number, c: any) => a + (Number(c.valor) || 0), 0))}</td><td></td></tr>
                    </tbody>
                  </table></div>
                </>)}
                {has(r.licitacoes.dispensas) && (<>
                  <div className="report-sub">Dispensas e Inexigibilidades ({r.licitacoes.dispensas.length})</div>
                  <div className="report-tabela-wrap"><table className="report-tabela">
                    <thead><tr><th>Processo</th><th>Fundamentação</th><th>Fornecedor</th><th className="num">Valor</th><th>Publicação</th></tr></thead>
                    <tbody>{r.licitacoes.dispensas.map((d: any, i: number) => <tr key={i}><td>{d.processo}</td><td>{d.fundamentacao}</td><td>{d.fornecedor}</td><td className="num">{formatCurrency(d.valor)}</td><td>{d.publicacao}</td></tr>)}</tbody>
                  </table></div>
                </>)}
                {has(r.licitacoes.homologadas) && (<>
                  <div className="report-sub">Licitações Homologadas ({r.licitacoes.homologadas.length})</div>
                  <div className="report-tabela-wrap"><table className="report-tabela">
                    <thead><tr><th>Processo</th><th>Modalidade</th><th className="num">Valor Estimado</th><th>Publicação</th></tr></thead>
                    <tbody>{r.licitacoes.homologadas.map((h: any, i: number) => <tr key={i}><td>{h.processo}</td><td>{h.modalidade}</td><td className="num">{formatCurrency(h.valor_estimado)}</td><td>{h.publicacao}</td></tr>)}</tbody>
                  </table></div>
                </>)}
                <Acao t={r.licitacoes.recomendacao} />
              </Secao>
            )}

            {has(r.operacoes_credito) && <Secao num={next()} titulo="As Operações de Crédito"><Texto t={r.operacoes_credito.texto} /></Secao>}

            {indices.length > 0 && (
              <Secao num={next()} titulo="Das Determinações Constitucionais">
                {has(r.fundeb_receitas) && (
                  <div className="report-mgrid">
                    {[['FUNDEB impostos', 'impostos'], ['Complem. VAAF', 'vaaf'], ['Complem. VAAT', 'vaat'], ['Complem. VAAR', 'vaar']]
                      .filter(([, k]) => has(r.fundeb_receitas[k]))
                      .map(([l, k]) => <div key={k} className="report-mcard"><div className="report-mlabel">{l}</div><div className="report-mval">{formatCompact(r.fundeb_receitas[k])}</div></div>)}
                  </div>
                )}
                {indices.map((i: any) => (
                  <div key={i.id || i.nome}>
                    <div className="report-sub">{i.nome}</div>
                    <div className="report-tabela-wrap"><table className="report-tabela">
                      <thead><tr><th className="num">Base de cálculo</th><th className="num">Mínimo ({i.percentual_minimo}%)</th><th className="num">Aplicado</th><th className="num">% Aplicado</th><th className="num">{i.ok ? 'Superávit' : 'Déficit'}</th><th>Situação</th></tr></thead>
                      <tbody><tr>
                        <td className="num">{formatCurrency(i.base)}</td><td className="num">{formatCurrency(i.minimo)}</td><td className="num">{formatCurrency(i.aplicado)}</td>
                        <td className="num"><strong>{pct(i.perc)}</strong></td>
                        <td className="num" style={{ color: i.ok ? 'var(--verde)' : 'var(--vermelho)' }}><strong>{formatCurrency(Math.abs(i.dif))}</strong></td>
                        <td><span className={cn('badge', i.ok ? 'badge-ok' : 'badge-crit')}>{i.ok ? 'Cumprido' : 'Não cumprido'}</span></td>
                      </tr></tbody>
                    </table></div>
                    <Texto t={i.texto} /><Acao t={i.recomendacao} />
                  </div>
                ))}
              </Secao>
            )}

            {has(r.despesa_categoria?.linhas) && (
              <Secao num={next()} titulo="A Despesa Pública">
                <Texto t={r.despesa_categoria.texto} />
                <div className="report-tabela-wrap"><table className="report-tabela">
                  <thead><tr><th>Despesa (liquidada)</th><th className="num">Dotação Fixada</th><th className="num">Realizado no Mês</th><th className="num">Realizado até o Mês</th></tr></thead>
                  <tbody>
                    {r.despesa_categoria.linhas.map((l: any, i: number) => (
                      <tr key={i} className={l.nivel === 1 ? 'grupo' : ''}><td style={{ paddingLeft: l.nivel === 1 ? 10 : 26 }}>{l.nome}</td><td className="num">{formatCurrency(l.dotacao)}</td><td className="num">{formatCurrency(l.mes)}</td><td className="num">{formatCurrency(l.acumulado)}</td></tr>
                    ))}
                    <tr className="total"><td>Total da Despesa</td><td className="num">{formatCurrency(r.despesa_categoria.total_dotacao)}</td><td className="num">{formatCurrency(r.despesa_categoria.total_mes)}</td><td className="num">{formatCurrency(r.despesa_categoria.total_acumulado)}</td></tr>
                  </tbody>
                </table></div>
              </Secao>
            )}

            {has(r.receita) && (
              <Secao num={next()} titulo="A Receita">
                <div className="report-mgrid">
                  {[['Receita líquida arrecadada', 'arrecadada_liquida'], ['Receitas correntes', 'correntes'], ['Transferências correntes', 'transferencias_correntes'],
                    ['Impostos, taxas e contrib. melhoria', 'impostos_taxas'], ['Contribuições', 'contribuicoes'], ['Receita patrimonial', 'patrimonial']]
                    .filter(([, k]) => has(r.receita[k]))
                    .map(([l, k], idx) => <div key={k} className={cn('report-mcard', idx === 0 && 'azul')}><div className="report-mlabel">{l}</div><div className="report-mval">{formatCompact(r.receita[k])}</div></div>)}
                </div>
                <Texto t={r.receita.texto} />
              </Secao>
            )}

            {has(r.duodecimo) && (
              <Secao num={next()} titulo="Duodécimos">
                <div className="report-mgrid">
                  {has(r.duodecimo.valor_repassado) && <div className="report-mcard"><div className="report-mlabel">Repassado à Câmara</div><div className="report-mval">{formatCurrency(r.duodecimo.valor_repassado)}</div></div>}
                  {has(r.duodecimo.valor_previsto) && <div className="report-mcard"><div className="report-mlabel">Valor previsto (TCM)</div><div className="report-mval">{formatCurrency(r.duodecimo.valor_previsto)}</div></div>}
                </div>
                <Texto t={r.duodecimo.texto} />
              </Secao>
            )}

            {has(r.precatorios) && <Secao num={next()} titulo="Dos Precatórios"><Texto t={r.precatorios.texto} /></Secao>}

            {has(r.diarias) && (
              <Secao num={next()} titulo="Diárias">
                {has(r.diarias.valor) && <div className="report-mgrid"><div className="report-mcard"><div className="report-mlabel">Total de diárias no mês</div><div className="report-mval">{formatCurrency(r.diarias.valor)}</div></div></div>}
                <Texto t={r.diarias.texto} />
              </Secao>
            )}

            <Secao num={next()} titulo="Conclusão e Recomendações">
              <div className="space-y-4">
                {(r.conclusoes || []).map((c: any, idx: number) => (
                  <div key={idx} className="flex gap-4 items-start border-b border-slate-100 pb-4">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white',
                      c.nivel === 'urgente' ? 'bg-rose-600' : c.nivel === 'atencao' ? 'bg-amber-500' : 'bg-slate-900')}>{idx + 1}</div>
                    <div className="text-sm">
                      <div className="flex items-center gap-2 mb-1"><strong className="text-slate-900 uppercase text-xs">{c.titulo}</strong>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase bg-slate-100 text-slate-700">{c.tipo}</span></div>
                      <p className="text-slate-600 leading-relaxed">{c.texto}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20 }}><Texto t={r.parecer_final} /></div>
              <p style={{ marginTop: 16 }}>Este é o nosso relatório.</p>
              <div className="report-assin">
                <div className="report-assin-linha"></div>
                <strong>Igor Silva Soares Carvalho</strong><br />Controlador-Geral do Município
              </div>
            </Secao>

            <Secao num={next()} titulo="Declaração">
              <p>Declaro para os devidos fins que estou ciente das conclusões do Parecer emitido pela Controladoria-Geral do Município referente às contas do mês de <strong>{r.periodo}</strong>.</p>
              <p style={{ marginTop: 16 }}>Coaraci-BA, ____/____/________</p>
              <div className="report-assin">
                <div className="report-assin-linha"></div>
                <strong>Milton Dias Cerqueira Micheli Santos</strong><br />Prefeito Municipal
              </div>
            </Secao>
          </div>

          <div className="report-capa py-8 px-12 flex justify-between items-center text-[11px] opacity-90">
            <div><strong>Prefeitura Municipal de Coaraci — BA</strong><br />Av. Joaquim Miguel Gally Galvão, 244 Centro — CEP 45638-000 · CNPJ 14.147.474/0001-75</div>
            <div className="text-right"><strong>Controladoria-Geral</strong><br />{r.periodo}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-12 text-center shadow-sm">
        <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
          <FileBarChart size={48} />
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-4">Relatório Executivo</h1>
        <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto mb-8">
          Gere o relatório mensal de controle interno a partir dos relatórios do SIGA ou deixe a IA analisar um arquivo da contabilidade.
        </p>

        <div role="tablist" className="inline-flex rounded-2xl bg-slate-100 p-1 mb-10">
          {([['siga', 'Importar do SIGA'], ['ia', 'Analisar com IA']] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={modo === k} onClick={() => setModo(k)}
              className={cn('px-5 py-2 rounded-xl text-sm font-black transition-colors',
                modo === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {label}
            </button>
          ))}
        </div>

        {modo === 'siga' ? (
          <SigaBoundary>
            <ImportarSiga onGerar={setReportData} historico={history} />
          </SigaBoundary>
        ) : (<>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx,.xls,.csv,.pdf"
          className="hidden"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
          <button 
            disabled={isAnalyzing}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "p-6 rounded-3xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 transition-all text-center group",
              isAnalyzing && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all">
              {isAnalyzing ? <RefreshCw size={24} className="animate-spin" /> : <Upload size={24} />}
            </div>
            <span className="text-sm font-black text-slate-900 uppercase tracking-wider block">
              {isAnalyzing ? "Analisando..." : "Selecionar Arquivo"}
            </span>
          </button>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-left">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">O que a IA analisa?</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <TrendingUp size={14} className="text-primary" /> Receitas e Despesas
              </li>
              <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <AlertTriangle size={14} className="text-amber-500" /> Índices LRF (Pessoal)
              </li>
              <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <CheckCircle2 size={14} className="text-emerald-500" /> MDE, Saúde e FUNDEB
              </li>
            </ul>
          </div>
        </div>

        {isAnalyzing && (
          <p className="mt-8 text-xs font-bold text-slate-400">
            A IA está lendo o arquivo e calculando os índices. Isso pode levar de 30 segundos a 2 minutos...
          </p>
        )}

        {error && (
          <div className="mt-8 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 max-w-lg mx-auto">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
        </>)}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <History size={20} />
          </div>
          <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Histórico</h4>
          <p className="text-xs text-slate-500 font-medium">Relatórios salvos anteriormente por competência.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <FileText size={20} />
          </div>
          <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Detalhado</h4>
          <p className="text-xs text-slate-500 font-medium">Análise granular de receitas, pessoal e limites legais.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <AlertTriangle size={20} />
          </div>
          <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Conformidade</h4>
          <p className="text-xs text-slate-500 font-medium">Alertas automáticos para o TCM-BA e LRF.</p>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <History size={24} className="text-primary" /> Histórico de Competências
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((item) => (
              <div 
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-primary transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-black text-[10px] uppercase">
                      {item.competencia}
                    </div>
                    {currentUser?.role !== 'visualizador' && (
                      <button 
                        onClick={() => setReportToDelete(item.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <h4 className="font-black text-slate-900 uppercase text-sm mb-1">{item.periodo}</h4>
                  <p className="text-[10px] text-slate-400 font-medium italic">Salvo em {new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <button 
                  onClick={() => setReportData(item.data)}
                  className="mt-4 w-full py-2 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <FileSearch size={14} /> Visualizar Relatório
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local Delete Confirmation Modal */}
      <AnimatePresence>
        {reportToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-background w-full max-w-sm relative z-10 text-center p-8 rounded-[32px] shadow-2xl border border-border"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6 shrink-0">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Excluir Relatório</h3>
              <p className="text-text-secondary text-sm mb-8">Tem certeza que deseja apagar este relatório? Esta ação não pode ser desfeita.</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => deleteReport(reportToDelete)} 
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-rose-500/20"
                >
                  Confirmar Exclusão
                </button>
                <button 
                  onClick={() => setReportToDelete(null)} 
                  className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs text-text-secondary hover:bg-surface-hover transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// IMPORTAÇÃO DO SIGA (sem IA) — tudo neste arquivo para não depender de outros
// ════════════════════════════════════════════════════════════════════

// ───── Leitores dos relatórios ─────
// Leitores dos relatórios do SIGA (TCM-BA) — sem IA.
// Recebem o texto do PDF já com as posições (x, y) de cada trecho, página a página.

export interface Palavra { s: string; x0: number; x1: number; top: number; }
export type Paginas = Palavra[][];

export type TipoSiga =
  | 'despesa_orcamentaria'
  | 'receita_agrupada'
  | 'conferencia'
  | 'despesas_liquidadas'
  | 'contratos'
  | 'dispensas'
  | 'licitacoes'
  | 'desconhecido';

export const NOME_TIPO: Record<TipoSiga, string> = {
  despesa_orcamentaria: 'Despesa Orçamentária',
  receita_agrupada: 'Receita Orçamentária Agrupada',
  conferencia: 'Conferência dos Demonstrativos',
  despesas_liquidadas: 'Despesas - Liquidadas',
  contratos: 'Contratos de Despesa',
  dispensas: 'Dispensa/Inexigibilidade',
  licitacoes: 'Licitações Homologadas',
  desconhecido: 'Não reconhecido',
};

const NUM = /^-?[\d.]+,\d{2}$/;
export const valor = (s: string) => Number(s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

/** Agrupa os trechos em linhas. Tolerância de 3pt: no SIGA a coluna "Não Paga" fica 1pt acima das demais. */
export function linhas(pagina: Palavra[]): Palavra[][] {
  const ord = [...pagina].sort((a, b) => a.top - b.top || a.x0 - b.x0);
  const out: { top: number; ws: Palavra[] }[] = [];
  for (const w of ord) {
    const ult = out[out.length - 1];
    if (ult && Math.abs(ult.top - w.top) <= 3) ult.ws.push(w);
    else out.push({ top: w.top, ws: [w] });
  }
  return out.map(l => l.ws.sort((a, b) => a.x0 - b.x0));
}

const textoPagina = (p: Palavra[]) => p.map(w => w.s).join(' ');

export function competenciaDoTexto(txt: string): string | null {
  const m = txt.match(/Compet[êe]ncia:?\s*(\d{2})\/(\d{4})/i);
  return m ? `${m[2]}-${m[1]}` : null;
}

export function detectarTipoPdf(paginas: Paginas): TipoSiga {
  const t = paginas.slice(0, 2).map(textoPagina).join(' ');
  if (!/SIGA|Tribunal de Contas dos Munic/i.test(t)) return 'desconhecido';
  if (/Confer[êe]ncia dos Demonstrativos/i.test(t)) return 'conferencia';
  if (/Demonstrativo da Despesa Or[çc]ament[áa]ria/i.test(t)) return 'despesa_orcamentaria';
  if (/Receita Or[çc]ament[áa]ria \(Agrupado\)/i.test(t)) return 'receita_agrupada';
  if (/Despesa - Liquidados/i.test(t)) return 'despesas_liquidadas';
  if (/Contratos de Despesa/i.test(t)) return 'contratos';
  if (/Dispensa\/Inexigibilidade/i.test(t)) return 'dispensas';
  if (/Licita[çc][õo]es Homologadas/i.test(t)) return 'licitacoes';
  return 'desconhecido';
}

// ───────────────────────── Despesa Orçamentária ─────────────────────────
export const COLS_DESPESA = ['fixada', 'alteracoes', 'anulacoes', 'total_fixada', 'emp_mes', 'emp_ate',
  'liq_mes', 'liq_ate', 'pag_mes', 'pag_ate', 'nao_paga', 'saldo'] as const;
export type ColDespesa = typeof COLS_DESPESA[number];

export interface LinhaDespesa {
  orgao: string; unidade: string; projeto: string;
  funcao: string; subfuncao: string;
  elemento: string; descricao: string; fonte: string;
  v: Record<ColDespesa, number>;
}
export interface DespesaOrcamentaria {
  competencia: string | null;
  linhas: LinhaDespesa[];
  totalPoder: Record<ColDespesa, number> | null;
  avisos: string[];
}

const ELEM = /^\d\.\d\.\d{2}\.\d{2}\.\d{2}$/;

export function lerDespesaOrcamentaria(paginas: Paginas): DespesaOrcamentaria {
  type Item = { tipo: 'row' | 'orfa' | 'usada'; nums: Palavra[]; fonte: string;
    orgao?: string; unidade?: string; projeto?: string; elemento?: string; descricao?: string };
  const itens: Item[] = [];
  let orgao = '', unidade = '', projeto = '';
  let bordas: number[] | null = null;
  let totalPoder: number[] | null = null;
  const avisos: string[] = [];

  for (const pag of paginas) {
    const ls = linhas(pag);
    for (let i = 0; i < ls.length; i++) {
      const wl = ls[i];
      const toks = wl.map(w => w.s.trim());
      const nums = wl.filter(w => NUM.test(w.s.trim()));
      // "Total do Poder:" vem na linha de baixo dos valores
      if (toks[0] === 'Total do Poder:' && i > 0) {
        const prev = ls[i - 1].filter(w => NUM.test(w.s.trim()));
        if (prev.length === 12) totalPoder = prev.map(w => valor(w.s));
        continue;
      }
      if (/^Total/.test(toks[0])) continue;
      if (/^\d{1,2}$/.test(toks[0]) && wl[0].x0 < 40 && !nums.length && toks.length > 1) { orgao = toks.slice(1).join(' '); continue; }
      if (/^\d{1,2}\.\d{3}$/.test(toks[0]) && !nums.length) { unidade = toks.join(' '); continue; }
      if (/^\d{1,2}\.\d{3}\./.test(toks[0]) && !nums.length) { projeto = toks.join(' '); continue; }
      const fonte = wl.find(w => /^\d{4}$/.test(w.s.trim()) && w.x0 > 300 && w.x0 < 360)?.s.trim() ?? '';
      if (ELEM.test(toks[0])) {
        if (nums.length === 12 && !bordas) bordas = nums.map(w => w.x1);
        const descricao = wl.slice(1).filter(w => !NUM.test(w.s.trim()) && w.x0 < 300).map(w => w.s.trim()).join(' ');
        itens.push({ tipo: 'row', orgao, unidade, projeto, elemento: toks[0], descricao, fonte, nums });
      } else if (fonte && nums.length >= 10) {
        itens.push({ tipo: 'orfa', fonte, nums }); // linha quebrada entre páginas
      }
    }
  }
  // junta linhas incompletas com os valores que ficaram na página vizinha
  itens.forEach((it, i) => {
    if (it.tipo !== 'row' || it.nums.length >= 12) return;
    for (const j of [i - 1, i + 1]) {
      const o = itens[j];
      if (o && o.tipo === 'orfa') { it.nums = [...o.nums, ...it.nums]; it.fonte ||= o.fonte; o.tipo = 'usada'; break; }
    }
  });
  if (!bordas) return { competencia: null, linhas: [], totalPoder: null, avisos: ['Layout da despesa não reconhecido.'] };

  const col = (x1: number) => bordas!.reduce((best, b, i) => Math.abs(b - x1) < Math.abs(bordas![best] - x1) ? i : best, 0);
  const out: LinhaDespesa[] = [];
  for (const it of itens) {
    if (it.tipo !== 'row') continue;
    if (it.nums.length !== 12) avisos.push(`Linha ${it.elemento} (${it.descricao}) com ${it.nums.length} valores.`);
    const v = Object.fromEntries(COLS_DESPESA.map(c => [c, 0])) as Record<ColDespesa, number>;
    it.nums.forEach(w => { v[COLS_DESPESA[col(w.x1)]] += valor(w.s); });
    const partes = (it.projeto || '').split(' ')[0].split('.');
    out.push({
      orgao: it.orgao || '', unidade: it.unidade || '', projeto: it.projeto || '',
      funcao: partes[2] || '', subfuncao: partes[3] || '',
      elemento: it.elemento!, descricao: it.descricao || '', fonte: it.fonte, v,
    });
  }
  const tp = totalPoder ? Object.fromEntries(COLS_DESPESA.map((c, i) => [c, totalPoder![i]])) as Record<ColDespesa, number> : null;
  return { competencia: competenciaDoTexto(textoPagina(paginas[0] || [])), linhas: out, totalPoder: tp, avisos };
}

// ───────────────────────── Receita Orçamentária (Agrupado) ─────────────────────────
export interface ContaReceita { conta: string; descricao: string; prevista: number; arrecadacao: number; anulacoes: number; arrecadacao_ate: number; }
export interface ReceitaAgrupada {
  competencia: string | null;
  contas: Record<string, ContaReceita>;
  total: { prevista: number; arrecadacao: number; anulacoes: number; arrecadacao_ate: number } | null;
  resumo: { corrente_mes: number; corrente_ate: number; capital_mes: number; capital_ate: number; total_mes: number; total_ate: number } | null;
}
const CONTA_REC = /^\d\.\d\.\d\.\d\.\d{2}\.\d\.\d$/;

export function lerReceitaAgrupada(paginas: Paginas): ReceitaAgrupada {
  const contas: Record<string, ContaReceita> = {};
  let total: ReceitaAgrupada['total'] = null;
  const resumo: any = {};
  for (const pag of paginas) {
    for (const wl of linhas(pag)) {
      const toks = wl.map(w => w.s.trim());
      const nums = wl.filter(w => NUM.test(w.s.trim())).map(w => valor(w.s));
      if (CONTA_REC.test(toks[0]) && nums.length >= 6) {
        const [prevista, arrecadacao, anulacoes, arrecadacao_ate] = nums;
        contas[toks[0]] = { conta: toks[0], descricao: toks.slice(1).filter(t => !NUM.test(t)).join(' '), prevista, arrecadacao, anulacoes, arrecadacao_ate };
      } else if (toks[0] === 'Totais:' && nums.length >= 6) {
        total = { prevista: nums[0], arrecadacao: nums[1], anulacoes: nums[2], arrecadacao_ate: nums[3] };
      } else if (toks[0] === 'Totais:' && nums.length === 2) {
        resumo.total_mes = nums[0]; resumo.total_ate = nums[1];
      } else if (/^Receita Corrente:/.test(toks[0]) && nums.length === 2) {
        resumo.corrente_mes = nums[0]; resumo.corrente_ate = nums[1];
      } else if (/^Receita de Capital:/.test(toks[0]) && nums.length === 2) {
        resumo.capital_mes = nums[0]; resumo.capital_ate = nums[1];
      }
    }
  }
  return { competencia: competenciaDoTexto(textoPagina(paginas[0] || [])), contas, total, resumo: resumo.total_mes !== undefined ? resumo : null };
}

// ───────────────────────── Conferência dos Demonstrativos ─────────────────────────
export interface Conferencia {
  competencia: string | null;
  despesa: Record<ColDespesa, number> | null;
  receita: { corrente_mes: number; corrente_ate: number; total_mes: number; total_ate: number } | null;
}
export function lerConferencia(paginas: Paginas): Conferencia {
  let despesa: Conferencia['despesa'] = null;
  const receita: any = {};
  for (const pag of paginas) {
    const txt = textoPagina(pag);
    for (const wl of linhas(pag)) {
      const toks = wl.map(w => w.s.trim());
      const nums = wl.filter(w => NUM.test(w.s.trim())).map(w => valor(w.s));
      if (toks[0] === 'Total do Poder:' && nums.length === 12) despesa = Object.fromEntries(COLS_DESPESA.map((c, i) => [c, nums[i]])) as any;
      if (/DEMONSTRATIVO DE RECEITAS/.test(txt)) {
        if (/^Receita Corrente:/.test(toks[0]) && nums.length === 2) { receita.corrente_mes = nums[0]; receita.corrente_ate = nums[1]; }
        if (toks[0] === 'Totais:' && nums.length === 2) { receita.total_mes = nums[0]; receita.total_ate = nums[1]; }
      }
    }
  }
  return { competencia: competenciaDoTexto(textoPagina(paginas[0] || [])), despesa, receita: receita.total_mes !== undefined ? receita : null };
}

// ───────────────────────── Despesas - Liquidadas (por elemento) ─────────────────────────
export interface Liquidados { competencia: string | null; elementos: Record<string, { descricao: string; total: number; empenhos: number }>; }
export function lerDespesasLiquidadas(paginas: Paginas): Liquidados {
  const elementos: Liquidados['elementos'] = {};
  let atual: string | null = null, secao = '';
  for (const pag of paginas) {
    for (const wl of linhas(pag)) {
      const t = wl.map(w => w.s.trim()).join(' ');
      const sec = t.match(/Despesa - Liquidados - Por (.+)/);
      if (sec) { secao = sec[1]; continue; }
      if (!/Elemento/.test(secao)) continue;
      const g = t.match(/^(\d{8})\s*\|\s*(.+)$/);
      if (g && !/\d,\d{2}$/.test(t)) { atual = g[1]; elementos[atual] = { descricao: g[2].trim(), total: 0, empenhos: 0 }; continue; }
      const r = t.match(/^\d{10}\s*\|\s*\d+\s*\|\s*\d+\s+(-?[\d.]+,\d{2})$/);
      if (r && atual) { elementos[atual].total += valor(r[1]); elementos[atual].empenhos++; }
    }
  }
  // neste relatório o valor da competência aparece solto (ex.: "08/2026"), longe do rótulo
  const direto = competenciaDoTexto(textoPagina(paginas[0] || []));
  const solto = (paginas[0] || []).map(w => w.s.trim()).find(s => /^\d{2}\/\d{4}$/.test(s));
  return { competencia: direto || (solto ? `${solto.slice(3)}-${solto.slice(0, 2)}` : null), elementos };
}

// ───────────────────────── Listagens "Informes Mensais" (página HTML) ─────────────────────────
export interface Listagem { tipo: TipoSiga; competencia: string | null; registros: Record<string, string>[]; }

/** Lê a página salva (Ctrl+S) das listagens do SIGA. Recebe as linhas da tabela já como texto. */
export function lerListagem(titulo: string, tabela: string[][]): Listagem {
  const tipo: TipoSiga = /Contratos de Despesa/i.test(titulo) ? 'contratos'
    : /Dispensa\/Inexigibilidade/i.test(titulo) ? 'dispensas'
    : /Licita[çc][õo]es Homologadas/i.test(titulo) ? 'licitacoes' : 'desconhecido';
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const iCab = tabela.findIndex(r => r.some(c => /^Compet[êe]ncia$/i.test(norm(c))));
  if (iCab < 0) return { tipo, competencia: null, registros: [] };
  const cab = tabela[iCab].map(norm);
  const registros = tabela.slice(iCab + 1)
    .filter(r => /^\d{2}\/\d{4}$/.test(norm(r[0] || '')))
    .map(r => Object.fromEntries(cab.map((c, i) => [c, norm(r[i] || '')])));
  const c = registros[0]?.[cab[0]];
  return { tipo, competencia: c ? `${c.slice(3)}-${c.slice(0, 2)}` : null, registros };
}

// ───── Montagem do relatório ─────
// Monta o Relatório Mensal de Controle Interno a partir dos relatórios do SIGA — sem IA.

export interface PacoteSiga {
  despesa?: DespesaOrcamentaria;
  receita?: ReceitaAgrupada;
  conferencia?: Conferencia;
  liquidados?: Liquidados;
  contratos?: Listagem;
  dispensas?: Listagem;
  licitacoes?: Listagem;
}

/** Dados que não vêm do SIGA (ou que o controlador quer corrigir). Tudo opcional. */
export interface Complementos {
  pessoal_indice_mes?: number;
  pessoal_indice_12m?: number;
  pessoal_despesa_mes?: number;           // despesa líquida com pessoal do mês
  pessoal_rcl_mes?: number;               // Receita Corrente Líquida ajustada do mês
  pessoal_despesa_12m?: number;
  pessoal_rcl_12m?: number;
  // ajustes da LRF que não aparecem separados no SIGA (da planilha de pessoal da contabilidade)
  pessoal_terceiros?: number;             // serviços de terceiros de mão de obra (PJ/PF) do mês
  pessoal_enfermagem?: number;            // dedução do piso salarial da enfermagem
  pessoal_emendas?: number;               // emendas individuais recebidas no mês
  pessoal_transf_acs?: number;            // transferências recebidas para ACS/ACE
  duodecimo_repassado_mes?: number;
  duodecimo_limite_anual?: number;
  duodecimo_repassado_ate?: number;
  base_impostos_transferencias?: number; // base do MDE 25% e Saúde 15% (substitui a estimativa)
  mde_aplicado?: number;                  // substitui a estimativa do SIGA
  fundeb_base?: number;                   // substitui a estimativa do SIGA
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const R = (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const P = (v: number) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
const soma = (ls: LinhaDespesa[], f: (l: LinhaDespesa) => boolean, c: ColDespesa) => ls.filter(f).reduce((a, l) => a + l.v[c], 0);
const semCodigo = (s: string) => s.replace(/^[\d.]+\s+/, '');

const FONTES_FUNDEB = new Set(['1540', '1541', '1542', '1543', '1546', '2540', '2541', '2542', '2543', '2546']);

/**
 * Despesa com pessoal pela regra do demonstrativo da contabilidade (validada com 12 meses de Coaraci):
 *   bruta   = vencimentos (3.1.90.11) + temporários (3.1.90.04) + consórcios (3.1.71.70)
 *           + 60% × (consultoria 3.3.90.35 + serviços de terceiros de mão de obra)
 *   líquida = bruta − ACS/ACE (fonte 1604) − piso da enfermagem (fonte 1605), só nos elementos 11 e 04
 *   RCL aj. = receita do mês (SIGA) − emendas individuais − transferências ACS/ACE
 * Indenizações trabalhistas (3.1.90.94) ficam de fora (art. 19, § 1º, I, da LRF).
 */
/** Elementos que entram na despesa bruta: as deduções (ACS/ACE, enfermagem) só podem sair deles (sem encargos 3.1.90.13). */
const ELEMENTOS_BRUTA = ['3.1.90.11', '3.1.90.04'];
const naBruta = (l: LinhaDespesa) => ELEMENTOS_BRUTA.some(e => l.elemento.startsWith(e));

/** Piso da enfermagem pelo SIGA: despesa liquidada no mês, fonte 1605, elementos 11 e 04. */
export function enfermagemSiga(p: PacoteSiga): number | null {
  if (!p.despesa) return null;
  return p.despesa.linhas.filter(l => !/C[ÂA]MARA/i.test(l.orgao) && l.fonte === '1605' && naBruta(l))
    .reduce((a, l) => a + l.v.liq_mes, 0);
}

/** Competências dos n meses anteriores a 'AAAA-MM' (mais recente primeiro). */
export function mesesAnteriores(competencia: string, n: number): string[] {
  const [a, m] = competencia.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const dt = new Date(a, m - 2 - i, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  });
}

export function calcularPessoalSiga(p: PacoteSiga, comp: Complementos) {
  const ajustes = [comp.pessoal_terceiros, comp.pessoal_enfermagem, comp.pessoal_emendas, comp.pessoal_transf_acs];
  const receita = p.receita?.resumo?.total_mes ?? p.conferencia?.receita?.total_mes;
  if (!p.despesa || receita === undefined || ajustes.every(v => v === undefined)) return null;
  const L = p.despesa.linhas.filter(l => !/C[ÂA]MARA/i.test(l.orgao));
  const s = (f: (l: LinhaDespesa) => boolean) => L.filter(f).reduce((a, l) => a + l.v.liq_mes, 0);
  const vencimentos = s(l => l.elemento.startsWith('3.1.90.11'));
  const temporarios = s(l => l.elemento.startsWith('3.1.90.04'));
  const consorcios = s(l => l.elemento.startsWith('3.1.71.70'));
  const consultoria = s(l => l.elemento.startsWith('3.3.90.35'));
  const indenizacoes = s(l => l.elemento.startsWith('3.1.90.94'));
  const acs = s(l => l.fonte === '1604' && naBruta(l));
  const terceiros = comp.pessoal_terceiros ?? 0;
  const terceirizacao = 0.6 * (consultoria + terceiros);
  const bruta = vencimentos + temporarios + consorcios + terceirizacao;
  const enfermagemOrigem = comp.pessoal_enfermagem !== undefined ? 'informada' : 'siga';
  const enfermagem = comp.pessoal_enfermagem ?? enfermagemSiga(p) ?? 0;
  const liquida = bruta - acs - enfermagem;
  const emendas = comp.pessoal_emendas ?? 0, transfAcs = comp.pessoal_transf_acs ?? 0;
  const rcl = receita - emendas - transfAcs;
  return { vencimentos, temporarios, consorcios, consultoria, terceiros, terceirizacao, bruta, acs, enfermagem, liquida,
    indenizacoes, receita, emendas, transfAcs, rcl, enfermagemOrigem, indice: rcl ? liquida / rcl * 100 : 0 };
}

export function montarRelatorio(p: PacoteSiga, comp: Complementos = {}, historico: any[] = []) {
  const divergencias: { secao: string; descricao: string }[] = [];
  const conclusoes: { tipo: string; nivel: 'urgente' | 'atencao' | 'informativo'; titulo: string; texto: string }[] = [];

  // ── competência ──
  const comps = Object.entries(p).filter(([, v]) => v && (v as any).competencia).map(([k, v]) => [k, (v as any).competencia as string]);
  const competencia = comps[0]?.[1] || '';
  const diferentes = comps.filter(([, c]) => c !== competencia);
  if (diferentes.length) divergencias.push({ secao: 'Competência', descricao: `Arquivos de meses diferentes: ${comps.map(([k, c]) => `${k} = ${c}`).join(', ')}.` });
  const [ano, mes] = competencia.split('-');
  const periodo = mes ? `${MESES[Number(mes) - 1]} de ${ano}` : 'Período não identificado';
  const mesNome = mes ? MESES[Number(mes) - 1].toLowerCase() : '';

  const L = p.despesa?.linhas || [];
  const tem = (x: any) => x !== undefined && x !== null;
  const r: any = { competencia, periodo, origem: 'siga', divergencias, conclusoes };

  // ─────────────── Despesa ───────────────
  if (p.despesa) {
    const t = Object.fromEntries(COLS_DESPESA.map(c => [c, soma(L, () => true, c)])) as Record<ColDespesa, number>;
    const rpProcessados = t.liq_ate - t.pag_ate;

    // conferências de totais
    if (p.despesa.totalPoder) for (const c of COLS_DESPESA)
      if (Math.abs(t[c] - p.despesa.totalPoder[c]) > 0.01) divergencias.push({ secao: 'Leitura da despesa', descricao: `Coluna ${c}: soma das linhas ${R(t[c])} ≠ total do SIGA ${R(p.despesa.totalPoder[c])}. Confira o arquivo.` });
    if (p.conferencia?.despesa) for (const c of ['emp_mes', 'liq_mes', 'pag_mes', 'liq_ate'] as ColDespesa[])
      if (Math.abs(t[c] - p.conferencia.despesa[c]) > 0.01) divergencias.push({ secao: 'Conferência SIGA', descricao: `Despesa (${c}) ${R(t[c])} ≠ Conferência dos Demonstrativos ${R(p.conferencia.despesa[c])}.` });
    p.despesa.avisos.forEach(a => divergencias.push({ secao: 'Leitura da despesa', descricao: a }));

    r.resumo_geral = { despesa_empenhada: t.emp_mes, despesa_liquidada: t.liq_mes, despesa_paga: t.pag_mes, restos_a_pagar_processados: rpProcessados };

    // por unidade orçamentária (secretarias e fundos)
    const porUni = new Map<string, { liq: number; pag: number }>();
    L.forEach(l => { const u = porUni.get(l.unidade) || { liq: 0, pag: 0 }; u.liq += l.v.liq_mes; u.pag += l.v.pag_mes; porUni.set(l.unidade, u); });
    const secretarias = [...porUni.entries()].filter(([, v]) => Math.abs(v.liq) > 0.004 || Math.abs(v.pag) > 0.004)
      .map(([nome, v]) => ({ nome: semCodigo(nome), liq_qtd: null, liq_valor: v.liq, pag_qtd: null, pag_valor: v.pag }));
    r.processos = {
      liquidados_qtd: '-', liquidados_valor: t.liq_mes, pagos_qtd: '-', pagos_valor: t.pag_mes, por_secretaria: secretarias,
      texto: `No mês de ${mesNome} de ${ano}, conforme os dados informados ao SIGA/TCM-BA, foram liquidadas despesas no valor de ${R(t.liq_mes)} e pagas despesas no valor de ${R(t.pag_mes)}, distribuídas por unidade orçamentária conforme a tabela a seguir.`,
    };

    const legislativo = soma(L, l => /C[ÂA]MARA/i.test(l.orgao), 'fixada');
    r.execucao_orcamentaria = {
      loa_total: t.fixada, legislativo, executivo: t.fixada - legislativo,
      suplementar_acumulado: t.alteracoes,
      creditos_adicionais: [],
      texto: `Os empenhos registrados no mês obedeceram aos critérios do art. 60 da Lei nº 4.320/64. Ao final de ${mesNome}, as despesas empenhadas somaram ${R(t.emp_mes)}, as liquidadas ${R(t.liq_mes)} e as pagas ${R(t.pag_mes)}. As despesas liquidadas e não pagas no exercício totalizam ${R(rpProcessados)}, que se traduzem em Restos a Pagar Processados.\n` +
        `A dotação inicial de ${R(t.fixada)} recebeu, no acumulado do exercício, alterações para mais de ${R(t.alteracoes)} e para menos de ${R(t.anulacoes)}, resultando em dotação atualizada de ${R(t.total_fixada)}, com saldo disponível de ${R(t.saldo)} e ${R(t.nao_paga)} empenhados e não pagos.`,
      recomendacao: 'Manter o acompanhamento dos créditos adicionais em relação ao limite autorizado na LOA.',
    };

    // categorias econômicas
    const exec = (l: LinhaDespesa) => !/C[ÂA]MARA/i.test(l.orgao);   // o demonstrativo do Controle Interno é do Poder Executivo
    const cat = (pref: string, c: ColDespesa) => soma(L, l => exec(l) && l.elemento.startsWith(pref), c);
    const linhaCat = (nome: string, pref: string, nivel: number) => ({ nome, nivel, dotacao: cat(pref, 'fixada'), mes: cat(pref, 'liq_mes'), acumulado: cat(pref, 'liq_ate') });
    r.despesa_categoria = {
      linhas: [
        linhaCat('DESPESAS CORRENTES', '3.', 1), linhaCat('Pessoal e Encargos Sociais', '3.1', 2), linhaCat('Juros e Encargos da Dívida', '3.2', 2), linhaCat('Outras Despesas Correntes', '3.3', 2),
        linhaCat('DESPESAS DE CAPITAL', '4.', 1), linhaCat('Investimentos', '4.4', 2), linhaCat('Inversões Financeiras', '4.5', 2), linhaCat('Amortização da Dívida', '4.6', 2),
        linhaCat('RESERVA DE CONTINGÊNCIA', '9.', 1),
      ].filter(x => x.nivel === 1 || x.dotacao || x.mes || x.acumulado),
      total_dotacao: t.fixada - legislativo, total_mes: soma(L, exec, 'liq_mes'), total_acumulado: soma(L, exec, 'liq_ate'),
      texto: `A despesa liquidada no mês foi de ${R(t.liq_mes)}, e no acumulado do exercício, de ${R(t.liq_ate)}.`,
    };

    // itens específicos
    const combustivel = cat('3.3.90.30.01', 'liq_mes');
    r.combustivel = {
      valor: combustivel,
      texto: `As despesas liquidadas com combustíveis e lubrificantes automotivos (elemento 3.3.90.30.01) somaram ${R(combustivel)} no mês.`,
      recomendacao: 'Manter o controle individualizado por veículo (placa, quilometragem e litros) e conferir com as notas fiscais.',
    };
    const permanente = cat('4.4.90.52', 'liq_mes');
    r.patrimonio = {
      valor_incorporado: permanente,
      texto: `No período, as liquidações em equipamentos e material permanente (elemento 4.4.90.52), passíveis de incorporação ao patrimônio, somaram ${R(permanente)}.`,
      recomendacao: permanente > 0 ? 'Confirmar o tombamento dos bens adquiridos no mês junto ao Setor de Patrimônio.' : 'Não foram necessárias ações corretivas.',
    };
    const diarias = cat('3.3.90.14', 'liq_mes');
    r.diarias = { valor: diarias, texto: `As despesas liquidadas com diárias no mês somaram ${R(diarias)}.` };
    const sentencas = cat('3.1.90.91', 'liq_mes') + cat('3.3.90.91', 'liq_mes');
    r.precatorios = { valor: sentencas, texto: sentencas ? `Foram liquidados ${R(sentencas)} em sentenças judiciais no mês.` : 'Não houve liquidação de sentenças judiciais no mês.' };
    const publicidade = cat('3.3.90.39.92', 'liq_mes');
    r.gastos_publicidade = publicidade;
    r.operacoes_credito = { texto: 'Não foram identificadas operações de crédito nos demonstrativos do mês.' };
  }

  // ─────────────── Receita ───────────────
  const rc = p.receita?.contas || {};
  const liq = (conta: string, ate = false) => { const c = rc[conta]; return c ? (ate ? c.arrecadacao_ate : c.arrecadacao + c.anulacoes) : 0; };
  if (p.receita) {
    const total = p.receita.resumo?.total_mes ?? liq('1.0.0.0.00.0.0') + liq('2.0.0.0.00.0.0');
    r.resumo_geral = { ...(r.resumo_geral || {}), receita_arrecadada: total };
    r.receita = {
      arrecadada_liquida: total,
      correntes: p.receita.resumo?.corrente_mes ?? liq('1.0.0.0.00.0.0'),
      transferencias_correntes: liq('1.7.0.0.00.0.0'),
      impostos_taxas: liq('1.1.0.0.00.0.0'),
      contribuicoes: liq('1.2.0.0.00.0.0'),
      patrimonial: liq('1.3.0.0.00.0.0'),
      texto: `No mês de ${mesNome} de ${ano}, o Município arrecadou ${R(total)} em receitas orçamentárias (líquidas das deduções para o FUNDEB), e ${R(p.receita.resumo?.total_ate ?? 0)} no acumulado do exercício. As transferências correntes somaram ${R(liq('1.7.0.0.00.0.0'))}, e os impostos, taxas e contribuições de melhoria, ${R(liq('1.1.0.0.00.0.0'))}.`,
    };
    if (p.conferencia?.receita && p.receita.resumo && Math.abs(p.conferencia.receita.total_ate - p.receita.resumo.total_ate) > 0.01)
      divergencias.push({ secao: 'Receita', descricao: `Acumulado do exercício diverge entre relatórios do próprio SIGA: Receita Agrupada ${R(p.receita.resumo.total_ate)} × Conferência ${R(p.conferencia.receita.total_ate)} (diferença de ${R(p.receita.resumo.total_ate - p.conferencia.receita.total_ate)}). Solicitar esclarecimento à contabilidade.` });
  }

  // ─────────────── Índices constitucionais ───────────────
  const indices: any[] = [];
  if (p.despesa && p.receita) {
    // Base de impostos e transferências. No SIGA as transferências vêm líquidas da dedução de 20% ao FUNDEB, então são recompostas (÷ 0,8).
    // FPM: só a cota mensal (as cotas extraordinárias de 1% ficam fora, como no demonstrativo da contabilidade).
    const fpm = (ate: boolean) => rc['1.7.1.1.51.1.0'] ? liq('1.7.1.1.51.1.0', ate) : liq('1.7.1.1.51.0.0', ate);
    const transfLiquidas = (ate = false) => fpm(ate) + liq('1.7.1.1.52.0.0', ate) + liq('1.7.2.1.50.0.0', ate) + liq('1.7.2.1.51.0.0', ate);
    const deducaoFundeb = (ate = false) => transfLiquidas(ate) / 0.8 * 0.2;   // 20% retidos para o FUNDEB
    const baseEstimada = (ate = false) => liq('1.1.1.0.00.0.0', ate) + transfLiquidas(ate) / 0.8 + liq('1.7.2.1.52.0.0', ate);
    const base = comp.base_impostos_transferencias ?? baseEstimada();
    const baseAte = baseEstimada(true);
    const origemBase = tem(comp.base_impostos_transferencias) ? 'informada pelo Controle Interno' : 'estimada a partir do SIGA (transferências recompostas antes da dedução do FUNDEB)';

    // Saúde: fonte 1500, função 10, valor pago (critério que reproduz o demonstrativo da contabilidade)
    const saude = soma(L, l => l.fonte === '1500' && l.funcao === '10', 'pag_mes');
    const saudeAte = soma(L, l => l.fonte === '1500' && l.funcao === '10', 'pag_ate');
    indices.push({ id: 'saude', nome: 'Saúde – ASPS (art. 77 ADCT)', percentual_minimo: 15, base_calculo: base, valor_aplicado: saude,
      texto: `A aplicação com recursos próprios em Ações e Serviços Públicos de Saúde (fonte 1500, função 10, valores pagos) foi de ${R(saude)} no mês, sobre base de cálculo ${origemBase} de ${R(base)}. No acumulado do exercício, aplicaram-se ${R(saudeAte)}, correspondentes a ${P(baseAte ? saudeAte / baseAte * 100 : 0)} da base estimada de ${R(baseAte)}.`,
      recomendacao: 'Continuar acompanhando o índice, que é apurado pelo TCM-BA no acumulado anual.' });

    // MDE: fonte 1500, função 12, pago, exceto alimentação escolar (306) e conselhos (422) — estimativa
    const mdeDespesa = soma(L, l => l.fonte === '1500' && l.funcao === '12' && !['306', '422'].includes(l.subfuncao), 'pag_mes');
    const mdeSiga = mdeDespesa + deducaoFundeb();   // o valor retido para o FUNDEB conta como aplicação em MDE
    const mde = comp.mde_aplicado ?? mdeSiga;
    indices.push({ id: 'mde', nome: 'Educação – MDE (art. 212 CF)', percentual_minimo: 25, base_calculo: base, valor_aplicado: mde,
      texto: tem(comp.mde_aplicado)
        ? `A aplicação em Manutenção e Desenvolvimento do Ensino, conforme demonstrativo da contabilidade, foi de ${R(mde)} no mês. Pelo SIGA, a despesa paga com recursos de impostos na função Educação (exceto alimentação escolar) foi de ${R(mdeSiga)}.`
        : `A aplicação estimada em MDE foi de ${R(mdeSiga)}: ${R(mdeDespesa)} em despesas pagas com recursos de impostos (fonte 1500) na função Educação, exceto alimentação escolar, mais ${R(deducaoFundeb())} retidos para a formação do FUNDEB. Como o SIGA não separa a fonte MDE (1500.1001) das demais, o valor deve ser conferido com o demonstrativo da contabilidade.`,
      recomendacao: 'Acompanhar o índice mensalmente, lembrando que o TCM-BA avalia o acumulado do exercício.' });
    if (!tem(comp.mde_aplicado)) divergencias.push({ secao: 'MDE 25%', descricao: `Valor aplicado estimado pelo SIGA (${R(mdeSiga)}). Informe o valor do demonstrativo da contabilidade para o índice exato.` });

    // FUNDEB
    const recFundeb = liq('1.7.5.1.50.0.0'), vaaf = liq('1.7.1.5.51.0.0'), vaat = liq('1.7.1.5.50.0.0'), vaar = liq('1.7.1.5.52.0.0'), eti = liq('1.7.1.5.53.0.0');
    r.fundeb_receitas = { impostos: recFundeb, vaaf, vaat, vaar };
    const fundebBase = comp.fundeb_base ?? (recFundeb + vaaf + vaat + eti);
    const fundeb70 = soma(L, l => FONTES_FUNDEB.has(l.fonte) && l.elemento.startsWith('3.1'), 'liq_mes');
    indices.push({ id: 'fundeb70', nome: 'FUNDEB 70% – Profissionais da Educação Básica', percentual_minimo: 70, base_calculo: fundebBase, valor_aplicado: fundeb70,
      texto: `No mês, o Município recebeu ${R(recFundeb)} do FUNDEB, ${R(vaaf)} de complementação VAAF, ${R(vaat)} de VAAT e ${R(vaar)} de VAAR. A remuneração dos profissionais da educação básica paga com recursos do FUNDEB somou ${R(fundeb70)}. A base considerada (${tem(comp.fundeb_base) ? 'informada pelo Controle Interno' : 'FUNDEB + VAAF + VAAT + ETI, sem VAAR e sem rendimentos de aplicação'}) foi de ${R(fundebBase)}.`,
      recomendacao: 'Continuar monitorando o cumprimento do mínimo de 70%.' });

    // VAAT
    const vaatInfantil = soma(L, l => l.fonte === '1542' && l.subfuncao === '365', 'liq_mes');
    const vaatCapital = soma(L, l => l.fonte === '1542' && l.elemento.startsWith('4.'), 'liq_mes');
    const vaatAte = liq('1.7.1.5.50.0.0', true);
    const vaatCapitalAte = soma(L, l => l.fonte === '1542' && l.elemento.startsWith('4.'), 'liq_ate');
    const vaatInfantilAte = soma(L, l => l.fonte === '1542' && l.subfuncao === '365', 'liq_ate');
    if (vaat || vaatAte) {
      indices.push({ id: 'vaat50', nome: 'VAAT 50% – Educação Infantil', percentual_minimo: 50, base_calculo: vaat, valor_aplicado: vaatInfantil,
        texto: `Foram aplicados ${R(vaatInfantil)} da complementação VAAT na educação infantil (subfunção 365). No acumulado, ${R(vaatInfantilAte)} sobre ${R(vaatAte)} recebidos (${P(vaatAte ? vaatInfantilAte / vaatAte * 100 : 0)}).`,
        recomendacao: 'Manter a aplicação mínima de 50% da complementação VAAT na educação infantil.' });
      const capAtePct = vaatAte ? vaatCapitalAte / vaatAte * 100 : 0;
      indices.push({ id: 'vaat15', nome: 'VAAT 15% – Despesas de Capital', percentual_minimo: 15, base_calculo: vaat, valor_aplicado: vaatCapital,
        texto: `Foram aplicados ${R(vaatCapital)} da complementação VAAT em despesas de capital no mês. No acumulado do exercício, ${R(vaatCapitalAte)} sobre ${R(vaatAte)} recebidos, ou ${P(capAtePct)} (mínimo de 15%).`,
        recomendacao: capAtePct < 15 ? `O acumulado do exercício está abaixo do mínimo: faltam ${R(vaatAte * 0.15 - vaatCapitalAte)} para atingir 15%.` : 'Manter a aplicação em despesas de capital.' });
      if (capAtePct < 15) conclusoes.push({ tipo: 'legal', nivel: 'urgente', titulo: 'VAAT em despesas de capital abaixo de 15% no acumulado',
        texto: `No acumulado do exercício, a aplicação da complementação VAAT em despesas de capital é de ${P(capAtePct)} (${R(vaatCapitalAte)}), abaixo do mínimo de 15% (${R(vaatAte * 0.15)}). É necessário programar investimentos com essa fonte até o fim do exercício.` });
    }
    // percentual aplicado = calculado (evita alerta falso na tela)
    indices.forEach(i => { i.percentual_aplicado = i.base_calculo ? i.valor_aplicado / i.base_calculo * 100 : 0; });
    indices.filter(i => i.percentual_aplicado < i.percentual_minimo && !['vaat15'].includes(i.id)).forEach(i =>
      conclusoes.push({ tipo: 'legal', nivel: 'atencao', titulo: `${i.nome} abaixo do mínimo no mês`, texto: `No mês, o índice ficou em ${P(i.percentual_aplicado)}, abaixo do mínimo de ${i.percentual_minimo}%. Como a apuração do TCM-BA é anual, recomenda-se compensar nos meses seguintes.` }));
  }
  r.indices_constitucionais = indices;

  // ─────────────── Pessoal ───────────────
  const pct = (d?: number, rcl?: number) => (d && rcl ? d / rcl * 100 : undefined);
  const calc = calcularPessoalSiga(p, comp);
  const despMes = comp.pessoal_despesa_mes ?? calc?.liquida;
  const rclMes = comp.pessoal_rcl_mes ?? calc?.rcl;
  if (calc && tem(comp.pessoal_despesa_mes) && Math.abs(calc.liquida - comp.pessoal_despesa_mes!) > 1)
    divergencias.push({ secao: 'Pessoal', descricao: `Despesa líquida informada (${R(comp.pessoal_despesa_mes!)}) difere da calculada pelo SIGA e ajustes (${R(calc.liquida)}). Diferença de ${R(comp.pessoal_despesa_mes! - calc.liquida)}.` });
  if (calc && tem(comp.pessoal_rcl_mes) && Math.abs(calc.rcl - comp.pessoal_rcl_mes!) > 1)
    divergencias.push({ secao: 'Pessoal', descricao: `RCL ajustada informada (${R(comp.pessoal_rcl_mes!)}) difere da calculada (${R(calc.rcl)}). Diferença de ${R(comp.pessoal_rcl_mes! - calc.rcl)}.` });
  const iMes = comp.pessoal_indice_mes ?? pct(despMes, rclMes);

  // 12 meses: valores informados ou soma dos 11 meses anteriores salvos no NEXUM + o mês atual
  let desp12 = comp.pessoal_despesa_12m, rcl12 = comp.pessoal_rcl_12m, origem12 = 'informado';
  let faltam12: string[] = [];
  if (!tem(desp12) && tem(despMes) && tem(rclMes) && competencia) {
    let d = despMes!, rr = rclMes!;
    for (let k = 1; k <= 11; k++) {
      const dt = new Date(Number(ano), Number(mes) - 1 - k, 1);
      const c = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const salvo = historico.find(h => h.competencia === c)?.data?.pessoal;
      if (salvo && tem(salvo.despesa_mes) && tem(salvo.rcl_mes)) { d += salvo.despesa_mes; rr += salvo.rcl_mes; }
      else faltam12.push(c.split('-').reverse().join('/'));
    }
    if (!faltam12.length) { desp12 = d; rcl12 = rr; origem12 = 'automatico'; }
  }
  const i12 = comp.pessoal_indice_12m ?? pct(desp12, rcl12);

  const pessoalSiga = p.despesa ? soma(L, l => l.elemento.startsWith('3.1'), 'liq_mes') : 0;
  if (tem(iMes) || tem(i12) || p.despesa) {
    const ref = i12 ?? iMes;
    const composicao = calc ? [
      { item: 'Vencimentos e vantagens fixas (3.1.90.11)', valor: calc.vencimentos, nivel: 2 },
      { item: 'Contratação por tempo determinado (3.1.90.04)', valor: calc.temporarios, nivel: 2 },
      { item: 'Consórcios públicos (3.1.71.70)', valor: calc.consorcios, nivel: 2 },
      { item: `Terceirização: 60% × (consultoria ${R(calc.consultoria)} + mão de obra ${R(calc.terceiros)})`, valor: calc.terceirizacao, nivel: 2 },
      { item: 'Despesa bruta com pessoal', valor: calc.bruta, total: true },
      { item: '(−) Agentes comunitários ACS/ACE (fonte 1604)', valor: -calc.acs, nivel: 2 },
      { item: `(−) Piso salarial da enfermagem${calc.enfermagemOrigem === 'siga' ? ' (fonte 1605)' : ''}`, valor: -calc.enfermagem, nivel: 2 },
      { item: 'Despesa líquida com pessoal', valor: calc.liquida, total: true },
      { item: 'Receita corrente do mês (SIGA)', valor: calc.receita, nivel: 2 },
      { item: '(−) Emendas individuais', valor: -calc.emendas, nivel: 2 },
      { item: '(−) Transferências para ACS/ACE', valor: -calc.transfAcs, nivel: 2 },
      { item: 'Receita Corrente Líquida ajustada', valor: calc.rcl, total: true },
    ] : undefined;
    r.pessoal = {
      indice: ref, indice_mes: iMes, indice_12m: i12,
      valor: desp12 ?? despMes, rcl: rcl12 ?? rclMes,
      despesa_mes: despMes, rcl_mes: rclMes, composicao,
      texto: `${tem(iMes) ? `No mês, a despesa líquida com pessoal${tem(despMes) ? ` de ${R(despMes!)}, sobre a Receita Corrente Líquida ajustada de ${R(rclMes!)},` : ''} correspondeu a ${P(iMes!)}${calc && !tem(comp.pessoal_despesa_mes) ? ', calculada a partir dos dados do SIGA e dos ajustes informados pelo Controle Interno' : ''}. ` : ''}` +
        `${calc && calc.indenizacoes ? `As indenizações trabalhistas (${R(calc.indenizacoes)}) não integram o cálculo, nos termos do art. 19, § 1º, I, da LRF. ` : ''}` +
        `${tem(i12) ? `Nos últimos 12 meses, a despesa com pessoal${tem(desp12) ? ` de ${R(desp12!)}, sobre a RCL ajustada de ${R(rcl12!)},` : ''} corresponde a ${P(i12!)}, índice considerado pelo TCM-BA${origem12 === 'automatico' ? ' (somados os relatórios salvos no NEXUM)' : ''}. ` : ''}` +
        `${!calc ? `Pelo SIGA, a despesa liquidada no grupo Pessoal e Encargos Sociais (3.1) foi de ${R(pessoalSiga)} no mês. ` : ''}` +
        `${!tem(ref) ? 'Informe os ajustes da planilha de pessoal para completar esta seção.' : ''}`,
      recomendacao: tem(ref) && ref! > 54 ? 'A despesa com pessoal está acima do limite máximo de 54% (art. 20, III, "b", da LRF). Aplicam-se as vedações do art. 22 e o prazo de recondução do art. 23 da LRF.' : 'Manter o acompanhamento do índice em relação aos limites de alerta (48,6%) e prudencial (51,3%).',
    };
    if (!tem(i12) && faltam12.length && faltam12.length < 11)
      divergencias.push({ secao: 'Pessoal – 12 meses', descricao: `Para calcular os 12 meses automaticamente, faltam relatórios salvos de: ${faltam12.join(', ')}. Informe os totais de 12 meses ou salve esses meses.` });
    r.resumo_geral = { ...(r.resumo_geral || {}), indice_pessoal: ref };
    if (tem(ref) && ref! > 54) conclusoes.push({ tipo: 'legal', nivel: 'urgente', titulo: 'Despesa com pessoal acima do limite da LRF',
      texto: `O índice de ${P(ref!)} ultrapassa o limite máximo de 54% da RCL, impondo as vedações do art. 22 da LRF e a necessidade de recondução ao limite (art. 23).` });
  }

  // ─────────────── Duodécimo ───────────────
  // Limite anual: informado uma vez no ano; nos meses seguintes vem do último relatório salvo do mesmo ano.
  // Acumulado: soma dos repasses dos meses anteriores salvos + o do mês.
  const salvosAno = historico
    .filter(h => ano && h.competencia?.startsWith(ano + '-') && h.competencia < competencia)
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
  const limSalvo = salvosAno.map(h => h.data?.complementos?.duodecimo_limite_anual).find(tem);
  const limDuo = comp.duodecimo_limite_anual ?? limSalvo;
  let ateDuo = comp.duodecimo_repassado_ate;
  if (!tem(ateDuo) && tem(comp.duodecimo_repassado_mes) && mes) {
    const faltamDuo: string[] = [];
    let acc = comp.duodecimo_repassado_mes!;
    for (let k = 1; k < Number(mes); k++) {
      const c = `${ano}-${String(k).padStart(2, '0')}`;
      const v = historico.find(h => h.competencia === c)?.data?.complementos?.duodecimo_repassado_mes;
      if (tem(v)) acc += v; else faltamDuo.push(c.split('-').reverse().join('/'));
    }
    if (!faltamDuo.length) ateDuo = acc;
    else divergencias.push({ secao: 'Duodécimo', descricao: `Para somar o acumulado do ano, faltam relatórios salvos com o repasse de: ${faltamDuo.join(', ')}. Informe o acumulado em "Ajustes opcionais" ou salve esses meses.` });
  }
  if (tem(comp.duodecimo_repassado_mes) || tem(limDuo)) {
    const ate = ateDuo ?? 0, lim = limDuo ?? 0;
    r.duodecimo = { valor_repassado: comp.duodecimo_repassado_mes, valor_previsto: lim,
      texto: `No mês, foram repassados ${R(comp.duodecimo_repassado_mes || 0)} à Câmara Municipal.${lim ? ` O limite anual divulgado pelo TCM-BA é de ${R(lim)}${ate ? `; o acumulado repassado é de ${R(ate)}, restando ${R(lim - ate)}` : ''}.` : ''}` };
    if (lim && ate > lim) conclusoes.push({ tipo: 'legal', nivel: 'urgente', titulo: 'Repasse ao Legislativo acima do limite', texto: `O acumulado repassado (${R(ate)}) supera o limite anual do TCM-BA (${R(lim)}).` });
  }

  // ─────────────── Licitações, contratos, dispensas ───────────────
  const reg = (l?: Listagem) => l?.registros || [];
  const achar = (o: Record<string, string>, ...chaves: string[]) => { for (const k of Object.keys(o)) if (chaves.some(c => k.toLowerCase().includes(c))) return o[k]; return ''; };
  if (p.contratos || p.dispensas || p.licitacoes) {
    const contratos = reg(p.contratos).map(o => ({ numero: achar(o, 'contrato'), fornecedor: achar(o, 'nome'), cnpj: achar(o, 'cpf'), procedimento: achar(o, 'licita') || achar(o, 'dispensa'), valor: valor(achar(o, 'valor')), publicacao: achar(o, 'publica') }));
    const dispensas = reg(p.dispensas).map(o => ({ processo: achar(o, 'processo'), fundamentacao: achar(o, 'fundamenta'), fornecedor: achar(o, 'fornecedor'), valor: valor(achar(o, 'valor')), publicacao: achar(o, 'publica') }));
    const homologadas = reg(p.licitacoes).map(o => ({ processo: achar(o, 'processo'), modalidade: achar(o, 'modalidade'), valor_estimado: valor(achar(o, 'valor')), publicacao: achar(o, 'publica') }));
    const tot = (xs: any[], k: string) => xs.reduce((a, x) => a + (x[k] || 0), 0);
    r.licitacoes = { contratos, dispensas, homologadas,
      texto: `No mês, foram informados ao SIGA ${contratos.length} contrato(s) de despesa (${R(tot(contratos, 'valor'))}), ${dispensas.length} processo(s) de dispensa ou inexigibilidade (${R(tot(dispensas, 'valor'))}) e ${homologadas.length} licitação(ões) homologada(s), com valor estimado de ${R(tot(homologadas, 'valor_estimado'))}.`,
      recomendacao: 'Manter a publicação tempestiva dos atos e o acompanhamento da execução contratual pelos fiscais designados.' };
    // dispensas sem contrato registrado no mês (só quando a listagem de contratos foi enviada)
    if (p.contratos) {
    const procContratos = new Set(contratos.map(c => c.procedimento));
    dispensas.filter(d => d.processo && !procContratos.has(d.processo)).forEach(d =>
      divergencias.push({ secao: 'Dispensas × Contratos', descricao: `${d.processo} (${d.fornecedor}, ${R(d.valor)}) não tem contrato informado neste mês. Verificar se o contrato foi assinado ou será informado no mês seguinte.` }));
    }
  }

  // ─────────────── Diárias: confere com a listagem de liquidados ───────────────
  if (p.liquidados && r.diarias) {
    const d = Object.entries(p.liquidados.elementos).filter(([k]) => k.startsWith('339014')).reduce((a, [, v]) => a + v.total, 0);
    if (Math.abs(d - r.diarias.valor) > 0.01) divergencias.push({ secao: 'Diárias', descricao: `Despesas Liquidadas (${R(d)}) ≠ Despesa Orçamentária (${R(r.diarias.valor)}).` });
  }

  r.almoxarifado = { texto: 'Informações sobre o almoxarifado não constam nos demonstrativos do SIGA. Complementar com os registros do setor de compras e almoxarifado, se houver.', recomendacao: '' };

  // ─────────────── Conclusão ───────────────
  if (divergencias.length) conclusoes.push({ tipo: 'operacional', nivel: 'atencao', titulo: 'Divergências nos dados do mês', texto: `A conferência automática encontrou ${divergencias.length} ponto(s) a verificar, detalhados no relatório. Recomenda-se o esclarecimento junto à contabilidade antes do envio ao TCM-BA.` });
  conclusoes.push({ tipo: 'operacional', nivel: 'informativo', titulo: 'Fonte dos dados', texto: 'Os dados deste relatório foram extraídos dos demonstrativos informados ao SIGA/TCM-BA, sem digitação manual, e conferidos automaticamente com os totais do próprio sistema.' });
  r.complementos = comp; // guardado junto ao relatório: alimenta duodécimo e 12 meses dos próximos meses
  const urg = conclusoes.filter(c => c.nivel === 'urgente');
  r.alerta_capa = urg.length ? urg.map(c => c.titulo).join('; ') + '.' : '';
  r.parecer_final =
    `Após a análise dos demonstrativos da execução orçamentária e financeira referentes a ${mesNome} de ${ano}, informados ao Sistema Integrado de Gestão e Auditoria (SIGA) do TCM-BA, este Controle Interno apresenta as constatações deste relatório, em observância à Resolução TCM-BA nº 1.120/2005.\n` +
    (urg.length ? `Destacam-se como pontos de maior gravidade: ${urg.map(c => c.titulo.toLowerCase()).join('; ')}. Recomenda-se à Administração a adoção imediata de medidas corretivas.\n` : 'Não foram identificadas irregularidades de maior gravidade nos dados analisados.\n') +
    'Este órgão permanece à disposição para o acompanhamento das recomendações e reforça a importância da conferência mensal dos dados antes de seu envio ao Tribunal.';
  return r;
}

// ───── Leitura dos arquivos no navegador ─────
// Lê os arquivos do SIGA no navegador e identifica cada relatório.

let pdfjsCache: any = null;
async function carregarPdfjs() {
  if (!pdfjsCache) {
    const pdfjs: any = await import('pdfjs-dist');
    const worker: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    pdfjsCache = pdfjs;
  }
  return pdfjsCache;
}

export interface ArquivoLido {
  nome: string;
  tipo: TipoSiga;
  competencia: string | null;
  dados: any;
  resumo: string;
  erro?: string;
}

async function paginasPdf(file: File): Promise<Paginas> {
  const pdfjs = await carregarPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: Paginas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const h = pg.getViewport({ scale: 1 }).height;
    const tc = await pg.getTextContent();
    out.push(tc.items
      .filter((i: any) => typeof i.str === 'string' && i.str.trim())
      .map((i: any): Palavra => ({ s: i.str, x0: i.transform[4], x1: i.transform[4] + i.width, top: h - i.transform[5] })));
  }
  return out;
}

/** Listagem "Informes Mensais" impressa em PDF: usa a posição das colunas do cabeçalho. */
function listagemDoPdf(paginas: Paginas, titulo: string) {
  const tabela: string[][] = [];
  let colunas: { nome: string; x: number }[] | null = null;
  for (const pag of paginas) for (const wl of linhas(pag)) {
    const toks = wl.map(w => w.s.trim());
    if (toks.some(t => /^Compet[êe]ncia$/i.test(t))) {
      colunas = wl.map(w => ({ nome: w.s.trim(), x: w.x0 }));
      if (!tabela.length) tabela.push(colunas.map(c => c.nome));
      continue;
    }
    if (!colunas) continue;
    const celulas = colunas.map(() => '');
    wl.forEach(w => {
      // coluna = a última cujo início está à esquerda da palavra
      const i = colunas!.reduce((best, c, k) => (c.x <= w.x0 + 4 ? k : best), 0);
      celulas[i] = (celulas[i] + ' ' + w.s.trim()).trim();
    });
    if (/^\d{2}\/\d{4}$/.test(celulas[0])) tabela.push(celulas);
    else if (tabela.length > 1) celulas.forEach((c, i) => { if (c) tabela[tabela.length - 1][i] += ' ' + c; }); // nome quebrado em 2 linhas
  }
  return lerListagem(titulo, tabela);
}

async function lerHtml(file: File): Promise<ArquivoLido> {
  const buf = await file.arrayBuffer();
  let html = new TextDecoder('utf-8').decode(buf);
  if (html.includes('\uFFFD')) html = new TextDecoder('windows-1252').decode(buf); // páginas antigas em Latin-1
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const titulo = doc.body?.textContent?.replace(/\s+/g, ' ') || '';
  const tabela = [...doc.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td,th')].map(td => (td.textContent || '').replace(/\s+/g, ' ').trim()));
  const l = lerListagem(titulo, tabela);
  return { nome: file.name, tipo: l.tipo, competencia: l.competencia, dados: l,
    resumo: `${l.registros.length} registro(s)`,
    erro: l.tipo === 'desconhecido' ? 'Página não reconhecida como listagem do SIGA.' : !l.registros.length ? 'Nenhum registro encontrado na página.' : undefined };
}

export async function lerArquivoSiga(file: File): Promise<ArquivoLido> {
  try {
    const nome = file.name.toLowerCase();
    if (nome.endsWith('.html') || nome.endsWith('.htm')) return await lerHtml(file);
    if (!nome.endsWith('.pdf')) return { nome: file.name, tipo: 'desconhecido', competencia: null, dados: null, resumo: '', erro: 'Envie PDFs do SIGA ou páginas salvas (.html).' };

    const pg = await paginasPdf(file);
    const tipo = detectarTipoPdf(pg);
    const R = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    switch (tipo) {
      case 'despesa_orcamentaria': {
        const d = lerDespesaOrcamentaria(pg);
        const liq = d.linhas.reduce((a, l) => a + l.v.liq_mes, 0);
        const ok = d.totalPoder && Math.abs(liq - d.totalPoder.liq_mes) < 0.01;
        return { nome: file.name, tipo, competencia: d.competencia, dados: d,
          resumo: `${d.linhas.length} linhas · liquidado ${R(liq)}${ok ? ' · confere com o total do SIGA' : ''}`,
          erro: !d.linhas.length ? 'Nenhuma linha de despesa encontrada.' : d.totalPoder && !ok ? 'A soma das linhas não bate com o total do SIGA.' : undefined };
      }
      case 'receita_agrupada': {
        const r = lerReceitaAgrupada(pg);
        return { nome: file.name, tipo, competencia: r.competencia, dados: r, resumo: `${Object.keys(r.contas).length} contas · arrecadado no mês ${R(r.resumo?.total_mes ?? 0)}`,
          erro: !Object.keys(r.contas).length ? 'Nenhuma conta de receita encontrada.' : undefined };
      }
      case 'conferencia': {
        const c = lerConferencia(pg);
        return { nome: file.name, tipo, competencia: c.competencia, dados: c, resumo: `Totais de despesa e receita para conferência`, erro: !c.despesa ? 'Totais não encontrados.' : undefined };
      }
      case 'despesas_liquidadas': {
        const l = lerDespesasLiquidadas(pg);
        const tot = Object.values(l.elementos).reduce((a, e) => a + e.total, 0);
        return { nome: file.name, tipo, competencia: l.competencia, dados: l, resumo: `${Object.keys(l.elementos).length} elementos · ${R(tot)}` };
      }
      case 'contratos': case 'dispensas': case 'licitacoes': {
        const titulo = pg[0].map(w => w.s).join(' ');
        const l = listagemDoPdf(pg, titulo);
        return { nome: file.name, tipo, competencia: l.competencia || competenciaDoTexto(titulo), dados: l, resumo: `${l.registros.length} registro(s)` };
      }
      default:
        return { nome: file.name, tipo, competencia: null, dados: null, resumo: '', erro: 'Relatório não reconhecido. Confira se é um dos relatórios do SIGA indicados.' };
    }
  } catch (e: any) {
    return { nome: file.name, tipo: 'desconhecido', competencia: null, dados: null, resumo: '', erro: `Não foi possível ler o arquivo: ${e?.message || e}` };
  }
}

// ───── Tela de importação ─────

// Relatórios esperados, na ordem de importância, com o caminho no SIGA Captura.
const ESPERADOS: { tipo: TipoSiga; onde: string; obrigatorio?: boolean }[] = [
  { tipo: 'despesa_orcamentaria', onde: 'Prestação de Contas › Despesa Orçamentária (PDF)', obrigatorio: true },
  { tipo: 'receita_agrupada', onde: 'Prestação de Contas › Receita Orçamentária Agrupada (PDF)' },
  { tipo: 'conferencia', onde: 'Prestação de Contas › Conferência (a partir 2024) dos Demonstrativos (PDF)' },
  { tipo: 'contratos', onde: 'Informes Mensais › Contratos de Despesa (salvar a página com Ctrl+S)' },
  { tipo: 'dispensas', onde: 'Informes Mensais › Dispensa/Inexigibilidade (Ctrl+S)' },
  { tipo: 'licitacoes', onde: 'Informes Mensais › Licitações Homologadas (Ctrl+S)' },
  { tipo: 'despesas_liquidadas', onde: 'Prestação de Contas › Despesas - Liquidadas (PDF)' },
];

const CHAVE: Partial<Record<TipoSiga, keyof PacoteSiga>> = {
  despesa_orcamentaria: 'despesa', receita_agrupada: 'receita', conferencia: 'conferencia',
  despesas_liquidadas: 'liquidados', contratos: 'contratos', dispensas: 'dispensas', licitacoes: 'licitacoes',
};

type Campo = { k: keyof Complementos; label: string; dica: string; tipo: 'pct' | 'rs' };
const rs = (k: keyof Complementos, label: string, dica: string): Campo => ({ k, label, dica, tipo: 'rs' });

// Sempre visíveis: o mínimo que não existe no SIGA.
const CAMPOS_MES: Campo[] = [
  rs('pessoal_terceiros', 'Serviços de terceiros de mão de obra', 'Planilha de pessoal: linha "Outros Serviços de Terceiros – PJ (39)" (+ PF 36)'),
  rs('pessoal_emendas', 'Emendas individuais', 'Planilha de pessoal: "Emendas Individuais". Vazio = 0'),
  rs('pessoal_transf_acs', 'Transferências para ACS/ACE', 'Planilha de pessoal: "Transferências do ACS e ACE – Fonte 604"'),
  rs('duodecimo_repassado_mes', 'Duodécimo repassado à Câmara', 'O acumulado do ano é somado pelos meses salvos'),
];
const CAMPO_ENFERMAGEM = rs('pessoal_enfermagem', 'Piso da enfermagem', '');
// Só aparece no 1º relatório do ano (depois é lembrado).
const CAMPO_LIMITE = rs('duodecimo_limite_anual', 'Limite anual do duodécimo', 'Valor divulgado pelo TCM-BA. Só é pedido uma vez por ano');
// Só aparecem se faltarem meses salvos no NEXUM.
const CAMPOS_12M: Campo[] = [
  rs('pessoal_despesa_12m', 'Despesa líquida com pessoal – 12 meses', 'Coluna "ANUAL" do demonstrativo de 12 meses'),
  rs('pessoal_rcl_12m', 'RCL ajustada – 12 meses', 'Coluna "ANUAL" do demonstrativo de 12 meses'),
];
// Recolhidos: só para conferir ou corrigir o que o NEXUM calcula.
const AVANCADOS: { titulo: string; campos: Campo[] }[] = [
  { titulo: 'Conferir pessoal com o total da contabilidade', campos: [
    rs('pessoal_despesa_mes', 'Despesa líquida com pessoal – mês', 'Se preencher, o NEXUM usa este valor e aponta a diferença'),
    rs('pessoal_rcl_mes', 'RCL ajustada – mês', 'Idem'),
  ] },
  { titulo: 'Índices de educação e saúde', campos: [
    rs('mde_aplicado', 'MDE – total aplicado no mês', 'Sem ele, o NEXUM estima pelo SIGA'),
    rs('base_impostos_transferencias', 'Base de impostos e transferências', 'Base do MDE e da Saúde'),
    rs('fundeb_base', 'FUNDEB – receita total do mês', 'Inclua os rendimentos, se houver'),
  ] },
  { titulo: 'Corrigir o duodécimo', campos: [
    rs('duodecimo_repassado_ate', 'Duodécimo repassado no ano', 'Só se o acumulado calculado estiver errado'),
    { ...CAMPO_LIMITE, dica: 'Só se o limite mudou no meio do ano' },
  ] },
];
const CAMPOS: Campo[] = [...CAMPOS_MES, CAMPO_ENFERMAGEM, CAMPO_LIMITE, ...CAMPOS_12M, ...AVANCADOS.flatMap(g => g.campos)]
  .filter((c, i, a) => a.findIndex(x => x.k === c.k) === i);


function ImportarSiga({ onGerar, historico = [] }: { onGerar: (relatorio: any) => void; historico?: any[] }) {
  const [arquivos, setArquivos] = useState<ArquivoLido[]>([]);
  const [lendo, setLendo] = useState(false);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [abrirCampos, setAbrirCampos] = useState(true);
  const [abrirAvancados, setAbrirAvancados] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const adicionar = async (files: FileList | File[]) => {
    const lista = [...files];
    if (!lista.length) return;
    setLendo(true);
    const lidos = await Promise.all(lista.map(lerArquivoSiga));
    // um arquivo por tipo: o mais recente substitui o anterior
    setArquivos(prev => {
      const novos = [...prev];
      lidos.forEach(l => {
        const i = l.tipo !== 'desconhecido' ? novos.findIndex(a => a.tipo === l.tipo) : -1;
        if (i >= 0) novos[i] = l; else novos.push(l);
      });
      return novos;
    });
    setLendo(false);
  };

  const validos = arquivos.filter(a => !a.erro && a.tipo !== 'desconhecido');
  const temDespesa = validos.some(a => a.tipo === 'despesa_orcamentaria');
  const comps = [...new Set(validos.map(a => a.competencia).filter(Boolean))] as string[];

  const montarPacote = (): PacoteSiga => {
    const pacote: PacoteSiga = {};
    validos.forEach(a => { const k = CHAVE[a.tipo]; if (k) (pacote as any)[k] = a.dados; });
    return pacote;
  };
  const montarComp = (): Complementos => {
    const comp: Complementos = {};
    CAMPOS.forEach(c => { const v = (campos[c.k] || '').trim(); if (v) (comp as any)[c.k] = valor(v.includes(',') ? v : v.replace('.', ',')); });
    return comp;
  };

  // prévia do índice de pessoal enquanto o controlador digita
  const comp = montarComp();
  const calc = calcularPessoalSiga(montarPacote(), comp);
  const despMes = comp.pessoal_despesa_mes ?? calc?.liquida;
  const rclMes = comp.pessoal_rcl_mes ?? calc?.rcl;
  const fmtR = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtP = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const iMes = despMes && rclMes ? despMes / rclMes * 100 : null;
  const i12 = comp.pessoal_despesa_12m && comp.pessoal_rcl_12m ? comp.pessoal_despesa_12m / comp.pessoal_rcl_12m * 100 : null;
  const temPessoalNosAjustes = ['pessoal_terceiros', 'pessoal_enfermagem', 'pessoal_emendas', 'pessoal_transf_acs'].some(k => (campos[k] || '').trim());

  const gerar = () => onGerar(montarRelatorio(montarPacote(), montarComp(), historico));

  // O que pedir depende do que já está salvo no NEXUM para esta prefeitura.
  const compAtual = comps[0] || '';
  const salvo = (c: string) => historico.find(h => h.competencia === c)?.data;
  const faltam12 = compAtual ? mesesAnteriores(compAtual, 11).filter(c => !(salvo(c)?.pessoal?.despesa_mes && salvo(c)?.pessoal?.rcl_mes)) : [];
  const anoAtual = compAtual.split('-')[0];
  const limiteSalvo = historico.some(h => h.competencia?.startsWith(anoAtual + '-') && h.competencia < compAtual && h.data?.complementos?.duodecimo_limite_anual != null);
  const pedirLimite = !!compAtual && !limiteSalvo;
  const enfSiga = enfermagemSiga(montarPacote());
  const nAvancados = AVANCADOS.flatMap(g => g.campos).filter(c => (campos[c.k] || '').trim()).length;

  const campo = (c: Campo, placeholder = 'R$ 0,00') => (
    <label key={c.k} className="block text-sm">
      <span className="font-bold text-slate-700">{c.label}</span>
      <input inputMode="decimal" value={campos[c.k] || ''} onChange={e => setCampos({ ...campos, [c.k]: e.target.value })}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40" />
      {c.dica && <span className="text-xs text-slate-400">{c.dica}</span>}
    </label>
  );

  return (
    <div className="text-left space-y-8">
      {/* Área de envio */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={e => { e.preventDefault(); setArrastando(false); adicionar(e.dataTransfer.files); }}
        className={cn('rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
          arrastando ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary hover:bg-slate-50')}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.html,.htm" className="hidden"
          onChange={e => { adicionar(e.target.files || []); e.target.value = ''; }} />
        {lendo ? <Loader2 className="mx-auto text-primary animate-spin" size={28} /> : <Upload className="mx-auto text-slate-400" size={28} />}
        <p className="mt-3 font-black text-slate-900">{lendo ? 'Lendo arquivos...' : 'Arraste aqui os relatórios do SIGA'}</p>
        <p className="text-sm text-slate-500">PDFs e páginas salvas (.html) do mesmo mês. Pode enviar vários de uma vez.</p>
      </div>

      {comps.length > 1 && (
        <div className="flex gap-2 items-start rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          Os arquivos são de meses diferentes ({comps.join(', ')}). Envie todos da mesma competência.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Lista do que é esperado */}
        <div>
          <h3 className="font-black text-slate-900 mb-3">Relatórios do SIGA</h3>
          <ul className="space-y-2">
            {ESPERADOS.map(e => {
              const a = validos.find(x => x.tipo === e.tipo);
              return (
                <li key={e.tipo} className="flex gap-3 items-start text-sm">
                  {a ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" /> : <Circle size={18} className="text-slate-300 shrink-0 mt-0.5" />}
                  <div>
                    <div className={cn('font-bold', a ? 'text-slate-900' : 'text-slate-500')}>
                      {NOME_TIPO[e.tipo]}{e.obrigatorio && !a && <span className="text-rose-600 font-normal"> (obrigatório)</span>}
                    </div>
                    <div className="text-xs text-slate-500">{a ? a.resumo : e.onde}</div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-400 mt-4">
            No SIGA, confira a competência no topo da tela <em>e</em> nos campos de mês/ano da própria tela antes de gerar cada relatório.
          </p>
        </div>

        {/* Arquivos enviados */}
        <div>
          <h3 className="font-black text-slate-900 mb-3">Arquivos enviados ({arquivos.length})</h3>
          {!arquivos.length && <p className="text-sm text-slate-400">Nenhum arquivo ainda.</p>}
          <ul className="space-y-2">
            {arquivos.map((a, i) => (
              <li key={i} className={cn('flex gap-3 items-start rounded-xl border p-3 text-sm', a.erro ? 'border-rose-200 bg-rose-50' : 'border-slate-200')}>
                <FileText size={18} className={cn('shrink-0 mt-0.5', a.erro ? 'text-rose-500' : 'text-slate-400')} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 truncate">{a.nome}</div>
                  <div className={cn('text-xs', a.erro ? 'text-rose-700' : 'text-slate-500')}>
                    {a.erro || `${NOME_TIPO[a.tipo]}${a.competencia ? ` · ${a.competencia.split('-').reverse().join('/')}` : ''}`}
                  </div>
                </div>
                <button onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))} aria-label="Remover arquivo" className="text-slate-400 hover:text-rose-600">
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Complementos */}
      <div className="rounded-2xl border border-slate-200">
        <button onClick={() => setAbrirCampos(!abrirCampos)} className="w-full flex justify-between items-center p-4 text-left">
          <div>
            <div className="font-black text-slate-900">Dados que não estão no SIGA</div>
            <div className="text-xs text-slate-500">Só o que o SIGA não traz. Campos vazios ficam de fora do relatório.</div>
          </div>
          <ChevronDown size={18} className={cn('text-slate-400 transition-transform', abrirCampos && 'rotate-180')} />
        </button>
        {abrirCampos && (
          <div className="p-4 pt-0 space-y-6">
            <div>
              <div className="font-bold text-slate-800 text-sm">Do mês</div>
              <div className="text-xs text-slate-500 mb-3">Da planilha de pessoal da contabilidade (coluna do mês). Todo o resto vem do SIGA.</div>
              <div className="grid sm:grid-cols-2 gap-4">
                {CAMPOS_MES.map(c => campo(c))}
                {campo({ ...CAMPO_ENFERMAGEM, dica: enfSiga !== null
                  ? `Vazio = usa o SIGA (fonte 1605): ${fmtR(enfSiga)}. Digite 0 para não deduzir`
                  : 'Vazio = calculado pelo SIGA (fonte 1605) ao enviar a Despesa Orçamentária' },
                  enfSiga !== null ? fmtR(enfSiga) : 'automático')}
                {pedirLimite && campo(CAMPO_LIMITE)}
              </div>
              {temPessoalNosAjustes && !calc && (
                <p className="mt-3 text-xs text-amber-700">Envie a Despesa Orçamentária e a Receita Agrupada (ou a Conferência) para o NEXUM calcular.</p>
              )}
              {calc && (
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 grid sm:grid-cols-2 gap-x-6 gap-y-1">
                  <span>Vencimentos + temporários + consórcios (SIGA)</span><span className="text-right">{fmtR(calc.vencimentos + calc.temporarios + calc.consorcios)}</span>
                  <span>Terceirização (60% × consultoria {fmtR(calc.consultoria)} + mão de obra)</span><span className="text-right">{fmtR(calc.terceirizacao)}</span>
                  <span>(−) ACS/ACE fonte 1604 (SIGA) e enfermagem{calc.enfermagemOrigem === 'siga' ? ' fonte 1605 (SIGA)' : ''}</span><span className="text-right">−{fmtR(calc.acs + calc.enfermagem)}</span>
                  <span className="font-bold text-slate-800">Despesa líquida com pessoal</span><span className="text-right font-bold text-slate-800">{fmtR(calc.liquida)}</span>
                  <span>Receita do mês (SIGA) − emendas − ACS/ACE</span><span className="text-right">{fmtR(calc.receita)} − {fmtR(calc.emendas + calc.transfAcs)}</span>
                  <span className="font-bold text-slate-800">RCL ajustada</span><span className="text-right font-bold text-slate-800">{fmtR(calc.rcl)}</span>
                </div>
              )}
            </div>

            {compAtual && faltam12.length > 0 && (
              <div>
                <div className="font-bold text-slate-800 text-sm">Últimos 12 meses</div>
                <div className="text-xs text-slate-500 mb-3">
                  {faltam12.length === 11
                    ? 'Ainda não há meses anteriores salvos no NEXUM. Informe os totais de 12 meses ou deixe em branco para mostrar só o índice do mês.'
                    : `Faltam salvos: ${faltam12.map(c => c.split('-').reverse().join('/')).join(', ')}. Salve esses meses e este bloco some.`}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">{CAMPOS_12M.map(c => campo(c))}</div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200">
              <button onClick={() => setAbrirAvancados(!abrirAvancados)} className="w-full flex justify-between items-center p-3 text-left">
                <span className="text-sm font-bold text-slate-700">
                  Ajustes opcionais{nAvancados ? ` (${nAvancados} preenchido${nAvancados > 1 ? 's' : ''})` : ''}
                  <span className="block text-xs font-normal text-slate-500">Só para conferir ou corrigir o que o NEXUM calcula. Pode ignorar.</span>
                </span>
                <ChevronDown size={16} className={cn('text-slate-400 transition-transform', abrirAvancados && 'rotate-180')} />
              </button>
              {abrirAvancados && (
                <div className="p-3 pt-0 space-y-4">
                  {AVANCADOS.map(g => (
                    <div key={g.titulo}>
                      <div className="text-xs font-bold text-slate-600 mb-2">{g.titulo}</div>
                      <div className="grid sm:grid-cols-2 gap-4">{g.campos.map(c => campo(c))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(iMes !== null || i12 !== null) && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm flex flex-wrap gap-x-8 gap-y-1">
                <span className="font-bold text-slate-700">Índice de pessoal:</span>
                {iMes !== null && <span>Mês: <strong className={iMes > 54 ? 'text-rose-600' : 'text-emerald-700'}>{fmtP(iMes)}</strong></span>}
                {i12 !== null && <span>12 meses: <strong className={i12 > 54 ? 'text-rose-600' : 'text-emerald-700'}>{fmtP(i12)}</strong></span>}
                {i12 === null && iMes !== null && <span className="text-slate-500">12 meses: calculado ao gerar, se os meses anteriores estiverem salvos</span>}
                <span className="text-slate-400">Limite máximo: 54%</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={gerar} disabled={!temDespesa || lendo}
          className="px-6 py-3 rounded-xl bg-primary text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90">
          Gerar relatório
        </button>
      </div>
      {!temDespesa && arquivos.length > 0 && (
        <p className="text-right text-xs text-slate-500">Para gerar, envie pelo menos a Despesa Orçamentária.</p>
      )}
    </div>
  );
}