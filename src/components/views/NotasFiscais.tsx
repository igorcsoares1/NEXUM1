import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Search, 
  Plus, 
  Calendar,
  User,
  DollarSign,
  FileSearch,
  Check,
  ChevronRight,
  PenTool,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { NotaFiscal, User as UserType, Contract } from '../../types';
import { processCurrencyInput } from '../../utils/format';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotasFiscaisProps {
  currentUser: UserType | null;
}

export default function NotasFiscais({ currentUser }: NotasFiscaisProps) {
  const [activeTab, setActiveTab] = useState<'enviar' | 'receber'>('enviar');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<NotaFiscal>>({
    numero_nota: '',
    fornecedor: '',
    valor: '',
    data_emissao: new Date().toISOString().split('T')[0],
    contrato_id: '',
    observacao: ''
  });

  useEffect(() => {
    if (currentUser?.prefeituraId) {
      fetchContracts();
      fetchNotas();
    }
  }, [currentUser]);

  const fetchContracts = async () => {
    try {
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .eq('prefeituraId', currentUser?.prefeituraId)
        .eq('status', 'vigente');
      if (data) setContracts(data);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
    }
  };

  const fetchNotas = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notas_fiscais')
        .select('*')
        .eq('prefeituraId', currentUser?.prefeituraId)
        .order('enviado_em', { ascending: false });
      if (data) setNotas(data);
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('notas_fiscais')
        .insert({
          ...formData,
          status: 'pendente',
          enviado_por: currentUser.name,
          enviado_em: new Date().toISOString(),
          prefeituraId: currentUser.prefeituraId
        });

      if (error) throw error;

      alert('Nota fiscal enviada com sucesso!');
      setFormData({
        numero_nota: '',
        fornecedor: '',
        valor: '',
        data_emissao: new Date().toISOString().split('T')[0],
        contrato_id: '',
        observacao: ''
      });
      fetchNotas();
    } catch (error: any) {
      console.error('Erro ao enviar nota:', error);
      alert('Erro ao enviar nota fiscal: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReceipt = async (notaId: string) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('notas_fiscais')
        .update({
          status: 'recebido',
          recebido_por: currentUser.name,
          recebido_em: new Date().toISOString()
        })
        .eq('id', notaId);

      if (error) throw error;
      alert('Recebimento confirmado!');
      fetchNotas();
    } catch (error: any) {
      console.error('Erro ao confirmar recebimento:', error);
      alert('Erro ao confirmar recebimento: ' + error.message);
    }
  };

  const generateReport = () => {
    const now = new Date();
    const formattedDate = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    alert(`Relatório de Notas Fiscais Gerado!\n\nResponsável: ${currentUser?.name}\nData: ${formattedDate}\n\nAssinatura Eletrônica Digital: [${currentUser?.id?.substring(0, 8)}-${now.getTime()}]`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <header className="flex flex-col gap-4 p-6 lg:p-8 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText size={24} />
              </div>
              <h1 className="text-2xl font-black text-text-primary tracking-tight">Notas Fiscais</h1>
            </div>
            <p className="text-sm text-text-secondary font-medium uppercase tracking-wider">Gestão e controle de faturamento e liquidação</p>
          </div>
          
          <button
            onClick={generateReport}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-2xl font-black transition-all shadow-lg shadow-accent/20 active:scale-95 shrink-0"
          >
            <PenTool size={18} />
            Gerar Relatório
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center p-1 bg-surface border border-border/40 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('enviar')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all",
              activeTab === 'enviar' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            )}
          >
            <Send size={16} />
            Enviar Notas
          </button>
          <button
            onClick={() => setActiveTab('receber')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all",
              activeTab === 'receber' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            )}
          >
            <CheckCircle size={16} />
            Receber Notas
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'enviar' ? (
            <motion.div
              key="enviar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-surface border border-border/40 rounded-3xl p-8 shadow-sm">
                <h2 className="text-xl font-black text-text-primary mb-6 flex items-center gap-2">
                  <Plus className="text-primary" />
                  Nova Nota Fiscal
                </h2>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider ml-1">Número da Nota</label>
                    <input
                      type="text"
                      required
                      value={formData.numero_nota}
                      onChange={e => setFormData({ ...formData, numero_nota: e.target.value })}
                      className="w-full bg-background border border-border/40 rounded-2xl px-4 py-3.5 text-sm font-bold focus:border-primary outline-none transition-all"
                      placeholder="000.000.000"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider ml-1">Fornecedor (Automático)</label>
                    <input
                      type="text"
                      required
                      readOnly
                      value={formData.fornecedor}
                      className="w-full bg-background/50 border border-border/40 rounded-2xl px-4 py-3.5 text-sm font-bold text-text-secondary cursor-not-allowed outline-none transition-all"
                      placeholder="Selecione um contrato"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider ml-1">Valor</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                      <input
                        type="text"
                        required
                        value={formData.valor}
                        onChange={e => setFormData({ ...formData, valor: processCurrencyInput(e.target.value) })}
                        className="w-full bg-background border border-border/40 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-black focus:border-primary outline-none transition-all"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider ml-1">Data de Emissão</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                      <input
                        type="date"
                        required
                        value={formData.data_emissao}
                        onChange={e => setFormData({ ...formData, data_emissao: e.target.value })}
                        className="w-full bg-background border border-border/40 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider ml-1">Contrato Vinculado</label>
                    <div className="relative">
                      <FileSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                      <select
                        required
                        value={formData.contrato_id}
                        onChange={e => {
                          const contractId = e.target.value;
                          const selectedContract = contracts.find(c => c.id === contractId);
                          setFormData({ 
                            ...formData, 
                            contrato_id: contractId,
                            fornecedor: selectedContract?.vendor || ''
                          });
                        }}
                        className="w-full bg-background border border-border/40 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold focus:border-primary outline-none appearance-none transition-all"
                      >
                        <option value="">Selecione um contrato...</option>
                        {contracts.map(c => (
                          <option key={c.id} value={c.id}>{c.number} - {c.vendor}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary/40 rotate-90" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider ml-1">Observação</label>
                    <textarea
                      value={formData.observacao}
                      onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                      className="w-full bg-background border border-border/40 rounded-2xl px-4 py-3.5 text-sm font-medium focus:border-primary outline-none transition-all min-h-[100px]"
                      placeholder="Detalhes adicionais..."
                    />
                  </div>

                  <div className="md:col-span-2 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-primary hover:bg-primary-hover text-white rounded-2xl py-4 font-black transition-all shadow-lg shadow-primary/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={20} />
                          Enviar Nota para Recebimento
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="receber"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-text-secondary font-bold">Carregando notas...</p>
                </div>
              ) : notas.filter(n => n.status === 'pendente').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-3xl border border-dashed border-border/60">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-text-primary">Tudo em dia!</h3>
                  <p className="text-text-secondary font-medium">Nenhuma nota fiscal aguardando recebimento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {notas.filter(n => n.status === 'pendente').map(nota => (
                    <div key={nota.id} className="bg-surface border border-border/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <span className="text-[10px] font-black bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full uppercase tracking-wider">
                          Pendente
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className="text-lg font-black text-text-primary mb-1">Nota: {nota.numero_nota}</h3>
                        <p className="text-sm text-text-secondary font-bold truncate">{nota.fornecedor}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-background rounded-2xl p-3 border border-border/20">
                          <p className="text-[10px] font-black text-text-secondary uppercase mb-1">Valor</p>
                          <p className="text-sm font-black text-primary">{nota.valor}</p>
                        </div>
                        <div className="bg-background rounded-2xl p-3 border border-border/20">
                          <p className="text-[10px] font-black text-text-secondary uppercase mb-1">Emissão</p>
                          <p className="text-sm font-black text-text-primary">
                            {format(parseISO(nota.data_emissao), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-text-secondary font-bold mb-6">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="opacity-50" />
                          <span>Por: {nota.enviado_por}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="opacity-50" />
                          <span>{format(parseISO(nota.enviado_em), "dd/MM 'às' HH:mm")}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleConfirmReceipt(nota.id)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3.5 font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Check size={18} />
                        Confirmar Recebimento
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
