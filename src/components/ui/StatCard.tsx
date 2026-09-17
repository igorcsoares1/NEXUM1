import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { StatCardProps } from '../../types';

export const StatCard = ({ title, value, icon, trend, onClick, isActive }: StatCardProps) => (
  <motion.div 
    whileHover={onClick ? { y: -4, scale: 1.02 } : { y: -4 }}
    onClick={onClick}
    className={cn(
      "glass-card flex flex-col gap-2 md:gap-3 relative overflow-hidden group p-3 md:p-4 transition-all",
      onClick && "cursor-pointer active:scale-95",
      isActive && "ring-2 ring-primary bg-primary/5"
    )}
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-primary/10" />
    <div className="flex justify-between items-start relative z-10">
      <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl text-primary shadow-inner shrink-0">
        {icon}
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg uppercase tracking-wider",
          trend.isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        )}>
          {trend.isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trend.value}
        </div>
      )}
    </div>
    <div className="relative z-10 min-w-0">
      <p className="text-text-secondary text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] truncate">{title}</p>
      <h3 className="text-lg md:text-2xl font-black mt-1 tracking-tight truncate">{value}</h3>
    </div>
  </motion.div>
);
