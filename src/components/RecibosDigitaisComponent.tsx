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
  FileCheck
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

export function RecibosDigitaisComponent() {
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecibo, setSelectedRecibo] = useState<Recibo | null>(null);

  useEffect(() => {
    fetchRecibos();

    // Inscrição em tempo real para novos recibos
    const channel = supabase
      .channel('realtime:recibos_digitais')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recibos_digitais' }, (payload) => {
        setRecibos(prev => [payload.new as Recibo, ...prev]);
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

  const filteredRecibos = recibos.filter(r => 
    r.nome_receptor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.processo_numero || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.fornecedor || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Carregando Auditoria...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/50 rounded-[32px] border border-border overflow-hidden">
      {/* Header Interativo */}
      <div className="p-6 border-b border-border bg-surface-hover/30">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
              <FileCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-text-primary">Recibos Digitais</h2>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Protocolos de Auditoria</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-border shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-text-secondary uppercase tracking-tighter">Live</span>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Buscar por nome, processo ou fornecedor..."
            className="w-full bg-surface border border-border/50 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Recibos em Grade/Lista */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredRecibos.length > 0 ? (
            filteredRecibos.map((recibo, index) => (
              <motion.button
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={`${recibo.id}-${index}`}
                onClick={() => setSelectedRecibo(recibo)}
                className="w-full text-left p-4 rounded-2xl border border-border/50 bg-surface/40 hover:bg-surface-hover hover:border-primary/30 transition-all group relative"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                    <CheckSquare size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-black text-text-primary truncate pr-2">
                        {recibo.nome_receptor}
                      </p>
                      <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase shrink-0">
                        {recibo.status || 'recebido'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px] text-text-secondary font-bold">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="opacity-50" />
                        {recibo.data_hora_recebimento}
                      </div>
                      <div className="flex items-center gap-1.5 text-primary">
                        <Hash size={12} className="opacity-50" />
                        {recibo.processo_numero}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-text-secondary/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </motion.button>
            ))
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
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedRecibo(null)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 30 }} 
              className="bg-background w-full max-w-lg relative z-10 rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-border/50"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-border bg-surface-hover/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 rounded-[20px] text-white shadow-lg shadow-emerald-500/20">
                    <CheckSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-text-primary">Comprovante Digital</h3>
                    <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest flex items-center gap-2">
                      ID: {selectedRecibo.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRecibo(null)} 
                  className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-2xl text-text-secondary transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-8 overflow-y-auto max-h-[60vh] no-scrollbar">
                <div className="space-y-8">
                  {/* Principal Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                        <User size={12} /> Receptor
                      </div>
                      <p className="text-sm font-black text-text-primary bg-surface p-3 rounded-2xl border border-border/50">{selectedRecibo.nome_receptor}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                        <Calendar size={12} /> Data/Hora
                      </div>
                      <p className="text-sm font-black text-text-primary bg-surface p-3 rounded-2xl border border-border/50">{selectedRecibo.data_hora_recebimento}</p>
                    </div>
                  </div>

                  {/* Process Info */}
                  <div className="p-6 bg-surface-hover/50 rounded-[32px] border border-border/50 space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Informações do Objeto</p>
                      <span className="text-[10px] font-black bg-primary text-white px-3 py-1 rounded-full uppercase">
                        Protocolo OK
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] text-text-secondary font-bold uppercase">Nº Processo</p>
                        <p className="text-sm font-black text-primary">{selectedRecibo.processo_numero}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-text-secondary font-bold uppercase">Nota Fiscal</p>
                        <p className="text-sm font-black text-text-primary">{selectedRecibo.nota_fiscal || '---'}</p>
                      </div>
                      <div className="col-span-2 space-y-1 pt-2">
                        <div className="flex items-center gap-2 text-[10px] text-text-secondary font-bold uppercase">
                          <Building2 size={12} /> Fornecedores Confirmados
                        </div>
                        {selectedRecibo.fornecedores_lista && selectedRecibo.fornecedores_lista.length > 0 ? (
                          <ul className="space-y-1 mt-2">
                            {selectedRecibo.fornecedores_lista.map((forn, idx) => (
                              <li key={idx} className="text-sm font-black text-text-primary flex items-center gap-2 bg-surface/50 p-2 rounded-xl border border-border/30">
                                <span className="text-emerald-500">✓</span> {forn.trim()}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm font-black text-text-primary leading-tight">{selectedRecibo.fornecedor || 'N/A'}</p>
                        )}
                        <p className="text-[10px] text-text-secondary font-bold mt-2 opacity-60">
                          {selectedRecibo.fornecedores_lista?.length || 0} fornecedor(es) confirmado(s)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document List */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center gap-2">
                      <FileCheck size={12} /> Documentos Confirmados
                    </p>
                    <div className="p-5 bg-surface rounded-3xl border border-border/50 shadow-inner">
                      <p className="text-xs font-bold text-text-secondary leading-relaxed">
                        {selectedRecibo.documentos || 'Lista de documentos não disponível para este registro.'}
                      </p>
                    </div>
                  </div>

                  {/* Origin - Seção comentada conforme solicitado
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Ponto de Acesso</p>
                    <div className="flex items-center gap-2 p-3 bg-surface rounded-2xl border border-border/50">
                      <ExternalLink size={12} className="text-primary" />
                      <a 
                        href={selectedRecibo.url_original} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-primary hover:underline truncate flex-1"
                      >
                        {selectedRecibo.url_original}
                      </a>
                    </div>
                  </div>
                  */}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-border bg-surface-hover/30">
                <button 
                  onClick={() => setSelectedRecibo(null)}
                  className="w-full py-5 bg-text-primary text-background rounded-[24px] text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-text-primary/20"
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
