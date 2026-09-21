import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  CheckCircle2,
  Plus, 
  Calendar,
  User,
  DollarSign,
  FileSearch,
  Check,
  ChevronRight,
  PenTool,
  Clock,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { NotaFiscal, User as UserType, Contract } from '../../types';
import { processCurrencyInput, parseCurrencyToNumber } from '../../utils/format';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotasFiscaisProps {
  currentUser: UserType | null;
  addNotification?: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function NotasFiscais({ currentUser, addNotification }: NotasFiscaisProps) {
  const [activeTab, setActiveTab] = useState<'enviar' | 'receber' | 'recebidas'>('enviar');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<NotaFiscal>>({
    numero_nota: '',
    fornecedor: '',
    valor: '',
    data_emissao: new Date().toISOString().split('T')[0],
    contrato_id: '',
    observacao: ''
  });

  const [isAvulso, setIsAvulso] = useState(false);

  useEffect(() => {
    if (currentUser?.prefeituraId) {
      fetchContracts();
      fetchNotas();
    }
  }, [currentUser?.prefeituraId]);

  const fetchContracts = async () => {
    if (!currentUser?.prefeituraId) return;
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('prefeituraId', currentUser.prefeituraId)
        .limit(1000);
      
      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
    }
  };

  const fetchNotas = async () => {
    if (!currentUser?.prefeituraId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('prefeituraId', currentUser.prefeituraId)
        .order('enviado_em', { ascending: false })
        .limit(1000);
      
      if (error) {
        console.error('Erro ao buscar invoices:', error);
        throw error;
      }
      setNotas(data || []);
    } catch (error) {
      console.error('Erro detalhado:', error);
      if (addNotification) {
        addNotification("Erro", "Não foi possível carregar as notas fiscais.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.prefeituraId) {
      alert('Erro: Prefeitura não configurada');
      return;
    }
    
    if (!formData.numero_nota || !formData.valor) {
      alert('Por favor, preencha número da nota e valor');
      return;
    }

    if (!isAvulso && !formData.contrato_id) {
      alert('Selecione um contrato ou use lançamento avulso');
      return;
    }

    if (isAvulso && !formData.fornecedor) {
      alert('Preencha o nome do fornecedor');
      return;
    }

    setSaving(true);

    try {
      const valorNumerico = parseCurrencyToNumber(formData.valor as string);
      
      const payload: any = {
        numero_nota: String(formData.numero_nota).trim(),
        fornecedor: String(formData.fornecedor).trim(),
        valor: String(valorNumerico),
        data_emissao: formData.data_emissao,
        status: 'pendente',
        enviado_por: currentUser.name,
        enviado_em: new Date().toISOString(),
        prefeituraId: String(currentUser.prefeituraId).trim()
      };

      if (formData.contrato_id) {
        payload.contrato_id = formData.contrato_id;
      }
      if (formData.observacao) {
        payload.observacao = formData.observacao;
      }

      const { data, error } = await supabase
        .from('invoices')
        .insert([payload])
        .select();

      if (error) {
        console.error('Erro Supabase:', error);
        throw new Error(error.message || 'Erro ao salvar no banco');
      }

      if (addNotification) {
        addNotification("Sucesso", "Nota fiscal enviada!", "success");
      } else {
        alert('Nota salva com sucesso!');
      }

      setFormData({
        numero_nota: '',
        fornecedor: '',
        valor: '',
        data_emissao: new Date().toISOString().split('T')[0],
        contrato_id: '',
        observacao: ''
      });
      setIsAvulso(false);

      await fetchNotas();
      setActiveTab('receber');

    } catch (error: any) {
      console.error('Erro ao enviar:', error);
      const msg = error?.message || 'Erro desconhecido';
      
      if (addNotification) {
        addNotification("Erro", `Falha ao salvar: ${msg}`, "error");
      } else {
        alert(`Erro: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReceipt = async (notaId: string) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'recebido',
          recebido_por: currentUser.name,
          recebido_em: new Date().toISOString()
        })
        .eq('id', notaId)
        .eq('prefeituraId', currentUser.prefeituraId);

      if (error) throw error;
      
      if (addNotification) {
        addNotification("Sucesso", "Recebimento confirmado!", "success");
      } else {
        alert('Recebimento confirmado!');
      }
      
      await fetchNotas();
    } catch (error: any) {
      console.error('Erro ao confirmar:', error);
      alert(`Erro: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  const generateReport = () => {
    const now = new Date();
    const formattedDate = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    alert(`Relatório Gerado!\n\nResponsável: ${currentUser?.name}\nData: ${formattedDate}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <header className="flex flex-col gap-4 p-6 lg:p-8 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText size={24} />
              </div>
              <h1 className="text-2xl font-black text-text-primary tracking-tight">Notas Fiscais</h1>
            </div>
            <p className="text-sm text-text-secondary font-medium uppercase tracking-wider">Gestão e controle de faturamento</p>
          </div>
          
          <button
            onClick={fetchNotas}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-surface-hover text-text-primary border border-border/40 rounded-2xl font-black transition-all active:scale-95 shrink-0"
            title="Atualizar lista"
          >
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
            {loading ? "Carregando..." : "Atualizar"}
          </button>
          <button
            onClick={generateReport}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-2xl font-black transition-all shadow-lg shadow-accent/20 active:scale-95 shrink-0"
          >
            <PenTool size={18} />
            Relatório
          </button>
        </div>

        <div className="flex items-center p-1 bg-surface border border-border/40 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('enviar')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all",
              activeTab === 'enviar' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Send size={16} />
            Enviar
          </button>
          <button
            onClick={() => setActiveTab('receber')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all",
              activeTab === 'receber' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <CheckCircle size={16} />
            Receber
          </button>
          <button
            onClick={() => setActiveTab('recebidas')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all",
              activeTab === 'recebidas' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <CheckCircle2 size={16} className="text-emerald-500" />
            Recebidas
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'enviar' && (
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
                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider ml-1">Número</label>
                    <input
                      type="text"
                      required
                      value={formData.numero_nota}
                      onChange={e => setFormData({ ...formData, numero_nota: e.target.value })}
                      className="w-full bg-background border border-border/40 rounded-2xl px-4 py-3.5 text-sm font-bold focus:border-primary outline-none"
                      placeholder="000.000.000"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-xs font-black text-text-secondary uppercase tracking-wider">Fornecedor</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAvulso(!isAvulso);
                          setFormData(p => ({ ...p, contrato_id: '', fornecedor: '' }));
                        }}
                        className="text-[10px] font-black text-primary uppercase hover:underline"
                      >
                        {isAvulso ? "Vincular Contrato" : "Avulso"}
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      readOnly={!isAvulso}
                      value={formData.fornecedor}
                      onChange={e => setFormData({ ...formData, fornecedor: e.target.value })}
                      className={cn(
                        "w-full bg-background border border-border/40 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none",
                        !isAvulso && "bg-background/50 cursor-not-allowed"
                      )}
                      placeholder={isAvulso ? "Digite o fornecedor..." : "Selecione contrato"}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-secondary uppercase ml-1">Valor</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                      <input
                        type="text"
                        required
                        value={formData.valor}
                        onChange={e => setFormData({ ...formData, valor: processCurrencyInput(e.target.value) })}
                        className="w-full bg-background border border-border/40 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-black focus:border-primary outline-none"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-secondary uppercase ml-1">Data</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                      <input
                        type="date"
                        required
                        value={formData.data_emissao}
                        onChange={e => setFormData({ ...formData, data_emissao: e.target.value })}
                        className="w-full bg-background border border-border/40 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  {!isAvulso && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-text-secondary uppercase ml-1">Contrato</label>
                      <div className="relative">
                        <FileSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                        <select
                          required={!isAvulso}
                          value={formData.contrato_id}
                          onChange={e => {
                            const cId = e.target.value;
                            const contract = contracts.find(c => c.id === cId);
                            setFormData({ 
                              ...formData, 
                              contrato_id: cId,
                              fornecedor: contract?.vendor || ''
                            });
                          }}
                          className="w-full bg-background border border-border/40 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold appearance-none"
                        >
                          <option value="">{contracts.length === 0 ? "Sem contratos" : "Selecione..."}</option>
                          {contracts.map(c => (
                            <option key={c.id} value={c.id}>{c.vendor}</option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90" size={18} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-text-secondary uppercase ml-1">Observação</label>
                    <textarea
                      value={formData.observacao}
                      onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                      className="w-full bg-background border border-border/40 rounded-2xl px-4 py-3.5 text-sm outline-none min-h-[100px]"
                      placeholder="Detalhes adicionais..."
                    />
                  </div>

                  <div className="md:col-span-2 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-primary hover:bg-primary-hover text-white rounded-2xl py-4 font-black transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={20} />
                          Enviar Nota
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'receber' && (
            <motion.div
              key="receber"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : notas.filter(n => n.status === 'pendente').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-3xl border border-dashed">
                  <CheckCircle size={32} className="text-emerald-500 mb-4" />
                  <h3 className="text-xl font-black text-text-primary">Tudo em dia!</h3>
                  <p className="text-text-secondary">Sem notas aguardando</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {notas.filter(n => n.status === 'pendente').map(nota => (
                    <div key={nota.id} className="bg-surface border border-border/40 rounded-3xl p-6 hover:shadow-md transition-all">
                      <div className="flex justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <span className="text-[10px] font-black bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full">PENDENTE</span>
                      </div>
                      
                      <h3 className="text-lg font-black text-text-primary mb-1">Nota: {nota.numero_nota}</h3>
                      <p className="text-sm text-text-secondary font-bold mb-4">{nota.fornecedor}</p>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-background rounded-2xl p-3">
                          <p className="text-[10px] font-black text-text-secondary mb-1">VALOR</p>
                          <p className="text-sm font-black text-primary">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(nota.valor))}
                          </p>
                        </div>
                        <div className="bg-background rounded-2xl p-3">
                          <p className="text-[10px] font-black text-text-secondary mb-1">DATA</p>
                          <p className="text-sm font-black text-text-primary">
                            {nota.data_emissao ? format(parseISO(nota.data_emissao), 'dd/MM/yyyy') : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="text-[10px] text-text-secondary font-bold mb-6 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User size={12} />
                          <span>{nota.enviado_por}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          <span>{nota.enviado_em ? format(parseISO(nota.enviado_em), "dd/MM HH:mm") : '-'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleConfirmReceipt(nota.id)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3.5 font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Check size={18} />
                        Confirmar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'recebidas' && (
            <motion.div
              key="recebidas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notas.filter(n => n.status === 'recebido').length === 0 ? (
                  <div className="col-span-full text-center py-20 text-text-secondary">
                    Nenhuma nota recebida ainda
                  </div>
                ) : (
                  notas.filter(n => n.status === 'recebido').map(nota => (
                    <div key={nota.id} className="bg-surface/50 border border-border/40 rounded-3xl p-6 opacity-80">
                      <div className="flex justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                          <CheckCircle size={24} />
                        </div>
                        <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full">RECEBIDO</span>
                      </div>
                      
                      <h3 className="text-lg font-black text-text-primary mb-1">Nota: {nota.numero_nota}</h3>
                      <p className="text-sm text-text-secondary font-bold mb-4">{nota.fornecedor}</p>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-background rounded-2xl p-3">
                          <p className="text-[10px] font-black text-text-secondary mb-1">VALOR</p>
                          <p className="text-sm font-black text-primary">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(nota.valor))}
                          </p>
                        </div>
                        <div className="bg-background rounded-2xl p-3">
                          <p className="text-[10px] font-black text-text-secondary mb-1">DATA</p>
                          <p className="text-sm font-black text-text-primary">
                            {nota.data_emissao ? format(parseISO(nota.data_emissao), 'dd/MM/yyyy') : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="text-[10px] text-text-secondary font-bold space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User size={12} />
                          <span>Enviado: {nota.enviado_por}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check size={12} className="text-emerald-500" />
                          <span>Recebido: {nota.recebido_por}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}