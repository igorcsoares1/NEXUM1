import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PrintHeader = ({ title }: { title: string }) => (
  <div className="hidden print:flex flex-col gap-4 border-b-2 border-black pb-6 mb-8">
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-black">NEXUM</h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/60">Sistema de Gestão Municipal</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-black">{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        <p className="text-[10px] font-medium text-black/40 uppercase tracking-widest">Relatório Gerado Automaticamente</p>
      </div>
    </div>
    <div className="py-3 bg-black/5 rounded-lg text-center">
      <h2 className="text-xl font-black uppercase tracking-[0.3em] text-black">{title}</h2>
    </div>
  </div>
);
