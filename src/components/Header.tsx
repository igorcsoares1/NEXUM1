import React from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import { View, User } from '../types';

interface HeaderProps {
  setIsSidebarOpen: (open: boolean) => void;
  activeView: View;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser: User;
}

export const Header = ({
  setIsSidebarOpen,
  activeView,
  searchQuery,
  setSearchQuery,
  currentUser
}: HeaderProps) => {
  return (
    <header className="h-20 border-b border-border flex items-center justify-between px-4 md:px-8 bg-background/50 backdrop-blur-xl z-50 shrink-0 print:hidden">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-surface-hover rounded-xl lg:hidden text-text-secondary"
        >
          <Menu size={24} />
        </button>
        <div className="hidden sm:block">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </p>
          <h2 className="text-lg md:text-xl font-black capitalize leading-none">{activeView}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <div className="relative hidden md:block w-64 lg:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2 outline-none focus:border-primary transition-colors text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button className="p-2 md:p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-background"></span>
          </button>
          <div className="hidden xs:block w-px h-6 bg-border mx-1 md:mx-2"></div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-sm md:text-base">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden xl:block">
              <p className="text-sm font-bold leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-text-secondary uppercase tracking-tight mt-1">{currentUser.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
