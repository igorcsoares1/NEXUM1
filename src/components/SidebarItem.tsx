import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SidebarItemProps {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}

export const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: SidebarItemProps) => (
  <motion.button 
    type="button"
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "sidebar-item group w-full text-left touch-manipulation",
      active && "sidebar-item-active"
    )}
  >
    <Icon size={20} className={cn("transition-transform group-hover:scale-110 shrink-0", active && "scale-110")} />
    <span className="text-sm font-bold tracking-tight truncate">{label}</span>
    {badge && (
      <span className={cn(
        "ml-auto text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0",
        active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
      )}>
        {badge}
      </span>
    )}
  </motion.button>
);
