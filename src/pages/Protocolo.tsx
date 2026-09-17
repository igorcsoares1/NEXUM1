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
  Paperclip
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
}

const ProtocoloPage = ({ type, currentUser, protocols, onSave, onDelete }: ProtocoloPageProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newProtocol, setNewProtocol] = useState<Partial<Protocol>>({
    type: type === 'entrada' || type === 'saida' ? type : 'entrada',
    priority: 'normal',
    documentType: 'Ofício',
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
      p.subject.toLowerCase().includes(search) ||
      p.sender.toLowerCase().includes(search) ||
      p.processNumber?.toLowerCase().includes(search)
    );
  });

  const handleSave = async () => {
    if (!newProtocol.subject || !newProtocol.sender) return;
    setIsSaving(true);
    try {
      await onSave({
        ...newProtocol,
        prefeituraId: currentUser.prefeituraId,
        createdAt: new Date().toISOString()
      });
      setShowNewModal(false);
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
      case 'processos': return 'Processos';
      case 'tramitacao': return 'Tramitação de Documentos';
      case 'pendencias': return 'Pendências';
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
    <div className="flex-1 overflow-auto p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {getTitle()}
              </h1>
              <p className="text-sm text-slate-500 font-medium tracking-tight">
                Gestão e acompanhamento de {getTitle().toLowerCase()}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-surface px-4 py-2.5 flex items-center gap-2 text-sm font-bold">
              <FileDown size={18} />
              Exportar
            </button>
            {type !== 'arquivos' && type !== 'pendencias' && type !== 'tramitacao' && (
              <button 
                onClick={() => setShowNewModal(true)}
                className="bg-primary text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
              >
                <Plus size={18} />
                {type === 'processos' ? 'Novo Processo' : type === 'saida' ? 'Novo Saída' : 'Novo Protocolo'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total {getTitle()}</p>
            <h3 className="text-3xl font-black text-slate-900">{filteredProtocols.length}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pendentes</p>
            <h3 className="text-3xl font-black text-amber-500">{filteredProtocols.filter(p => p.status === 'pendente').length}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Concluídos</p>
            <h3 className="text-3xl font-black text-emerald-500">{filteredProtocols.filter(p => p.status === 'concluido').length}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Urgentes</p>
            <h3 className="text-3xl font-black text-rose-500">{filteredProtocols.filter(p => p.priority === 'urgente').length}</h3>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por número, assunto ou remetente..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-surface px-4 py-3 flex items-center gap-2 text-sm font-bold w-full md:w-auto justify-center">
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
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assunto</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Remetente/Destino</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data/Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProtocols.map((protocol) => (
                    <tr key={protocol.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                            protocol.priority === 'urgente' ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                          )}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{protocol.documentType}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{protocol.processNumber || 'S/N'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-700 line-clamp-1">{protocol.subject}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            protocol.priority === 'urgente' ? "bg-rose-100 text-rose-600" :
                            protocol.priority === 'alta' ? "bg-amber-100 text-amber-600" :
                            "bg-slate-100 text-slate-500"
                          )}>
                            {protocol.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-700">{protocol.sender}</p>
                        <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                          <ChevronRight size={10} />
                          {protocol.destinationUnit}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-700">{format(new Date(protocol.createdAt), "dd MMM yyyy", { locale: ptBR })}</p>
                        <span className={cn(
                          "inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                          protocol.status === 'concluido' ? "bg-emerald-100 text-emerald-600" :
                          protocol.status === 'arquivado' ? "bg-slate-100 text-slate-500" :
                          "bg-amber-100 text-amber-600"
                        )}>
                          {(protocol.status || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary transition-colors shadow-sm border border-transparent hover:border-slate-200">
                            <Eye size={16} />
                          </button>
                          <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary transition-colors shadow-sm border border-transparent hover:border-slate-200">
                            <Edit2 size={16} />
                          </button>
                          {protocol.status !== 'arquivado' && (
                            <button 
                              onClick={() => onSave({ ...protocol, status: 'arquivado' })}
                              className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-amber-500 transition-colors shadow-sm border border-transparent hover:border-slate-200"
                              title="Arquivar"
                            >
                              <Archive size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => onDelete(protocol.id)}
                            className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors shadow-sm border border-transparent hover:border-rose-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="min-h-[400px] flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-400 mb-6">
                <Icon size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2 uppercase">Nenhum registro encontrado</h2>
              <p className="text-slate-500 font-medium max-w-sm">
                Não existem {getTitle().toLowerCase()} registrados ou que correspondam aos filtros aplicados.
              </p>
              <button 
                onClick={() => setShowNewModal(true)}
                className="mt-8 bg-primary/10 text-primary px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/20 transition-all active:scale-95"
              >
                Começar Agora
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Protocol Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                    {type === 'processos' ? 'Novo Processo' : type === 'saida' ? 'Novo Saída' : 'Novo Protocolo'}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">Registre um novo documento no sistema.</p>
                </div>
                <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <Archive size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 pt-4 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Documento *</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                      value={newProtocol.documentType}
                      onChange={(e) => setNewProtocol({...newProtocol, documentType: e.target.value})}
                    >
                      <option>Ofício</option>
                      <option>Memorando</option>
                      <option>Requerimento</option>
                      <option>Processo Administrativo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                      value={newProtocol.priority}
                      onChange={(e) => setNewProtocol({...newProtocol, priority: e.target.value as any})}
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
                    placeholder="Resumo do assunto" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                    value={newProtocol.subject}
                    onChange={(e) => setNewProtocol({...newProtocol, subject: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição / Observações</label>
                  <textarea 
                    rows={4} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm resize-none"
                    value={newProtocol.description}
                    onChange={(e) => setNewProtocol({...newProtocol, description: e.target.value})}
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remetente *</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm" 
                      value={newProtocol.sender}
                      onChange={(e) => setNewProtocol({...newProtocol, sender: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade de Destino *</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                      value={newProtocol.destinationUnit}
                      onChange={(e) => setNewProtocol({...newProtocol, destinationUnit: e.target.value})}
                    >
                      <option value="">Selecione</option>
                      <option value="Gabinete">Gabinete</option>
                      <option value="Secretaria de Administração">Secretaria de Administração</option>
                      <option value="Secretaria de Finanças">Secretaria de Finanças</option>
                      <option value="Secretaria de Saúde">Secretaria de Saúde</option>
                      <option value="Secretaria de Educação">Secretaria de Educação</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo para Resposta</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-primary font-bold text-sm"
                    value={newProtocol.deadline}
                    onChange={(e) => setNewProtocol({...newProtocol, deadline: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
                <button 
                  onClick={() => setShowNewModal(false)} 
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving || !newProtocol.subject || !newProtocol.sender}
                  className="bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {isSaving ? 'Registrando...' : 'Registrar Documento'}
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
