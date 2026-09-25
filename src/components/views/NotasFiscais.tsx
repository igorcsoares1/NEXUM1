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
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { NotaFiscal, User as UserType, Contract } from '../../types';
import { processCurrencyInput, parseCurrencyToNumber } from '../../utils/format';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotasFiscaisProps {
  currentUser: UserType | null;
  addNotification?: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

// Roles que podem confirmar recebimento e excluir
const CAN_RECEIVE_ROLES = ['superadmin', 'admin', 'gestor'];

type PeriodType = 'hoje' | 'semana' | 'mes' | 'custom';

export default function NotasFiscais({ currentUser, addNotification }: NotasFiscaisProps) {
  const [activeTab, setActiveTab] = useState<'enviar' | 'receber' | 'recebidas'>('enviar');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados para o filtro de período do relatório
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>('hoje');
  const [customDateStart, setCustomDateStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customDateEnd, setCustomDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [formData, setFormData] = useState<Partial<NotaFiscal>>({
    numero_nota: '',
    fornecedor: '',
    valor: '',
    data_emissao: format(new Date(), 'yyyy-MM-dd'),
    contrato_id: '',
    observacao: ''
  });

  const [isAvulso, setIsAvulso] = useState(false);

  // Verifica se o usuário pode confirmar/excluir
  const canReceive = currentUser?.role ? CAN_RECEIVE_ROLES.includes(currentUser.role) : false;

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
      if (error) throw error;
      setNotas(data || []);
    } catch (error) {
      console.error('Erro detalhado:', error);
      if (addNotification) addNotification("Erro", "Não foi possível carregar as notas fiscais.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Função para extrair data em formato YYYY-MM-DD de qualquer formato
  const extractDateOnly = (dateString: string): string => {
    if (!dateString) return '';
    // Se já está em YYYY-MM-DD, retorna
    if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dateString.substring(0, 10);
    }
    // Se está em formato diferente, tenta converter usando format para garantir local day
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return '';
      return format(date, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  // Função para formatar data local sem shift de timezone
  const formatLocalDate = (dateString: string, formatStr: string = 'dd/MM/yyyy'): string => {
    if (!dateString) return '-';
    try {
      // Se for YYYY-MM-DD puro
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, formatStr);
      }
      // Se for ISO com tempo
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, formatStr);
    } catch {
      return '-';
    }
  };

  // Função para filtrar notas por período
  const getFilteredNotasByPeriod = (): NotaFiscal[] => {
    let startDateStr: string;
    let endDateStr: string;

    const today = new Date();
    // Pega a data de hoje em formato YYYY-MM-DD local
    const todayStr = format(today, 'yyyy-MM-dd');

    switch (periodType) {
      case 'hoje':
        startDateStr = todayStr;
        endDateStr = todayStr;
        break;
      case 'semana':
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        startDateStr = format(weekStart, 'yyyy-MM-dd');
        endDateStr = format(weekEnd, 'yyyy-MM-dd');
        break;
      case 'mes':
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        startDateStr = format(monthStart, 'yyyy-MM-dd');
        endDateStr = format(monthEnd, 'yyyy-MM-dd');
        break;
      case 'custom':
        startDateStr = customDateStart;
        endDateStr = customDateEnd;
        break;
      default:
        return notas;
    }

    return notas.filter(nota => {
      // Filtramos pela data de emissão ou pela data que foi enviado/recebido se necessário
      // O usuário geralmente quer ver o que aconteceu no dia
      const dateToCompare = nota.data_emissao || (nota.enviado_em ? nota.enviado_em.substring(0, 10) : '');
      
      if (!dateToCompare) return false;
      
      const notaDateStr = extractDateOnly(dateToCompare);
      if (!notaDateStr) return false;
      
      return notaDateStr >= startDateStr && notaDateStr <= endDateStr;
    });
  };

  // Função para obter período formatado
  const getPeriodLabel = (): string => {
    const today = new Date();
    switch (periodType) {
      case 'hoje':
        return `Hoje (${format(today, 'dd/MM/yyyy')})`;
      case 'semana':
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        return `Semana: ${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM/yyyy')}`;
      case 'mes':
        return `Mês de ${format(today, 'MMMM/yyyy', { locale: ptBR })}`;
      case 'custom':
        return `${formatLocalDate(customDateStart)} - ${formatLocalDate(customDateEnd)}`;
      default:
        return 'Período não definido';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.prefeituraId) { alert('Erro: Prefeitura não configurada'); return; }
    if (!formData.numero_nota || !formData.valor) { alert('Por favor, preencha número da nota e valor'); return; }
    if (!isAvulso && !formData.contrato_id) { alert('Selecione um contrato ou use lançamento avulso'); return; }
    if (isAvulso && !formData.fornecedor) { alert('Preencha o nome do fornecedor'); return; }

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
      if (formData.contrato_id) payload.contrato_id = formData.contrato_id;
      if (formData.observacao) payload.observacao = formData.observacao;

      const { error } = await supabase.from('invoices').insert([payload]).select();
      if (error) throw new Error(error.message || 'Erro ao salvar no banco');

      if (addNotification) addNotification("Sucesso", "Nota fiscal enviada!", "success");
      else alert('Nota salva com sucesso!');

      setFormData({ numero_nota: '', fornecedor: '', valor: '', data_emissao: format(new Date(), 'yyyy-MM-dd'), contrato_id: '', observacao: '' });
      setIsAvulso(false);
      await fetchNotas();
      setActiveTab(canReceive ? 'receber' : 'recebidas');
    } catch (error: any) {
      console.error('Erro ao enviar:', error);
      if (addNotification) addNotification("Erro", `Falha ao salvar: ${error?.message || 'Erro desconhecido'}`, "error");
      else alert(`Erro: ${error?.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReceipt = async (notaId: string) => {
    if (!currentUser || !canReceive) return;
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'recebido', recebido_por: currentUser.name, recebido_em: new Date().toISOString() })
        .eq('id', notaId)
        .eq('prefeituraId', currentUser.prefeituraId);
      if (error) throw error;
      if (addNotification) addNotification("Sucesso", "Recebimento confirmado!", "success");
      else alert('Recebimento confirmado!');
      await fetchNotas();
    } catch (error: any) {
      console.error('Erro ao confirmar:', error);
      alert(`Erro: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  const handleDelete = async (notaId: string, numeroNota: string) => {
    if (!currentUser || !canReceive) return;
    if (!window.confirm(`Excluir a nota ${numeroNota}? Esta ação não pode ser desfeita.`)) return;

    setDeletingId(notaId);
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', notaId)
        .eq('prefeituraId', currentUser.prefeituraId);
      if (error) throw error;
      if (addNotification) addNotification("Sucesso", "Nota excluída com sucesso!", "success");
      else alert('Nota excluída!');
      await fetchNotas();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      if (addNotification) addNotification("Erro", `Falha ao excluir: ${error?.message}`, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const generateReport = () => {
    try {
      const filteredNotas = getFilteredNotasByPeriod();
      const doc = new jsPDF();
      const now = new Date();
      const formattedDate = format(now, "dd/MM/yyyy HH:mm", { locale: ptBR });
      const periodLabel = getPeriodLabel();

      // Configuração de Título
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text('Relatório de Notas Fiscais Recebidas', 14, 22);
      
      // Metadados
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Período: ${periodLabel}`, 14, 30);
      doc.text(`Responsável: ${currentUser?.name || 'Sistema'}`, 14, 35);
      doc.text(`Data de Geração: ${formattedDate}`, 14, 40);

      // Verificar se tem dados
      if (filteredNotas.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(150);
        doc.text('⚠️ Nenhuma nota fiscal encontrada neste período.', 14, 60);
        
        const filename = `Relatorio_NotasFiscais_${format(now, 'yyyyMMdd_HHmm')}_VAZIO.pdf`;
        doc.save(filename);
        
        if (addNotification) {
          addNotification("Info", `Relatório gerado sem dados para o período: ${getPeriodLabel()}`, "info");
        }
        setShowPeriodSelector(false);
        return;
      }

      // Tem dados - gera tabela
      doc.text(`Total de Registros: ${filteredNotas.length}`, 14, 45);

      const totalValue = filteredNotas.reduce((sum, nota) => sum + Number(nota.valor), 0);
      doc.setTextColor(79, 70, 229);
      doc.text(`Valor Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}`, 14, 50);

      const tableData = filteredNotas.map(nota => [
        nota.numero_nota,
        nota.fornecedor,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(nota.valor)),
        formatLocalDate(nota.data_emissao),
        nota.status === 'recebido' ? 'RECEBIDA' : 'PENDENTE',
        nota.recebido_por || '-',
        formatLocalDate(nota.recebido_em)
      ]);

      autoTable(doc, {
        startY: 58,
        head: [['Número', 'Fornecedor', 'Valor', 'Emissão', 'Status', 'Recebido Por', 'Data Receb.']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 25 },
          6: { cellWidth: 20 }
        }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      const filename = `Relatorio_NotasFiscais_${format(now, 'yyyyMMdd_HHmm')}_${periodType}.pdf`;
      doc.save(filename);
      
      if (addNotification) {
        addNotification("Sucesso", `Relatório PDF gerado com sucesso! (${filteredNotas.length} notas)`, "success");
      }

      setShowPeriodSelector(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      if (addNotification) {
        addNotification("Erro", "Falha ao gerar o arquivo PDF.", "error");
      }
    }
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
          >
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
            {loading ? "Carregando..." : "Atualizar"}
          </button>
          
          {!(currentUser?.role === 'compras' && activeTab === 'recebidas') && (
            <button
              onClick={() => setShowPeriodSelector(!showPeriodSelector)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-2xl font-black transition-all shadow-lg shadow-accent/20 active:scale-95 shrink-0"
            >
              <PenTool size={18} />
              Relatório
            </button>
          )}
        </div>

        <div className="flex items-center p-1 bg-surface border border-border/40 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('enviar')}
            className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all", activeTab === 'enviar' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:text-text-primary")}
          >
            <Send size={16} />
            Enviar
          </button>
          {canReceive && (
            <button
              onClick={() => setActiveTab('receber')}
              className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all", activeTab === 'receber' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:text-text-primary")}
            >
              <CheckCircle size={16} />
              Receber
            </button>
          )}
          <button
            onClick={() => setActiveTab('recebidas')}
            className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all", activeTab === 'recebidas' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:text-text-primary")}
          >
            <CheckCircle2 size={16} className="text-emerald-500" />
            Recebidas
          </button>
        </div>
      </header>

      {/* MODAL - Seletor de Período */}
      <AnimatePresence>
        {showPeriodSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPeriodSelector(false)}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border/40 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-text-primary flex items-center gap-2">
                  <Calendar size={24} />
                  Selecione o Período
                </h2>
                <button
                  onClick={() => setShowPeriodSelector(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-background rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                {/* Opções de Período Rápido */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'hoje' as PeriodType, label: 'Hoje' },
                    { value: 'semana' as PeriodType, label: 'Esta Semana' },
                    { value: 'mes' as PeriodType, label: 'Este Mês' },
                    { value: 'custom' as PeriodType, label: 'Personalizado' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPeriodType(option.value)}
                      className={cn(
                        "px-4 py-3 rounded-2xl font-bold text-sm transition-all",
                        periodType === option.value
                          ? "bg-primary text-white shadow-md shadow-primary/20"
                          : "bg-background text-text-primary hover:bg-background/80 border border-border/40"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Datas Customizadas */}
                {periodType === 'custom' && (
                  <div className="space-y-3 bg-background rounded-2xl p-4">
                    <div>
                      <label className="text-xs font-black text-text-secondary uppercase ml-1 mb-2 block">Data Inicial</label>
                      <input
                        type="date"
                        value={customDateStart}
                        onChange={e => setCustomDateStart(e.target.value)}
                        className="w-full bg-surface border border-border/40 rounded-xl px-4 py-2.5 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-text-secondary uppercase ml-1 mb-2 block">Data Final</label>
                      <input
                        type="date"
                        value={customDateEnd}
                        onChange={e => setCustomDateEnd(e.target.value)}
                        className="w-full bg-surface border border-border/40 rounded-xl px-4 py-2.5 text-sm font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Preview do Período */}
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
                  <p className="text-xs font-black text-primary uppercase mb-1">Período Selecionado:</p>
                  <p className="text-sm font-bold text-text-primary">{getPeriodLabel()}</p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPeriodSelector(false)}
                  className="flex-1 px-4 py-3 bg-background border border-border/40 text-text-primary rounded-2xl font-black hover:bg-background/80 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={generateReport}
                  className="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-2xl font-black shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={18} />
                  Gerar Relatório
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'enviar' && (
            <motion.div key="enviar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto">
              <div className="bg-surface border border-border/40 rounded-3xl p-8 shadow-sm">
                <h2 className="text-xl font-black text-text-primary mb-6 flex items-center gap-2">
                  <Plus className="text-primary" />
                  Nova Nota Fiscal
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider ml-1">Número</label>
                    <input type="text" required value={formData.numero_nota} onChange={e => setFormData({ ...formData, numero_nota: e.target.value })} className="w-full bg-background border border-border/40 rounded-2xl px-4 py-3.5 text-sm font-bold focus:border-primary outline-none" placeholder="000.000.000" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-xs font-black text-text-secondary uppercase tracking-wider">Fornecedor</label>
                      <button type="button" onClick={() => { setIsAvulso(!isAvulso); setFormData(p => ({ ...p, contrato_id: '', fornecedor: '' })); }} className="text-[10px] font-black text-primary uppercase hover:underline">
                        {isAvulso ? "Vincular Contrato" : "Avulso"}
                      </button>
                    </div>
                    <input type="text" required readOnly={!isAvulso} value={formData.fornecedor} onChange={e => setFormData({ ...formData, fornecedor: e.target.value })} className={cn("w-full bg-background border border-border/40 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none", !isAvulso && "bg-background/50 cursor-not-allowed")} placeholder={isAvulso ? "Digite o fornecedor..." : "Selecione contrato"} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-secondary uppercase ml-1">Valor</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                      <input type="text" required value={formData.valor} onChange={e => setFormData({ ...formData, valor: processCurrencyInput(e.target.value) })} className="w-full bg-background border border-border/40 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-black focus:border-primary outline-none" placeholder="0,00" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-secondary uppercase ml-1">Data</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                      <input type="date" required value={formData.data_emissao} onChange={e => setFormData({ ...formData, data_emissao: e.target.value })} className="w-full bg-background border border-border/40 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold focus:border-primary outline-none" />
                    </div>
                  </div>

                  {!isAvulso && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-text-secondary uppercase ml-1">Contrato</label>
                      <div className="relative">
                        <FileSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                        <select required={!isAvulso} value={formData.contrato_id} onChange={e => { const cId = e.target.value; const contract = contracts.find(c => c.id === cId); setFormData({ ...formData, contrato_id: cId, fornecedor: contract?.vendor || '' }); }} className="w-full bg-background border border-border/40 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold appearance-none">
                          <option value="">{contracts.length === 0 ? "Sem contratos" : "Selecione..."}</option>
                          {contracts.map(c => (<option key={c.id} value={c.id}>{c.vendor}</option>))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90" size={18} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-text-secondary uppercase ml-1">Observação</label>
                    <textarea value={formData.observacao} onChange={e => setFormData({ ...formData, observacao: e.target.value })} className="w-full bg-background border border-border/40 rounded-2xl px-4 py-3.5 text-sm outline-none min-h-[100px]" placeholder="Detalhes adicionais..." />
                  </div>

                  <div className="md:col-span-2 pt-4">
                    <button type="submit" disabled={saving} className="w-full bg-primary hover:bg-primary-hover text-white rounded-2xl py-4 font-black transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                      {saving ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={20} />Enviar Nota</>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'receber' && canReceive && (
            <motion.div key="receber" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
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
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full">PENDENTE</span>
                          <button
                            onClick={() => handleDelete(nota.id, nota.numero_nota)}
                            disabled={deletingId === nota.id}
                            className="w-8 h-8 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-all"
                            title="Excluir nota"
                          >
                            {deletingId === nota.id ? <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-black text-text-primary mb-1">Nota: {nota.numero_nota}</h3>
                      <p className="text-sm text-text-secondary font-bold mb-4">{nota.fornecedor}</p>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-background rounded-2xl p-3">
                          <p className="text-[10px] font-black text-text-secondary mb-1">VALOR</p>
                          <p className="text-sm font-black text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(nota.valor))}</p>
                        </div>
                        <div className="bg-background rounded-2xl p-3">
                          <p className="text-[10px] font-black text-text-secondary mb-1">DATA</p>
                          <p className="text-sm font-black text-text-primary">{formatLocalDate(nota.data_emissao)}</p>
                        </div>
                      </div>

                      <div className="text-[10px] text-text-secondary font-bold mb-6 space-y-1">
                        <div className="flex items-center gap-1.5"><User size={12} /><span>{nota.enviado_por}</span></div>
                        <div className="flex items-center gap-1.5"><Clock size={12} /><span>{nota.enviado_em ? format(parseISO(nota.enviado_em), "dd/MM HH:mm") : '-'}</span></div>
                      </div>

                      <button onClick={() => handleConfirmReceipt(nota.id)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3.5 font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                        <Check size={18} />
                        Confirmar Recebimento
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'recebidas' && (
            <motion.div key="recebidas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notas.filter(n => n.status === 'recebido').length === 0 ? (
                  <div className="col-span-full text-center py-20 text-text-secondary">Nenhuma nota recebida ainda</div>
                ) : (
                  notas.filter(n => n.status === 'recebido').map(nota => (
                    <div key={nota.id} className="bg-surface/50 border border-border/40 rounded-3xl p-6 opacity-80">
                      <div className="flex justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                          <CheckCircle size={24} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full">RECEBIDO</span>
                          {canReceive && (
                            <button
                              onClick={() => handleDelete(nota.id, nota.numero_nota)}
                              disabled={deletingId === nota.id}
                              className="w-8 h-8 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-all"
                              title="Excluir nota"
                            >
                              {deletingId === nota.id ? <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-lg font-black text-text-primary mb-1">Nota: {nota.numero_nota}</h3>
                      <p className="text-sm text-text-secondary font-bold mb-4">{nota.fornecedor}</p>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-background rounded-2xl p-3">
                          <p className="text-[10px] font-black text-text-secondary mb-1">VALOR</p>
                          <p className="text-sm font-black text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(nota.valor))}</p>
                        </div>
                        <div className="bg-background rounded-2xl p-3">
                          <p className="text-[10px] font-black text-text-secondary mb-1">DATA</p>
                          <p className="text-sm font-black text-text-primary">{formatLocalDate(nota.data_emissao)}</p>
                        </div>
                      </div>

                      <div className="text-[10px] text-text-secondary font-bold space-y-1">
                        <div className="flex items-center gap-1.5"><User size={12} /><span>Enviado: {nota.enviado_por} ({nota.enviado_em ? format(parseISO(nota.enviado_em), "dd/MM HH:mm") : '-'})</span></div>
                        <div className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /><span>Recebido: {nota.recebido_por} ({nota.recebido_em ? format(parseISO(nota.recebido_em), "dd/MM HH:mm") : '-'})</span></div>
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