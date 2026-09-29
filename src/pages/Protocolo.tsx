import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileDown, 
  ChevronRight, 
  Download, 
  Upload, 
  Layout, 
  Repeat, 
  Clock, 
  Archive,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Share2,
  Paperclip,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Protocol } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProtocoloPageProps {
  type: 'entrada' | 'saida' | 'processos' | 'tramitacao' | 'pendencias' | 'arquivos';
  currentUser: any;
  protocols: Protocol[];
  onSave: (protocol: Partial<Protocol>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  addNotification?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const PRIORITY_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente'
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_tramitacao: 'Em Tramitação',
  concluido: 'Concluído',
  arquivado: 'Arquivado'
};

const ProtocoloPage = ({ type, currentUser, protocols, onSave, onDelete, addNotification }: ProtocoloPageProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newProtocol, setNewProtocol] = useState<Partial<Protocol>>({
    type: type === 'entrada' || type === 'saida' ? type : 'entrada',
    priority: 'normal',
    documentType: type === 'processos' ? 'Processo Administrativo' : 'Ofício',
    subject: '',
    description: '',
    sender: '',
    destinationUnit: '',
    status: 'pendente'
  });

  const filteredProtocols = protocols.filter(p => {
    // Basic filter by type
    if (type === 'arquivos') return p.status === 'arquivado';
    if (type === 'pendencias') return p.status === 'pendente';
    if (type === 'entrada' || type === 'saida') return p.type === type && p.status !== 'arquivado';
    if (type === 'processos') return p.documentType === 'Processo Administrativo' && p.status !== 'arquivado';
    return p.status !== 'arquivado';
  }).filter(p => {
    const search = searchQuery.toLowerCase();
    return (
      (p.subject || '').toLowerCase().includes(search) ||
      (p.sender || '').toLowerCase().includes(search) ||
      (p.processNumber || '').toLowerCase().includes(search) ||
      (p.documentType || '').toLowerCase().includes(search)
    );
  });

  const handleSave = async (protocolData: Partial<Protocol>) => {
    if (!protocolData.subject || !protocolData.sender) {
      if (addNotification) addNotification("Aviso", "Assunto e Remetente são obrigatórios.", "warning");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        ...protocolData,
        prefeituraId: currentUser.prefeituraId,
        createdAt: protocolData.createdAt || new Date().toISOString()
      });
      setShowNewModal(false);
      setShowEditModal(false);
      setSelectedProtocol(null);
      setNewProtocol({
        type: type === 'entrada' || type === 'saida' ? type : 'entrada',
        priority: 'normal',
        documentType: 'Ofício',
        subject: '',
        description: '',
        sender: '',
        destinationUnit: '',
        status: 'pendente'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getTitle = () => {
    switch(type) {
      case 'entrada': return 'Protocolo de Entrada';
      case 'saida': return 'Protocolo de Saída';
      case 'processos': return 'Processos Administrativos';
      case 'tramitacao': return 'Tramitação de Documentos';
      case 'pendencias': return 'Pendências de Resposta';
      case 'arquivos': return 'Arquivo Permanente';
      default: return 'Protocolo';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'entrada': return Download;
      case 'saida': return Upload;
      case 'processos': return Layout;
      case 'tramitacao': return Repeat;
      case 'pendencias': return Clock;
      case 'arquivos': return Archive;
      default: return Layout;
    }
  };

  const Icon = getIcon();

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50/30">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
              <Icon size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                {getTitle()}
              </h1>
              <p className="text-slate-500 font-medium tracking-tight">
                Sistema de gestão e rastreabilidade de {getTitle().toLowerCase()}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="bg-white border border-slate-200 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              <FileDown size={18} />
              Exportar
            </button>
            {type !== 'arquivos' && type !== 'pendencias' && type !== 'tramitacao' && (
              <button 
                onClick={() => {
                  setNewProtocol({
                    type: type === 'entrada' || type === 'saida' ? type : 'entrada',
                    priority: 'normal',
                    documentType: type === 'processos' ? 'Processo Administrativo' : 'Ofício',
                    subject: '',
                    description: '',
                    sender: '',
                    destinationUnit: '',
                    status: 'pendente'
                  });
                  setShowNewModal(true);
                }}
                className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-black shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
              >
                <Plus size={20} />
                {type === 'processos' ? 'Novo Processo' : type === 'saida' ? 'Novo Saída' : 'Novo Protocolo'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Icon size={64} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Geral</p>
            <h3 className="text-4xl font-black text-slate-900">{filteredProtocols.length}</h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Clock size={64} className="text-amber-500" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Em Aberto</p>
            <h3 className="text-4xl font-black text-amber-500">{filteredProtocols.filter(p => p.status === 'pendente' || p.status === 'em_tramitacao').length}</h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <CheckCircle2 size={64} className="text-emerald-500" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Concluídos</p>
            <h3 className="text-4xl font-black text-emerald-500">{filteredProtocols.filter(p => p.status === 'concluido').length}</h3>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle size={64} className="text-rose-500" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Urgentes</p>
            <h3 className="text-4xl font-black text-rose-500">{filteredProtocols.filter(p => p.priority === 'urgente').length}</h3>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por número, assunto, remetente ou tipo..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center gap-2 text-sm font-black hover:bg-slate-800 transition-all w-full md:w-auto justify-center shadow-lg shadow-slate-900/10">
            <Filter size={18} />
            Filtros Avançados
          </button>
        </div>

        {/* List */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          {filteredProtocols.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Documento / Ref</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Assunto e Prioridade</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Remetente / Destino</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data / Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProtocols.map((protocol) => (
                    <tr key={protocol.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border",
                            protocol.priority === 'urgente' ? "bg-rose-50 border-rose-100 text-rose-600" : 
                            protocol.priority === 'alta' ? "bg-amber-50 border-amber-100 text-amber-600" :
                            "bg-white border-slate-100 text-slate-400"
                          )}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{protocol.documentType}</p>
                            <p className="text-[10px] font-black text-primary uppercase mt-0.5">{protocol.processNumber || 'Sem Número'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-slate-700 line-clamp-1 max-w-[250px]">{protocol.subject}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                            protocol.priority === 'urgente' ? "bg-rose-500 text-white border-rose-600" :
                            protocol.priority === 'alta' ? "bg-amber-500 text-white border-amber-600" :
                            protocol.priority === 'baixa' ? "bg-slate-100 text-slate-500 border-slate-200" :
                            "bg-blue-500 text-white border-blue-600"
                          )}>
                            {PRIORITY_LABELS[protocol.priority] || protocol.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-slate-700">{protocol.sender}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <ChevronRight size={12} className="text-slate-300" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{protocol.destinationUnit}</p>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-slate-700">{format(new Date(protocol.createdAt), "dd MMM yyyy", { locale: ptBR })}</p>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                          protocol.status === 'concluido' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          protocol.status === 'arquivado' ? "bg-slate-100 text-slate-500 border-slate-200" :
                          protocol.status === 'em_tramitacao' ? "bg-blue-50 text-blue-600 border-blue-100" :
                          "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            protocol.status === 'concluido' ? "bg-emerald-500" :
                            protocol.status === 'arquivado' ? "bg-slate-400" :
                            protocol.status === 'em_tramitacao' ? "bg-blue-500" :
                            "bg-amber-500"
                          )} />
                          {STATUS_LABELS[protocol.status] || (protocol.status || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 translate-x-4">
                          <button 
                            onClick={() => { setSelectedProtocol(protocol); setShowViewModal(true); }}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm"
                            title="Ver Detalhes"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => { setSelectedProtocol(protocol); setShowEditModal(true); }}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          {protocol.status !== 'arquivado' && (
                            <button 
                              onClick={() => onSave({ ...protocol, status: 'arquivado' })}
                              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:border-amber-500 transition-all shadow-sm"
                              title="Arquivar"
                            >
                              <Archive size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => onDelete(protocol.id)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-500 transition-all shadow-sm"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="min-h-[450px] flex flex-col items-center justify-center p-12 text-center bg-slate-50/30">
              <div className="w-24 h-24 bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                <Icon size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Nenhum registro encontrado</h2>
              <p className="text-slate-500 font-medium max-w-sm">
                Não existem {getTitle().toLowerCase()} que correspondam aos seus critérios de busca.
              </p>
              <button 
                onClick={() => {
                  setNewProtocol({
                    type: type === 'entrada' || type === 'saida' ? type : 'entrada',
                    priority: 'normal',
                    documentType: type === 'processos' ? 'Processo Administrativo' : 'Ofício',
                    subject: '',
                    description: '',
                    sender: '',
                    destinationUnit: '',
                    status: 'pendente'
                  });
                  setShowNewModal(true);
                }}
                className="mt-8 bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
              >
                Cadastrar Primeiro Registro
              </button>
            </div>
          )}
        </div>
      </div>

      {/* View Protocol Modal */}
      <AnimatePresence>
        {showViewModal && selectedProtocol && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowViewModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Icon size={24} /></div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Detalhes do Protocolo</h2>
                    <p className="text-xs font-black text-primary uppercase mt-0.5">{selectedProtocol.processNumber || 'Ref: ' + selectedProtocol.id.slice(0, 8)}</p>
                  </div>
                </div>
                <button onClick={() => setShowViewModal(false)} className="p-3 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 transition-all"><Plus size={24} className="rotate-45" /></button>
              </div>
              
              <div className="p-10 overflow-y-auto space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assunto</p>
                    <p className="text-lg font-black text-slate-900 leading-tight">{selectedProtocol.subject}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Documento</p>
                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{selectedProtocol.documentType}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade</p>
                    <span className={cn(
                      "inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                      selectedProtocol.priority === 'urgente' ? "bg-rose-500 text-white border-rose-600" :
                      selectedProtocol.priority === 'alta' ? "bg-amber-500 text-white border-amber-600" :
                      "bg-blue-500 text-white border-blue-600"
                    )}>
                      {PRIORITY_LABELS[selectedProtocol.priority]}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</p>
                    <span className={cn(
                      "inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                      selectedProtocol.status === 'concluido' ? "bg-emerald-500 text-white border-emerald-600" :
                      selectedProtocol.status === 'em_tramitacao' ? "bg-blue-500 text-white border-blue-600" :
                      "bg-amber-500 text-white border-amber-600"
                    )}>
                      {STATUS_LABELS[selectedProtocol.status]}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Registro</p>
                    <p className="text-lg font-black text-slate-900">{format(new Date(selectedProtocol.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  </div>
                </div>

                <div className="space-y-3 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo de Documento</p>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Remetente</p>
                      <p className="text-base font-black text-slate-900">{selectedProtocol.sender}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300">
                      <ChevronRight size={20} className="hidden md:block" />
                      <Plus size={20} className="md:hidden rotate-90" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Destino</p>
                      <p className="text-base font-black text-slate-900">{selectedProtocol.destinationUnit}</p>
                    </div>
                  </div>
                </div>

                {selectedProtocol.description && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição / Observações</p>
                    <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] text-sm text-slate-600 font-medium leading-relaxed italic">
                      "{selectedProtocol.description}"
                    </div>
                  </div>
                )}

                {selectedProtocol.deadline && (
                  <div className="flex items-center gap-3 p-6 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-600">
                    <Clock size={24} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Prazo para Resposta</p>
                      <p className="text-sm font-black">{format(new Date(selectedProtocol.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                <button onClick={() => setShowViewModal(false)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95">Fechar Documento</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New/Edit Protocol Modal */}
      <AnimatePresence>
        {(showNewModal || showEditModal) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowNewModal(false); setShowEditModal(false); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                    {showEditModal ? 'Editar Registro' : (type === 'processos' ? 'Novo Processo' : type === 'saida' ? 'Novo Saída' : 'Novo Protocolo')}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">Preencha os campos abaixo para registrar o documento.</p>
                </div>
                <button onClick={() => { setShowNewModal(false); setShowEditModal(false); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <Archive size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 pt-4 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Documento *</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                      value={showEditModal ? selectedProtocol?.documentType : newProtocol.documentType}
                      onChange={(e) => showEditModal ? setSelectedProtocol({...selectedProtocol!, documentType: e.target.value}) : setNewProtocol({...newProtocol, documentType: e.target.value})}
                    >
                      <option>Ofício</option>
                      <option>Memorando</option>
                      <option>Requerimento</option>
                      <option>Processo Administrativo</option>
                      <option>Nota Técnica</option>
                      <option>Circular</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                      value={showEditModal ? selectedProtocol?.priority : newProtocol.priority}
                      onChange={(e) => showEditModal ? setSelectedProtocol({...selectedProtocol!, priority: e.target.value as any}) : setNewProtocol({...newProtocol, priority: e.target.value as any})}
                    >
                      <option value="normal">Normal</option>
                      <option value="baixa">Baixa</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto *</label>
                  <input 
                    type="text" 
                    placeholder="Descreva brevemente o assunto" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                    value={showEditModal ? selectedProtocol?.subject : newProtocol.subject}
                    onChange={(e) => showEditModal ? setSelectedProtocol({...selectedProtocol!, subject: e.target.value}) : setNewProtocol({...newProtocol, subject: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição / Observações</label>
                  <textarea 
                    rows={4} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm resize-none"
                    value={showEditModal ? selectedProtocol?.description : newProtocol.description}
                    onChange={(e) => showEditModal ? setSelectedProtocol({...selectedProtocol!, description: e.target.value}) : setNewProtocol({...newProtocol, description: e.target.value})}
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remetente *</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm" 
                      value={showEditModal ? selectedProtocol?.sender : newProtocol.sender}
                      onChange={(e) => showEditModal ? setSelectedProtocol({...selectedProtocol!, sender: e.target.value}) : setNewProtocol({...newProtocol, sender: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade de Destino *</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                      value={showEditModal ? selectedProtocol?.destinationUnit : newProtocol.destinationUnit}
                      onChange={(e) => showEditModal ? setSelectedProtocol({...selectedProtocol!, destinationUnit: e.target.value}) : setNewProtocol({...newProtocol, destinationUnit: e.target.value})}
                    >
                      <option value="">Selecione a Unidade</option>
                      <option value="Gabinete do Prefeito">Gabinete do Prefeito</option>
                      <option value="Secretaria de Administração">Secretaria de Administração</option>
                      <option value="Secretaria de Finanças">Secretaria de Finanças</option>
                      <option value="Secretaria de Saúde">Secretaria de Saúde</option>
                      <option value="Secretaria de Educação">Secretaria de Educação</option>
                      <option value="Secretaria de Infraestrutura">Secretaria de Infraestrutura</option>
                      <option value="Procuradoria Jurídica">Procuradoria Jurídica</option>
                      <option value="Controladoria Interna">Controladoria Interna</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo para Resposta</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                      value={showEditModal ? selectedProtocol?.deadline : newProtocol.deadline}
                      onChange={(e) => showEditModal ? setSelectedProtocol({...selectedProtocol!, deadline: e.target.value}) : setNewProtocol({...newProtocol, deadline: e.target.value})}
                    />
                  </div>
                  {showEditModal && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status do Registro</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                        value={selectedProtocol?.status}
                        onChange={(e) => setSelectedProtocol({...selectedProtocol!, status: e.target.value as any})}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em_tramitacao">Em Tramitação</option>
                        <option value="concluido">Concluído</option>
                        <option value="arquivado">Arquivado</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
                <button 
                  onClick={() => { setShowNewModal(false); setShowEditModal(false); }} 
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleSave(showEditModal ? selectedProtocol! : newProtocol)}
                  disabled={isSaving || (showEditModal ? !selectedProtocol?.subject || !selectedProtocol?.sender : !newProtocol.subject || !newProtocol.sender)}
                  className="bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {isSaving ? 'Gravando...' : (showEditModal ? 'Salvar Alterações' : 'Registrar Documento')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProtocoloPage;
