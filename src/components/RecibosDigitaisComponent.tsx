import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  CheckSquare, 
  Clock, 
  User, 
  FileText, 
  ExternalLink, 
  ChevronRight, 
  Search,
  Loader2,
  X,
  Calendar,
  Building2,
  Hash,
  FileCheck,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Recibo {
  id: string;
  nome_receptor: string;
  data_hora_recebimento: string;
  processo_numero: string;
  fornecedor: string;
  nota_fiscal: string;
  documentos: string;
  processos: string;
  url_original: string;
  status: string;
  fornecedores_lista?: string[];
}

export function RecibosDigitaisComponent({ currentUser, compact = false }: { currentUser?: any, compact?: boolean }) {
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecibo, setSelectedRecibo] = useState<Recibo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = compact ? 5 : 10;

  useEffect(() => {
    fetchRecibos();

    // Inscrição em tempo real para novos recibos
    const channel = supabase
      .channel('realtime:recibos_digitais')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recibos_digitais' }, (payload) => {
        setRecibos(prev => [payload.new as Recibo, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'recibos_digitais' }, (payload) => {
        setRecibos(prev => prev.filter(r => r.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecibos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recibos_digitais')
        .select('*')
        .order('data_hora_recebimento', { ascending: false });

      if (error) throw error;
      setRecibos(data || []);
    } catch (err) {
      console.error('Erro ao buscar recibos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecibo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja apagar este recibo?')) return;

    try {
      const { error } = await supabase
        .from('recibos_digitais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      // Inscrição em tempo real cuidará da atualização da UI
    } catch (err) {
      console.error('Erro ao apagar recibo:', err);
      alert('Falha ao apagar recibo. Verifique suas permissões.');
    }
  };

  const filteredRecibos = recibos.filter(r => 
    r.nome_receptor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.processo_numero || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.fornecedor || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRecibos.length / itemsPerPage);
  const paginatedRecibos = filteredRecibos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <Loader2 className={cn("text-primary animate-spin", compact ? "w-6 h-6" : "w-8 h-8")} />
        <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Carregando Auditoria...</p>
      </div>
    );
  }

    const isAuthorizedToDelete = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Interativo - Mais discreto para integração */}
        <div className={cn("pb-4 mb-4 border-b border-border/40", compact && "pb-2 mb-2")}>
          <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4", compact && "gap-2")}>
            {!compact && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <FileCheck size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-tight text-text-primary">Recibos Digitais</h2>
                  <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest">Protocolos de Auditoria ({filteredRecibos.length})</p>
                </div>
              </div>
            )}
            
            <div className={cn("relative flex-1", !compact && "max-w-md")}>
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/60" />
              <input
                type="text"
                placeholder={compact ? "Buscar..." : "Buscar por fornecedor ou processo..."}
                className="w-full bg-surface-hover border border-border/40 rounded-xl pl-11 pr-4 py-2 text-xs font-bold outline-none focus:border-primary/50 transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
  
        {/* Lista de Recibos em Grade/Lista */}
        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
          <AnimatePresence mode="popLayout">
            {paginatedRecibos.length > 0 ? (
              <>
                <div className={cn(
                  "grid grid-cols-1 gap-3 pb-4",
                  !compact && "md:grid-cols-2"
                )}>
                  {paginatedRecibos.map((recibo, index) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={`${recibo.id}-${index}`}
                      className="group relative"
                    >
                      <div className="relative">
                        <button
                          onClick={() => setSelectedRecibo(recibo)}
                          className="w-full text-left p-4 pr-12 rounded-2xl border border-border/40 bg-surface/60 hover:bg-surface-hover hover:border-primary/30 transition-all shadow-sm hover:shadow-md group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-emerald-500/20">
                              <FileCheck size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1 gap-2">
                                <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-lg uppercase tracking-wider">
                                  {recibo.processo_numero}
                                </span>
                                <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase">
                                  {recibo.status || 'concluído'}
                                </span>
                              </div>
                              
                              <p className="text-sm font-black text-text-primary truncate leading-tight mb-1">
                                {recibo.fornecedor || (recibo.fornecedores_lista && recibo.fornecedores_lista[0]) || 'Fornecedor n/a'}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-secondary font-bold">
                                <div className="flex items-center gap-1">
                                  <User size={10} className="opacity-50" />
                                  <span className="truncate max-w-[100px]">{recibo.nome_receptor}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock size={10} className="opacity-50" />
                                  {recibo.data_hora_recebimento.split(' às ')[0]}
                                </div>
                              </div>
  
                              {recibo.nota_fiscal && (
                                <div className="mt-2 pt-2 border-t border-border/20">
                                  <p className="text-[9px] font-black text-rose-500 uppercase">
                                    Nota: {recibo.nota_fiscal}
                                  </p>
                                </div>
                              )}
                            </div>
                            <ChevronRight size={16} className="text-text-secondary/30 group-hover:text-primary transition-colors mt-1" />
                          </div>
                        </button>
  
                        {isAuthorizedToDelete && (
                          <button
                            onClick={(e) => handleDeleteRecibo(recibo.id, e)}
                            className="absolute top-3 right-3 p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm z-10"
                            title="Apagar Recibo"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pb-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-2 rounded-lg bg-surface border border-border disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary/50 transition-all"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                          currentPage === i + 1 
                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                            : "bg-surface border border-border text-text-secondary hover:border-primary/30"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-2 rounded-lg bg-surface border border-border disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary/50 transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-surface-hover flex items-center justify-center mb-4 border border-border/50">
                <FileText size={24} className="text-text-secondary/30" />
              </div>
              <p className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Nenhum registro</p>
              <p className="text-[10px] text-text-secondary/50 mt-2 font-bold max-w-[200px]">Aguardando novas confirmações de recebimento.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de Detalhes - Versão Completa */}
      <AnimatePresence>
        {selectedRecibo && (
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedRecibo(null)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-md sm:backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 100 }} 
              className="bg-background w-full max-w-lg relative z-10 rounded-t-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl border-t sm:border border-border/50"
            >
              {/* Modal Header */}
              <div className="p-5 md:p-8 border-b border-border bg-surface-hover/30 flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2.5 md:p-3 bg-emerald-500 rounded-xl md:rounded-[20px] text-white shadow-lg shadow-emerald-500/20">
                    <CheckSquare size={20} className="md:size-6" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-xl font-black tracking-tight text-text-primary">Comprovante Digital</h3>
                    <p className="text-[9px] md:text-[10px] text-text-secondary font-black uppercase tracking-widest flex items-center gap-2">
                      ID: {selectedRecibo.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRecibo(null)} 
                  className="p-2 md:p-3 hover:bg-red-500/10 hover:text-red-500 rounded-2xl text-text-secondary transition-all active:scale-90"
                >
                  <X size={20} className="md:size-6" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-5 md:p-8 overflow-y-auto max-h-[70vh] sm:max-h-[60vh] no-scrollbar">
                <div className="space-y-6 md:space-y-8">
                  {/* Principal Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-secondary">
                        <User size={12} /> Receptor
                      </div>
                      <p className="text-xs md:text-sm font-black text-text-primary bg-surface p-3 rounded-2xl border border-border/50 truncate">{selectedRecibo.nome_receptor}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-secondary">
                        <Calendar size={12} /> Data/Hora
                      </div>
                      <p className="text-xs md:text-sm font-black text-text-primary bg-surface p-3 rounded-2xl border border-border/50">{selectedRecibo.data_hora_recebimento}</p>
                    </div>
                  </div>

                  {/* Process Info */}
                  <div className="p-5 md:p-6 bg-surface-hover/50 rounded-2xl md:rounded-[32px] border border-border/50 space-y-4 md:space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-3 md:pb-4">
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-primary">Informações do Objeto</p>
                      <span className="text-[9px] md:text-[10px] font-black bg-primary text-white px-2.5 py-1 rounded-full uppercase">
                        Protocolo OK
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] md:text-[10px] text-text-secondary font-bold uppercase">Nº Processo</p>
                        <p className="text-xs md:text-sm font-black text-primary">{selectedRecibo.processo_numero}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] md:text-[10px] text-text-secondary font-bold uppercase">Nota Fiscal</p>
                        <p className="text-xs md:text-sm font-black text-text-primary">{selectedRecibo.nota_fiscal || '---'}</p>
                      </div>
                      <div className="sm:col-span-2 space-y-1 pt-2">
                        <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-text-secondary font-bold uppercase">
                          <Building2 size={12} /> Fornecedores Confirmados
                        </div>
                        {selectedRecibo.fornecedores_lista && selectedRecibo.fornecedores_lista.length > 0 ? (
                          <ul className="space-y-1.5 mt-2">
                            {selectedRecibo.fornecedores_lista.map((forn, idx) => (
                              <li key={idx} className="text-xs md:text-sm font-black text-text-primary flex items-center gap-2 bg-surface/50 p-2.5 rounded-xl border border-border/30 leading-tight">
                                <span className="text-emerald-500 shrink-0">✓</span> <span>{forn.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs md:text-sm font-black text-text-primary leading-tight p-3 bg-surface/50 rounded-xl border border-border/30">{selectedRecibo.fornecedor || 'N/A'}</p>
                        )}
                        <p className="text-[9px] md:text-[10px] text-text-secondary font-bold mt-2 opacity-60">
                          {selectedRecibo.fornecedores_lista?.length || 0} fornecedor(es) confirmado(s)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document List */}
                  <div className="space-y-3">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center gap-2">
                      <FileCheck size={12} /> Documentos Confirmados
                    </p>
                    <div className="p-4 md:p-5 bg-surface rounded-2xl md:rounded-3xl border border-border/50 shadow-inner">
                      <p className="text-[11px] md:text-xs font-bold text-text-secondary leading-relaxed">
                        {selectedRecibo.documentos || 'Lista de documentos não disponível para este registro.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 md:p-8 border-t border-border bg-surface-hover/30">
                <button 
                  onClick={() => setSelectedRecibo(null)}
                  className="w-full py-4 md:py-5 bg-text-primary text-background rounded-2xl md:rounded-[24px] text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.98] shadow-xl shadow-text-primary/10"
                >
                  Fechar Auditoria
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
