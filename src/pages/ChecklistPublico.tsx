import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertCircle, User, Clock, MapPin, Send, Loader2, ShieldCheck, ClipboardList } from 'lucide-react';
import { ChecklistItem } from '../types';
import { fetchChecklistPublic, fetchChecklistsByDate, saveChecklistConfirmation, saveBatchChecklistConfirmation } from '../services/checklists.ts';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ChecklistPublico() {
  const { id: paramsId, date: paramsDate } = useParams<{ id?: string, date?: string }>();
  const location = useLocation();
  const [id, setId] = useState<string | null>(paramsId || null);
  const [date, setDate] = useState<string | null>(paramsDate || null);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [fornecedoresChecados, setFornecedoresChecados] = useState<Record<string, boolean>>({});

  const isBatchMode = location.pathname.includes('/checklist/dia/');

  useEffect(() => {
    if (!id && !date) {
      // Tenta extrair primeiro do useParams (se o Router estiver configurado com rotas)
      if (paramsId) {
        setId(paramsId);
        return;
      }
      if (paramsDate) {
        setDate(paramsDate);
        return;
      }

      // Fallback: Parsing manual robusto da URL
      const path = window.location.pathname;
      const parts = path.split('/').filter(Boolean); // Remove strings vazias
      
      const checklistIdx = parts.indexOf('checklist');
      if (checklistIdx !== -1) {
        if (parts[checklistIdx + 1] === 'dia') {
          if (parts[checklistIdx + 2]) {
            setDate(parts[checklistIdx + 2]);
          }
        } else if (parts[checklistIdx + 1]) {
          setId(parts[checklistIdx + 1]);
        }
      }
    }
  }, [id, date, paramsId, paramsDate]);

  useEffect(() => {
    const loadData = async () => {
      // Se ainda não temos ID nem Data (esperando o outro useEffect extrair da URL), não fazemos nada
      if (!id && !date) return;

      setLoading(true);
      setError(null);

      try {
        if (isBatchMode && date) {
          const data = await fetchChecklistsByDate(date);
          if (data && data.length > 0) {
            setChecklists(data);
            // Inicializar fornecedores checados
            const initialChecados: Record<string, boolean> = {};
            data.forEach((c, idx) => {
              initialChecados[`vendor-${idx}`] = true;
            });
            setFornecedoresChecados(initialChecados);
          } else {
            setError('Nenhum checklist encontrado para esta data.');
          }
        } else if (id) {
          const data = await fetchChecklistPublic(id);
          if (data) {
            setChecklists([data]);
          } else {
            setError('Checklist não encontrado ou link inválido.');
          }
        }
      } catch (err) {
        console.error('Erro ao carregar:', err);
        setError('Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, date, isBatchMode]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    if (isBatchMode && checklists.length === 0) return;
    if (!isBatchMode && !id) return;

    setIsSubmitting(true);
    
    // Lógica de fornecedores confirmados
    const fornecedoresUnicos = checklists
      .map((c, idx) => ({ vendor: c.vendor, id: `vendor-${idx}` }))
      .filter((v, i, a) => a.findIndex(x => x.vendor === v.vendor) === i);

    const fornecedoresConfirmados = fornecedoresUnicos
      .filter(f => fornecedoresChecados[f.id] !== false)
      .map(f => f.vendor)
      .join(', ') || 'N/A';

    let result;
    
    if (isBatchMode) {
      // Filtrar checklists pelos fornecedores checados
      const checklistsFiltrados = checklists.filter((c, idx) => {
        const uniqueInfo = fornecedoresUnicos.find(u => u.vendor === c.vendor);
        return uniqueInfo && fornecedoresChecados[uniqueInfo.id] !== false;
      });
      result = await saveBatchChecklistConfirmation(checklistsFiltrados, nome.trim());
    } else {
      result = await saveChecklistConfirmation(checklists[0], nome.trim());
    }
    
    if (result.success) {
      // Integração solicitada: salvar recibo digital no Supabase
      try {
        const nomeCompleto = nome.trim();
        const processoNumero = checklists[0]?.processNumber || 'N/A';
        const notaFiscal = checklists[0]?.invoiceValue || 'N/A';
        const documentosConfirmados = checklists.flatMap(c => 
          (c.items || []).filter(i => i.checked).map(i => i.label)
        ).filter((v, i, a) => a.indexOf(v) === i);
        const processosRecebidos = checklists.map(c => c.processNumber);

        const { error: insertError } = await supabase
          .from('recibos_digitais')
          .insert([{
            nome_receptor: nomeCompleto, // O nome digitado
            data_hora_recebimento: new Date().toLocaleString('pt-BR'),
            processo_numero: processoNumero,
            fornecedor: fornecedoresConfirmados,
            fornecedores_lista: fornecedoresUnicos
              .filter(f => fornecedoresChecados[f.id] !== false)
              .map(f => f.vendor),
            nota_fiscal: notaFiscal,
            documentos: documentosConfirmados || [],
            processos: processosRecebidos || [],
            url_original: window.location.href,
            status: 'recebido'
          }]);

        if (insertError) {
          console.error('Erro ao salvar recibo:', insertError);
        } else {
          console.log('✅ Recibo salvo no Supabase!');
        }
      } catch (erro) {
        console.error('Erro:', erro);
      }

      setIsConfirmed(true);
    } else {
      setError(result.error || 'Erro ao confirmar recebimento.');
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-text-secondary font-medium">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error || (isBatchMode ? checklists.length === 0 : checklists.length === 0)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">Ops! Algo deu errado</h2>
          <p className="text-text-secondary">{error || 'Link inválido ou expirado.'}</p>
          <div className="pt-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayDate = isBatchMode ? (date || new Date().toISOString()) : (checklists[0]?.submissionDate || new Date().toISOString());

  const safeFormatDate = (dateStr: string, formatStr: string) => {
    try {
      return format(parseISO(dateStr), formatStr, { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8">
      <div className="max-w-3xl w-full space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>{isBatchMode ? 'Relatório Diário de Recebimento' : 'Confirmação de Recebimento'}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary leading-tight">
                {isBatchMode 
                  ? `Processos do Dia ${safeFormatDate(displayDate, 'dd/MM/yyyy')}`
                  : (checklists[0]?.object || 'Checklist de Documentação')}
              </h1>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-2 bg-surface-hover border border-border rounded-full px-4 py-1.5 text-xs font-bold text-text-secondary shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                {safeFormatDate(displayDate, "dd 'de' MMMM, yyyy")}
              </span>
            </div>
          </div>

          {!isBatchMode && checklists[0] && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Fornecedor</p>
                  <p className="font-bold text-text-primary">{checklists[0].vendor}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Nº Processo / Contrato</p>
                  <p className="font-bold text-text-primary">{checklists[0].processNumber} / {checklists[0].contractNumber}</p>
                </div>
              </div>
            </div>
          )}

          {isBatchMode && (
            <div className="pt-4 border-t border-border/50">
              <p className="text-sm text-text-secondary font-medium">
                Este relatório contém <span className="text-primary font-bold">{checklists.length} processos</span> conferidos nesta data.
              </p>
            </div>
          )}
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {!isConfirmed ? (
            <motion.div 
              key="items-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Checklists List */}
              <div className="space-y-4">
                {checklists.map((checklist, cIdx) => (
                  <div key={`checklist-card-${checklist.id}-${cIdx}`} className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-surface-hover px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text-primary leading-tight">{checklist.vendor}</h3>
                          <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest">Proc: {checklist.processNumber} • Contrato: {checklist.contractNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                           {checklist.invoiceValue}
                         </span>
                      </div>
                    </div>
                    <div className="divide-y divide-border/50">
                      {checklist.items?.map((item, idx) => (
                        <div key={`public-item-${item.id || idx}`} className="px-6 py-4 flex items-center justify-between gap-4">
                          <span className="text-sm font-medium text-text-secondary">{item.label}</span>
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.checked 
                              ? 'bg-success/10 text-success border border-success/20' 
                              : 'bg-error/10 text-error border border-error/20'
                          }`}>
                            {item.checked ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {item.checked ? 'OK' : 'Pendente'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Seleção de Fornecedores (Somente em Batch Mode) */}
              {isBatchMode && checklists.length > 0 && (
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-4">Selecione os Fornecedores para Confirmação</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {checklists
                      .map((c, idx) => ({ vendor: c.vendor, id: `vendor-${idx}` }))
                      .filter((v, i, a) => a.findIndex(x => x.vendor === v.vendor) === i)
                      .map((f) => (
                        <label key={f.id} className="flex items-center gap-3 p-3 bg-surface-hover/50 border border-border/50 rounded-xl cursor-pointer hover:bg-surface-hover transition-all">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                            checked={fornecedoresChecados[f.id] !== false}
                            onChange={(e) => setFornecedoresChecados(prev => ({ ...prev, [f.id]: e.target.checked }))}
                          />
                          <span className="text-xs font-bold text-text-primary">{f.vendor}</span>
                        </label>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Confirmation Form */}
              <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm">
                <form onSubmit={handleConfirm} className="space-y-6">
                  <div className="space-y-2 text-center pb-4">
                    <h3 className="text-xl font-bold text-text-primary">Confirmar Recebimento</h3>
                    <p className="text-sm text-text-secondary">
                      {isBatchMode 
                        ? 'Ao confirmar, você atesta o recebimento de todos os processos listados acima para esta data.'
                        : 'Para finalizar o recebimento deste checklist, por favor informe seu nome completo abaixo.'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Seu Nome Completo</label>
                    <input 
                      type="text"
                      className="w-full bg-surface-hover border border-border rounded-xl px-4 py-4 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner placeholder:font-normal"
                      placeholder="Ex: João da Silva Santos"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting || !nome.trim()}
                    className="w-full bg-primary text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-primary/20 touch-manipulation cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Confirmar Tudo</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-[10px] text-text-secondary flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Seu registro será salvo para fins de auditoria.
                    </p>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="success-message"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface border border-border rounded-2xl p-12 text-center space-y-6 shadow-xl"
            >
              <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-text-primary">Recebimento Confirmado!</h2>
                <p className="text-text-secondary">Obrigado, <strong>{nome}</strong>. Seu registro de confirmação em lote foi salvo com sucesso em nossos sistemas.</p>
              </div>
              <div className="pt-6">
                <div className="inline-flex flex-col items-center gap-1 p-4 bg-surface-hover border border-border rounded-xl text-xs font-medium text-text-secondary">
                  <span>Data/Hora: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}</span>
                </div>
              </div>
              <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest pt-4">Esta janela já pode ser fechada.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
