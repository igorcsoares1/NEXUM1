import React from 'react';
import { 
  LayoutDashboard, 
  Fuel, 
  Calendar, 
  ClipboardCheck, 
  FileText,
  Settings
} from 'lucide-react';
import { View } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

export const BottomNav = ({ activeView, setActiveView }: BottomNavProps) => {
  const navItems = [
    { id: 'dashboard' as View, icon: LayoutDashboard, label: 'Início' },
    { id: 'combustivel' as View, icon: Fuel, label: 'Abast.' },
    { id: 'diarias' as View, icon: Calendar, label: 'Diárias' },
    { id: 'checklists' as View, icon: ClipboardCheck, label: 'Check' },
    { id: 'contratos' as View, icon: FileText, label: 'Cont.' },
    { id: 'configuracoes' as View, icon: Settings, label: 'Ajuste' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-border px-2 pb-safe-area-inset-bottom pt-2 z-[60] flex items-center justify-around print:hidden shadow-[0_-4px_20px_-1px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className="flex flex-col items-center justify-center py-1 flex-1 relative group transition-all"
          >
            {isActive && (
              <motion.div 
                layoutId="bottomNavActive"
                className="absolute inset-x-2 inset-y-0 bg-primary/10 rounded-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className={cn(
              "p-1.5 rounded-lg transition-all relative z-10",
              isActive ? "text-primary scale-110" : "text-text-secondary group-hover:text-text-primary"
            )}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[8px] font-black uppercase tracking-tighter mt-0.5 transition-all relative z-10",
              isActive ? "text-primary font-black" : "text-text-secondary"
            )}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
