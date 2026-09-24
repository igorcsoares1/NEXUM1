import React from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Settings, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { PaginationControls } from '../components/ui/PaginationControls';

interface UsuariosProps {
  currentUser: User;
  isAdmin: boolean;
  setEditingUser: (user: User | null) => void;
  setNewUserData: (data: any) => void;
  setShowNewUserModal: (show: boolean) => void;
  userSearch: string;
  setUserSearch: (search: string) => void;
  paginatedUsers: User[];
  filteredUsers: User[];
  usersPage: number;
  setUsersPage: (page: number) => void;
  usersPerPage: number;
  setUsersPerPage: (val: number) => void;
  handleEditUser: (user: User) => void;
  handleDeleteUser: (id: string) => void;
}

import { motion, AnimatePresence } from 'motion/react';

const Usuarios = ({
  currentUser,
  isAdmin,
  setEditingUser,
  setNewUserData,
  setShowNewUserModal,
  userSearch,
  setUserSearch,
  paginatedUsers,
  filteredUsers,
  usersPage,
  setUsersPage,
  usersPerPage,
  setUsersPerPage,
  handleEditUser,
  handleDeleteUser
}: UsuariosProps) => {
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mb-6 shadow-inner">
          <AlertCircle size={40} />
        </div>
        <h3 className="text-xl font-black tracking-tight mb-2">Acesso Restrito</h3>
        <p className="text-text-secondary text-sm max-w-xs mx-auto">
          Você não possui privilégios administrativos para gerenciar usuários do sistema.
        </p>
      </div>
    );
  }

  const handleOpenNewUser = () => {
    setEditingUser(null);
    setNewUserData({
      prefeituraId: currentUser.prefeituraId || '1',
      name: '',
      username: '',
      password: '',
      email: '',
      role: 'compras',
      department: '',
      status: 'ativo',
      permissions: ['notas_fiscais']
    });
    setShowNewUserModal(true);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8">
        
        {/* ── MOBILE LAYOUT ─────────────────────────────────── */}
        <div className="flex flex-col lg:hidden">
          <header className="px-4 pt-6 pb-2 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Usuários</h2>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mt-0.5">Gestão de Acessos</p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input 
                type="text" 
                placeholder="Buscar usuários..."
                className="w-full bg-surface-hover/50 border border-border/60 rounded-2xl pl-11 pr-4 py-3.5 outline-none focus:border-primary transition-all text-sm font-bold shadow-inner"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          </header>

          <div className="p-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {paginatedUsers.map((user, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  key={`mob-user-${user.id}`}
                  className="bg-surface border border-border/60 rounded-[2rem] p-5 shadow-sm active:scale-98 transition-all relative overflow-hidden group"
                  onClick={() => handleEditUser(user)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-black shadow-inner">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-black tracking-tight text-lg truncate pr-2">{user.name}</p>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          user.status === 'ativo' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-text-secondary"
                        )} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                          user.role === 'superadmin' ? "bg-indigo-500/10 text-indigo-500" :
                          user.role === 'admin' ? "bg-rose-500/10 text-rose-500" : 
                          user.role === 'gestor' ? "bg-amber-500/10 text-amber-500" : 
                          "bg-blue-500/10 text-blue-500"
                        )}>
                          {user.role}
                        </span>
                        <span className="text-[10px] text-text-secondary font-bold truncate">• {user.department}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/40 flex justify-between items-center">
                    <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest italic">Acesso: {user.lastLogin}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditUser(user); }}
                        className="p-2 bg-surface-hover rounded-xl text-primary"
                      >
                        <Settings size={18} />
                      </button>
                      {isAdmin && user.id !== currentUser.id && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}
                          className="p-2 bg-rose-500/10 rounded-xl text-rose-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Floating Action Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleOpenNewUser}
            className="fixed bottom-24 right-6 w-14 h-14 sm:w-16 sm:h-16 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center z-50 transition-transform active:rotate-12 touch-manipulation"
          >
            <Plus size={32} />
          </motion.button>
        </div>

        {/* ── DESKTOP LAYOUT ────────────────────────────────── */}
        <div className="hidden lg:flex flex-col p-8 space-y-8 max-w-[1600px] mx-auto w-full">
           <header className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tighter">Gestão de Usuários</h1>
              <p className="text-text-secondary font-medium text-lg">Controle central de acessos, permissões e departamentos.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleOpenNewUser}
                className="px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 btn-primary"
              >
                <Plus size={20} /> Cadastrar Novo Usuário
              </button>
            </div>
          </header>

          <div className="glass-card p-0 overflow-hidden shadow-2xl shadow-black/20">
            <div className="p-6 border-b border-border bg-surface-hover/30 flex justify-between items-center">
              <div className="relative w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                <input 
                  type="text" 
                  placeholder="Filtrar por nome, email ou área..."
                  className="w-full bg-surface border border-border rounded-2xl pl-11 pr-4 py-2.5 outline-none focus:border-primary transition-all font-bold"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest btn-surface">
                <Filter size={16} /> Filtros Avançados
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-hover/50 border-b border-border">
                    <th className="px-8 py-5 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Perfil</th>
                    <th className="px-8 py-5 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Nivel</th>
                    <th className="px-8 py-5 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Departamento</th>
                    <th className="px-8 py-5 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Visto por último</th>
                    <th className="px-8 py-5 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginatedUsers.map((user, idx) => (
                    <tr key={`user-row-${user.id}-${idx}`} className="hover:bg-surface-hover/20 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-[1.25rem] bg-surface-hover border border-border flex items-center justify-center text-primary font-black shadow-inner">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-base font-black tracking-tight leading-tight">{user.name}</p>
                            <p className="text-[11px] text-text-secondary font-medium tracking-tight mt-1">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ring-1 ring-inset",
                          user.role === 'superadmin' ? "bg-indigo-500/10 text-indigo-500 ring-indigo-500/20" :
                          user.role === 'admin' ? "bg-rose-500/10 text-rose-500 ring-rose-500/20" : 
                          user.role === 'gestor' ? "bg-amber-500/10 text-amber-500 ring-amber-500/20" : 
                          "bg-blue-500/10 text-blue-500 ring-blue-500/20"
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-text-secondary">{user.department}</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", user.status === 'ativo' ? "bg-emerald-500" : "bg-text-secondary")} />
                          <span className="text-xs font-black uppercase tracking-tighter">{user.status}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm text-text-secondary font-medium tracking-tight">{user.lastLogin}</td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditUser(user)} className="p-2.5 bg-surface border border-border hover:border-primary hover:text-primary rounded-xl transition-all shadow-sm">
                            <Settings size={18} />
                          </button>
                          {isAdmin && user.id !== currentUser.id && (
                            <button onClick={() => handleDeleteUser(user.id)} className="p-2.5 bg-surface border border-border hover:border-rose-500 hover:text-rose-500 rounded-xl transition-all shadow-sm">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-border bg-surface-hover/10">
              <PaginationControls 
                currentPage={usersPage}
                totalPages={Math.ceil(filteredUsers.length / usersPerPage)}
                onPageChange={setUsersPage}
                itemsPerPage={usersPerPage}
                onItemsPerPageChange={(val) => {
                  setUsersPerPage(val);
                  setUsersPage(1);
                }}
                totalItems={filteredUsers.length}
                showingItems={paginatedUsers.length}
                label="usuários registrados"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
