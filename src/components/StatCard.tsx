import React from 'react';
import { motion } from 'motion/react';
import { StatCardProps } from '../types';

export const StatCard = ({ title, value, icon, trend }: StatCardProps) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="glass-card flex flex-col gap-3 md:gap-4 relative overflow-hidden group p-4 md:p-6"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-primary/10" />
    <div className="flex justify-between items-start relative z-10">
      <div className="p-2 md:p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-inner">
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg ${trend.isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {trend.value}
        </div>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl md:text-3xl font-black tracking-tighter">{value}</h3>
    </div>
  </motion.div>
);
