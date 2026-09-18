import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
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
import { analyzeDataForReport } from '../../services/geminiService';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function RelatorioExecutivo() {
  const [reportData, setReportData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      alert(`Relatório de ${reportData.periodo} salvo com sucesso!`);
      loadHistory();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar relatório. Verifique se a tabela relatorios_executivos existe.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Deseja excluir este relatório?')) return;
    try {
      await supabase.from('relatorios_executivos').delete().eq('id', id);
      loadHistory();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const extractTextFromPdf = async (data: ArrayBuffer): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPdf(arrayBuffer);
        const analysis = await analyzeDataForReport(text, true);
        setReportData(analysis);
      } else {
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              resolve(XLSX.utils.sheet_to_json(ws));
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsBinaryString(file);
        });
        
        const analysis = await analyzeDataForReport(data, false);
        setReportData(analysis);
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
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Relatório Executivo</h1>
            <p className="text-slate-500 font-medium">Análise gerencial da gestão municipal via IA.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setReportData(null); }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <RefreshCw size={18} /> Novo Relatório
            </button>
            <button 
              onClick={handlePrint}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Printer size={18} /> Imprimir / PDF
            </button>
          </div>
        </div>

        {/* CSS for print/report is scoped here */}
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');
          
          .report-root {
            --azul: #0d2d5e;
            --azul-md: #1a4a8a;
            --azul-lt: #e6edf8;
            --ouro: #b8922a;
            --ouro-lt: #f7f0e0;
            --verde: #155f3a;
            --verde-lt: #e3f4eb;
            --vermelho: #b52222;
            --vermelho-lt: #fbeaea;
            --laranja: #c96a00;
            --laranja-lt: #fef3e2;
            --cinza: #f5f6f8;
            --borda: #dde2ea;
            --txt: #1a2535;
            --txt2: #4b5870;
            --branco: #ffffff;
          }

          .report-root * { box-sizing: border-box; }
          .report-root { font-family: 'Source Sans 3', sans-serif; font-size: 14px; color: var(--txt); background: var(--branco); line-height: 1.65; max-width: 960px; margin: 0 auto; }
          
          .report-capa { background: var(--azul); color: #fff; position: relative; overflow: hidden; }
          .report-capa-topo { background: var(--ouro); height: 6px; }
          .report-capa-corpo { padding: 44px 60px 40px; position: relative; z-index: 1; }
          .report-capa-topo-row { display: flex; align-items: center; gap: 16px; margin-bottom: 40px; }
          .report-capa-brasao { width: 54px; height: 54px; background: var(--ouro); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; }
          .report-capa-org { font-size: 13px; line-height: 1.5; opacity: .85; }
          .report-capa-org strong { display: block; font-size: 15px; font-weight: 600; opacity: 1; }
          .report-capa-rotulo { font-size: 11px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: var(--ouro); margin-bottom: 12px; }
          .report-capa h1 { font-family: 'Playfair Display', serif; font-size: 46px; font-weight: 700; line-height: 1.1; margin-bottom: 8px; }
          .report-capa-subtitulo { font-size: 16px; opacity: .7; margin-bottom: 40px; }
          .report-capa-rodape { border-top: 1px solid rgba(255,255,255,.15); padding-top: 22px; display: flex; gap: 36px; }
          .report-capa-item-label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; opacity: .55; margin-bottom: 3px; }
          .report-capa-item-val { font-size: 13px; font-weight: 500; }

          .report-faixa-alerta { background: var(--vermelho); color: #fff; padding: 12px 60px; display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 500; }
          
          .report-corpo { padding: 0 60px 60px; }
          .report-secao { padding-top: 44px; }
          .report-secao-cabecalho { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 2.5px solid var(--azul-lt); }
          .report-secao-num { width: 34px; height: 34px; background: var(--azul); color: #fff; border-radius: 9px; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .report-secao-titulo { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: var(--azul); }
          
          .report-mgrid { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); }
          .report-mcard { background: var(--cinza); border: 1px solid var(--borda); border-radius: 12px; padding: 16px 18px; }
          .report-mcard.azul { background: var(--azul); border-color: var(--azul); }
          .report-mlabel { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .09em; color: var(--txt2); margin-bottom: 6px; }
          .report-mcard.azul .report-mlabel { color: rgba(255,255,255,.65); }
          .report-mval { font-size: 21px; font-weight: 600; color: var(--txt); line-height: 1.1; }
          .report-mcard.azul .report-mval { color: #fff; }
          .report-msub { font-size: 11px; color: var(--txt2); margin-top: 4px; }
          .report-mcard.azul .report-msub { color: rgba(255,255,255,.55); }

          .report-box { border-radius: 10px; padding: 16px 20px; margin-bottom: 14px; border: 1px solid; border-left-width: 4px; }
          .report-box-crit { background: var(--vermelho-lt); border-color: #f2b8b8; border-left-color: var(--vermelho); }
          .report-box-titulo { font-size: 13px; font-weight: 600; margin-bottom: 5px; }
          .report-box-crit .report-box-titulo { color: var(--vermelho); }
          
          .report-tabela { width: 100%; border-collapse: collapse; font-size: 13px; }
          .report-tabela th { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .09em; color: var(--txt2); padding: 9px 12px; background: var(--cinza); border-bottom: 1px solid var(--borda); text-align: left; }
          .report-tabela td { padding: 11px 12px; border-bottom: 1px solid var(--borda); }

          @media print {
            body * { visibility: hidden; }
            .report-root, .report-root * { visibility: visible; }
            .report-root { position: absolute; left: 0; top: 0; }
          }
        `}} />

        <div className="report-root border border-slate-200 rounded-3xl overflow-hidden shadow-2xl">
          {/* HEADER DE AÇÕES */}
          <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border-b border-slate-200 print:hidden">
             <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} /> {isSaving ? "Salvando..." : "Salvar em Competência"}
            </button>
            <button 
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Printer size={18} /> Imprimir / PDF
            </button>
          </div>

          {/* CAPA */}
          <div className="report-capa">
            <div className="report-capa-topo"></div>
            <div className="report-capa-corpo">
              <div className="report-capa-topo-row">
                <div className="report-capa-brasao">⚖</div>
                <div className="report-capa-org">
                  <strong>Prefeitura Municipal de Coaraci — BA</strong>
                  Controladoria-Geral do Município
                </div>
              </div>
              <div className="report-capa-rotulo">Relatório Executivo · Controle Interno Municipal</div>
              <h1>{reportData.periodo}</h1>
              <div className="report-capa-subtitulo">
                Síntese gerencial para o Excelentíssimo Sr. Prefeito<br />
                <strong style={{ opacity: 1, fontWeight: 700 }}>Milton Dias Cerqueira Micheli Santos</strong>
              </div>
              <div className="report-capa-rodape">
                <div><div className="report-capa-item-label">Elaborado por</div><div className="report-capa-item-val">Igor Silva Soares Carvalho</div></div>
                <div><div className="report-capa-item-label">Cargo</div><div className="report-capa-item-val">Controlador-Geral do Município</div></div>
                <div><div className="report-capa-item-label">Emissão</div><div className="report-capa-item-val">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div></div>
              </div>
            </div>
          </div>

          {/* FAIXA ALERTA */}
          <div className="report-faixa-alerta">
            {reportData.alerta_capa}
          </div>

          <div className="report-corpo">
            {/* 01. RESUMO EXECUTIVO */}
            <div className="report-secao">
              <div className="report-secao-cabecalho">
                <div className="report-secao-num">01</div>
                <div className="report-secao-titulo">Resumo Executivo (Financeiro)</div>
              </div>
              <div className="report-mgrid">
                <div className="report-mcard azul">
                  <div className="report-mlabel">Receita Líquida (RCL)</div>
                  <div className="report-mval">{formatCompact(reportData.resumo_geral?.receita_corrente_liquida)}</div>
                  <div className="report-msub">Base de Cálculo LRF</div>
                </div>
                <div className="report-mcard">
                  <div className="report-mlabel">Total Liquidado</div>
                  <div className="report-mval">{formatCompact(reportData.resumo_geral?.despesa_total_liquidada)}</div>
                  <div className="report-msub">Execução Realizada</div>
                </div>
                <div className="report-mcard">
                  <div className="report-mlabel">Resultado Orc.</div>
                  <div className="report-mval" style={{ color: (reportData.resumo_geral?.resultado_orcamentario || 0) < 0 ? 'var(--vermelho)' : 'var(--verde)' }}>
                    {formatCompact(reportData.resumo_geral?.resultado_orcamentario)}
                  </div>
                  <div className="report-msub">Superávit/Déficit</div>
                </div>
                <div className="report-mcard">
                  <div className="report-mlabel">RP Pagos</div>
                  <div className="report-mval">{formatCompact(reportData.resumo_geral?.restos_a_pagar_pagos)}</div>
                  <div className="report-msub">Exercícios Anteriores</div>
                </div>
              </div>
            </div>

            {/* 02. RECEITAS DETALHADAS */}
            <div className="report-secao">
              <div className="report-secao-cabecalho">
                <div className="report-secao-num">02</div>
                <div className="report-secao-titulo">Detalhamento das Receitas</div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-4 px-2">Recursos Próprios (Tesouro)</h4>
                  <table className="report-tabela">
                    <tbody>
                      <tr><td>IPTU</td><td className="text-right font-bold">{formatCurrency(reportData.detalhamento_receitas?.proprias?.iptu)}</td></tr>
                      <tr><td>ISS</td><td className="text-right font-bold">{formatCurrency(reportData.detalhamento_receitas?.proprias?.iss)}</td></tr>
                      <tr><td>ITBI</td><td className="text-right font-bold">{formatCurrency(reportData.detalhamento_receitas?.proprias?.itbi)}</td></tr>
                      <tr><td>IRRF</td><td className="text-right font-bold">{formatCurrency(reportData.detalhamento_receitas?.proprias?.irrf)}</td></tr>
                      <tr className="bg-slate-50"><td className="font-bold">TOTAL PRÓPRIAS</td><td className="text-right font-bold">
                        {formatCurrency(Object.values(reportData.detalhamento_receitas?.proprias || {}).reduce((a:any, b:any) => Number(a) + Number(b), 0))}
                      </td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-4 px-2">Transferências Legais / Constitucionais</h4>
                  <table className="report-tabela">
                    <tbody>
                      <tr><td>FPM (Bruto)</td><td className="text-right font-bold">{formatCurrency(reportData.detalhamento_receitas?.transferencias?.fpm)}</td></tr>
                      <tr><td>ICMS</td><td className="text-right font-bold">{formatCurrency(reportData.detalhamento_receitas?.transferencias?.icms)}</td></tr>
                      <tr><td>FUNDEB</td><td className="text-right font-bold">{formatCurrency(reportData.detalhamento_receitas?.transferencias?.fundeb)}</td></tr>
                      <tr><td>SUS / FNS</td><td className="text-right font-bold">{formatCurrency(reportData.detalhamento_receitas?.transferencias?.sus)}</td></tr>
                      <tr className="bg-slate-50"><td className="font-bold">TOTAL TRANSF.</td><td className="text-right font-bold">
                        {formatCurrency(Object.values(reportData.detalhamento_receitas?.transferencias || {}).reduce((a:any, b:any) => Number(a) + Number(b), 0))}
                      </td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 03. PESSOAL LRF */}
            <div className="report-secao">
              <div className="report-secao-cabecalho">
                <div className="report-secao-num">03</div>
                <div className="report-secao-titulo">Despesa com Pessoal — LRF</div>
              </div>
              <div className={cn(
                "report-box",
                reportData.detalhamento_pessoal?.alerta_lrf === 'critico' ? 'report-box-crit' : 'report-box-info'
              )}>
                <div className="report-box-titulo">Enquadramento Legal (Art. 20 III LRF)</div>
                <div className="report-box-texto">
                  O índice de pessoal no mês de {reportData.periodo} foi de <strong>{reportData.detalhamento_pessoal?.indice_mes}</strong>. 
                  O acumulado projetado de 12 meses situa-se em <strong>{reportData.detalhamento_pessoal?.indice_12m}</strong>, {
                    reportData.detalhamento_pessoal?.alerta_lrf === 'critico' 
                    ? 'SUPERANDO o limite máximo de 54%, exigindo plano de contenção imediato.' 
                    : 'dentro dos parâmetros de controle.'
                  }
                </div>
              </div>
              <div className="report-mgrid">
                <div className="report-mcard">
                  <div className="report-mlabel">Gasto Líquido</div>
                  <div className="report-mval">{formatCompact(reportData.detalhamento_pessoal?.valor_liquido_pessoal)}</div>
                </div>
                <div className="report-mcard">
                  <div className="report-mlabel">RCL Ajustada</div>
                  <div className="report-mval">{formatCompact(reportData.detalhamento_pessoal?.rcl_ajustada)}</div>
                </div>
                <div className="report-mcard">
                  <div className="report-mlabel">Índice Mês</div>
                  <div className="report-mval text-primary">{reportData.detalhamento_pessoal?.indice_mes}</div>
                </div>
                <div className="report-mcard">
                  <div className="report-mlabel">Projeção 12m</div>
                  <div className="report-mval" style={{ color: reportData.detalhamento_pessoal?.alerta_lrf === 'critico' ? 'var(--vermelho)' : 'inherit' }}>
                    {reportData.detalhamento_pessoal?.indice_12m}
                  </div>
                </div>
              </div>
            </div>

            {/* 04. DETERMINAÇÕES CONSTITUCIONAIS */}
            <div className="report-secao">
              <div className="report-secao-cabecalho">
                <div className="report-secao-num">04</div>
                <div className="report-secao-titulo">Determinações Constitucionais</div>
              </div>
              <table className="report-tabela">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>Mínimo Legal</th>
                    <th>Aplicado (%)</th>
                    <th>Valor Realizado</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.indices_constitucionais?.map((det: any, idx: number) => (
                    <tr key={idx}>
                      <td>{det.nome}</td>
                      <td>{det.minimo}</td>
                      <td className="font-bold">{det.aplicado}</td>
                      <td>{formatCurrency(det.valor)}</td>
                      <td>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                          det.status === 'ok' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {det.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 05. DESPESAS POR SECRETARIA */}
            <div className="report-secao">
              <div className="report-secao-cabecalho">
                <div className="report-secao-num">05</div>
                <div className="report-secao-titulo">Execução por Secretaria / Função</div>
              </div>
              <table className="report-tabela">
                <thead>
                  <tr>
                    <th>Secretaria</th>
                    <th className="text-right">Empenhado</th>
                    <th className="text-right">Liquidado</th>
                    <th className="text-right">Pago</th>
                    <th className="text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.despesas_por_secretaria?.map((sec: any, idx: number) => (
                    <tr key={idx}>
                      <td>{sec.nome}</td>
                      <td className="text-right">{formatCompact(sec.empenhado)}</td>
                      <td className="text-right">{formatCompact(sec.liquidado)}</td>
                      <td className="text-right">{formatCompact(sec.pago)}</td>
                      <td className="text-right font-bold">{sec.percentual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 06. CONCLUSÕES TÉCNICAS */}
            <div className="report-secao">
              <div className="report-secao-cabecalho">
                <div className="report-secao-num">06</div>
                <div className="report-secao-titulo">Parecer do Controle Interno</div>
              </div>
              <div className="space-y-4">
                {reportData.conclusoes_tecnicas?.map((rec: any, idx: number) => (
                  <div key={idx} className="flex gap-4 items-start border-b border-slate-100 pb-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                      rec.nivel === 'urgente' ? "bg-rose-600 text-white" : "bg-slate-900 text-white"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <strong className="text-slate-900 uppercase text-xs">{rec.titulo}</strong>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-black uppercase",
                          rec.tipo === 'financeiro' ? "bg-blue-100 text-blue-700" :
                          rec.tipo === 'legal' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                        )}>{rec.tipo}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{rec.texto}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="report-capa py-10 px-12 border-t border-white/10 flex justify-between items-center text-[11px] opacity-70">
            <div>
              <strong>Prefeitura Municipal de Coaraci — BA</strong><br />
              Av. Joaquim Miguel Gally Galvão, 244 Centro — CEP 45638-000
            </div>
            <div className="text-right">
              <strong>Igor Silva Soares Carvalho</strong><br />
              Controlador-Geral — {reportData.periodo}
            </div>
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
        
        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-4">Relatório Executivo IA</h1>
        <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto mb-12">
          Faça upload da planilha da contabilidade (Excel) ou relatório em PDF para gerar automaticamente o parecer técnico do controle interno.
        </p>

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx, .xls, .pdf"
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

        {error && (
          <div className="mt-8 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 max-w-lg mx-auto">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
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
                    <button 
                      onClick={() => deleteReport(item.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
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
    </div>
  );
}
