import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  Plus, 
  Search, 
  Trash2, 
  Users,
  IdCard
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User, Servidor, DailyRecord } from '../types';
import { PaginationControls } from '../components/ui/PaginationControls';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { syncServidoresFromDiarias } from '../services/daily';

interface ServidoresProps {
  currentUser: User;
  isAdmin: boolean;
  handlePrint: () => void;
  servidores: Servidor[];
  dailyRecords: DailyRecord[];
  addNotification: (title: string, message: string, type: any) => void;
  handleEditServidor: (servidor: Servidor) => void;
  handleDeleteServidor: (id: string) => void;
  setShowNewServidorModal: (show: boolean) => void;
  setEditingServidor: (servidor: Servidor | null) => void;
  setNewServidorData: (data: any) => void;
}

const Servidores = ({
  currentUser,
  isAdmin,
  handlePrint,
  servidores,
  dailyRecords,
  addNotification,
  handleEditServidor,
  handleDeleteServidor,
  setShowNewServidorModal,
  setEditingServidor,
  setNewServidorData
}: ServidoresProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncServidoresFromDiarias(currentUser, servidores, dailyRecords || [], addNotification);
    setIsSyncing(false);
  };

  const filteredServidores = useMemo(() => {
    return servidores.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cpf?.includes(searchQuery) ||
      s.registrationNumber?.includes(searchQuery)
    );
  }, [servidores, searchQuery]);

  const paginatedServidores = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredServidores.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredServidores, currentPage, itemsPerPage]);

  const handleOpenNewServidor = () => {
    setEditingServidor(null);
    setNewServidorData({
      prefeituraId: currentUser.prefeituraId || '1',
      name: '',
      cpf: '',
      registrationNumber: '',
    });
    setShowNewServidorModal(true);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-20 xl:pb-8">
        
        {/* Header Section */}
        <div className="p-4 sm:p-8 space-y-6">
          <div className="flex justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Base de Servidores</h2>
              <p className="text-sm text-text-secondary font-medium">Gestão de funcionários e beneficiários de diárias.</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                title="Sincronizar nomes das diárias"
                className="w-11 h-11 flex items-center justify-center bg-surface border border-border rounded-2xl text-primary active:scale-95 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
              </button>
              <button 
                onClick={handlePrint}
                className="w-11 h-11 flex items-center justify-center bg-surface border border-border rounded-2xl text-text-primary active:scale-95 transition-all shadow-sm"
              >
                <Printer size={20} />
              </button>
              {isAdmin && (
                <button 
                  onClick={handleOpenNewServidor}
                  className="bg-primary text-white h-11 px-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus size={16} strokeWidth={3} />
                  Cadastrar
                </button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-border rounded-3xl p-4 shadow-sm">
              <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 opacity-60">Total</p>
              <p className="text-xl font-black tracking-tight">{servidores.length}</p>
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-3xl p-4 shadow-sm">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 opacity-60">Filtrados</p>
              <p className="text-xl font-black tracking-tight text-primary">{filteredServidores.length}</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input 
              type="text" 
              placeholder="Buscar por nome, CPF ou matrícula..."
              className="w-full bg-surface border border-border rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-primary transition-all font-bold text-sm shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Desktop Table */}
          <div className="hidden xl:block overflow-hidden bg-surface border border-border rounded-3xl shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-hover/50 text-[10px] font-black uppercase tracking-widest text-text-secondary border-b border-border">
                  <th className="px-6 py-5">Nome do Servidor</th>
                  <th className="px-6 py-5">Matrícula</th>
                  <th className="px-6 py-5">Identificação / CPF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedServidores.map((servidor) => (
                   <tr 
                    key={servidor.id} 
                    className="hover:bg-surface-hover/30 transition-colors group cursor-pointer"
                    onClick={() => isAdmin && handleEditServidor(servidor)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-xs">
                          {servidor.name.charAt(0)}
                        </div>
                        <p className="text-sm font-black tracking-tight">{servidor.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <IdCard size={14} className="text-primary/40" />
                        <p className="text-sm font-black text-text-primary">
                          {servidor.registrationNumber || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-text-secondary">
                      {servidor.cpf || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="xl:hidden space-y-3">
            {paginatedServidores.map((servidor) => (
              <div 
                key={servidor.id} 
                className="bg-surface border border-border rounded-3xl p-5 shadow-sm space-y-4 cursor-pointer active:scale-[0.98] transition-all"
                onClick={() => isAdmin && handleEditServidor(servidor)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black uppercase">
                    {servidor.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black truncate text-base leading-none mb-1">{servidor.name}</h3>
                    <p className="text-[10px] uppercase font-black tracking-widest text-primary">Matrícula: {servidor.registrationNumber || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Identificação / CPF</p>
                    <p className="text-xs font-bold">{servidor.cpf || '-'}</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteServidor(servidor.id);
                      }}
                      className="w-full h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20 active:scale-95 transition-all gap-2 font-black uppercase tracking-widest text-[10px]"
                    >
                      <Trash2 size={18} />
                      Excluir Registro
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredServidores.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-text-secondary/40">
              <div className="w-20 h-20 rounded-full bg-surface-hover flex items-center justify-center mb-4">
                <Users size={32} />
              </div>
              <p className="font-bold">Nenhum servidor encontrado</p>
              <p className="text-xs">Tente ajustar sua busca ou cadastrar um novo.</p>
            </div>
          )}

          {/* Pagination */}
          <div className="mt-4">
            <PaginationControls 
              currentPage={currentPage}
              totalPages={Math.ceil(filteredServidores.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
              totalItems={filteredServidores.length}
              showingItems={paginatedServidores.length}
              label="servidores"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Servidores;
