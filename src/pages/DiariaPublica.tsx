import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, User, Clock, Send, Loader2, ShieldCheck, MapPin, ClipboardList } from 'lucide-react';
import { DailyRecord } from '../types';
import { fetchDiariaPublic, fetchDiariasByDate, saveDiariaConfirmation, saveBatchDiariaConfirmation } from '../services/daily';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, parseCurrencyToNumber } from '../utils/format';
import { cn } from '../lib/utils';

export default function DiariaPublica() {
  const { id: paramsId, date: paramsDate } = useParams<{ id?: string, date?: string }>();
  const location = useLocation();
  const [id, setId] = useState<string | null>(paramsId || null);
  const [date, setDate] = useState<string | null>(paramsDate || null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [finalStatus, setFinalStatus] = useState<'aprovado' | 'rejeitado'>('aprovado');

  const isBatchMode = location.pathname.includes('/diaria/dia/');

  useEffect(() => {
    if (!id && !date) {
      const path = window.location.pathname;
      const parts = path.split('/').filter(Boolean);
      
      const diariaIdx = parts.indexOf('diaria');
      if (diariaIdx !== -1) {
        if (parts[diariaIdx + 1] === 'dia') {
          if (parts[diariaIdx + 2]) {
            setDate(parts[diariaIdx + 2]);
          }
        } else if (parts[diariaIdx + 1]) {
          setId(parts[diariaIdx + 1]);
        }
      }
    }
  }, [id, date]);

  useEffect(() => {
    const loadData = async () => {
      if (!id && !date) return;

      setLoading(true);
      setError(null);

      try {
        if (isBatchMode && date) {
          const data = await fetchDiariasByDate(date);
          if (data && data.length > 0) {
            setRecords(data);
          } else {
            setError('Nenhuma diária encontrada para esta data.');
          }
        } else if (id) {
          const data = await fetchDiariaPublic(id);
          if (data) {
            setRecords([data]);
          } else {
            setError('Diária não encontrada ou link inválido.');
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

  const handleAction = async (status: 'aprovado' | 'rejeitado') => {
    if (records.length === 0) return;

    setIsSubmitting(true);
    setFinalStatus(status);
    let result;
    
    if (isBatchMode) {
      result = await saveBatchDiariaConfirmation(records, status);
    } else {
      result = await saveDiariaConfirmation(records[0], status);
    }
    
    if (result.success) {
      setIsConfirmed(true);
    } else {
      setError(result.error || `Erro ao ${status === 'aprovado' ? 'aprovar' : 'rejeitar'} diária.`);
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

  if (error || records.length === 0) {
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

  const displayDate = isBatchMode ? (date || new Date().toISOString()) : (records[0]?.date || new Date().toISOString());

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
                <span>{isBatchMode ? 'Aprovação Diária em Lote' : 'Aprovação de Diária'}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary leading-tight">
                {isBatchMode 
                  ? `Diárias do Dia ${safeFormatDate(displayDate, 'dd/MM/yyyy')}`
                  : `Solicitação para ${records[0]?.destination}`}
              </h1>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-2 bg-surface-hover border border-border rounded-full px-4 py-1.5 text-xs font-bold text-text-secondary shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                {safeFormatDate(displayDate, "dd 'de' MMMM, yyyy")}
              </span>
            </div>
          </div>

          {!isBatchMode && records[0] && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Beneficiário</p>
                  <p className="font-bold text-text-primary">{records[0].beneficiary || records[0].driver}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Destino / Valor</p>
                  <p className="font-bold text-text-primary">{records[0].destination} • {formatCurrency(parseCurrencyToNumber(records[0].value))}</p>
                </div>
              </div>
            </div>
          )}

          {isBatchMode && (
            <div className="pt-4 border-t border-border/50">
              <p className="text-sm text-text-secondary font-medium">
                Este relatório contém <span className="text-primary font-bold">{records.length} solicitações</span> registradas nesta data.
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
              {/* Diarias List */}
              <div className="space-y-4">
                {records.map((record, rIdx) => (
                  <div key={`diaria-card-${record.id}-${rIdx}`} className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-surface-hover px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text-primary leading-tight">{record.beneficiary || record.driver}</h3>
                          <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest">{record.destination} • Mat: {record.registrationNumber || '---'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">
                           {formatCurrency(parseCurrencyToNumber(record.value))}
                         </span>
                      </div>
                    </div>
                    <div className="px-6 py-4">
                       <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-1">Finalidade</p>
                       <p className="text-sm text-text-secondary font-medium italic">"{record.purpose || 'Não informada'}"</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Approval Actions */}
              <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="space-y-6">
                  <div className="space-y-2 text-center pb-4">
                    <h3 className="text-xl font-bold text-text-primary">Confirmar Ação</h3>
                    <p className="text-sm text-text-secondary">
                      {isBatchMode 
                        ? 'Selecione uma ação para todas as diárias listadas acima para esta data.'
                        : 'Selecione uma ação para esta solicitação conforme os dados informados.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleAction('aprovado')}
                      disabled={isSubmitting}
                      className="bg-primary text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                    >
                      {isSubmitting && finalStatus === 'aprovado' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                      <span>Aprovar Solicitações</span>
                    </button>

                    <button 
                      onClick={() => handleAction('rejeitado')}
                      disabled={isSubmitting}
                      className="bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-rose-500/20 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting && finalStatus === 'rejeitado' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                      <span>Rejeitar</span>
                    </button>
                  </div>

                  <div className="pt-2 text-center">
                    <p className="text-[10px] text-text-secondary flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Sua ação será registrada com data e hora.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="success-message"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface border border-border rounded-2xl p-12 text-center space-y-6 shadow-xl"
            >
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
                finalStatus === 'aprovado' ? "bg-success/10 text-success" : "bg-error/10 text-error"
              )}>
                {finalStatus === 'aprovado' ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-text-primary">
                  {finalStatus === 'aprovado' ? 'Diárias Aprovadas!' : 'Solicitações Rejeitadas'}
                </h2>
                <p className="text-text-secondary">
                  A ação foi registrada com sucesso e os status foram atualizados no sistema.
                </p>
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
