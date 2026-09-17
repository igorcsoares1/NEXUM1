import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (val: number) => void;
  totalItems: number;
  showingItems: number;
  label: string;
}

export const PaginationControls = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage, 
  onItemsPerPageChange, 
  totalItems, 
  showingItems,
  label
}: PaginationControlsProps) => (
  <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-hover/30">
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <p className="text-xs text-text-secondary font-medium">
        Mostrando {showingItems} de {totalItems} {label}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Por página:</span>
        <select 
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="bg-surface border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary font-bold"
        >
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button 
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="p-2 hover:bg-border rounded-lg disabled:opacity-30 transition-colors"
      >
        <ChevronRight size={18} className="rotate-180" />
      </button>
      <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
        {Array.from({ length: totalPages }).map((_, i) => {
          if (totalPages > 7) {
            if (i + 1 !== 1 && i + 1 !== totalPages && Math.abs(i + 1 - currentPage) > 1) {
              if (Math.abs(i + 1 - currentPage) === 2) return <span key={`dots-${i}`} className="text-text-secondary px-1">...</span>;
              return null;
            }
          }
          return (
            <button
              key={`page-${i}`}
              onClick={() => onPageChange(i + 1)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-bold transition-all shrink-0",
                currentPage === i + 1 ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-border text-text-secondary"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <button 
        disabled={currentPage === totalPages || totalPages === 0}
        onClick={() => onPageChange(currentPage + 1)}
        className="p-2 hover:bg-border rounded-lg disabled:opacity-30 transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  </div>
);
