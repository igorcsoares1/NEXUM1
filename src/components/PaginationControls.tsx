import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

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
  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2 print:hidden">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">Mostrar:</span>
        <select 
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="bg-surface-hover border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary font-bold"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
      <p className="text-xs text-text-secondary font-medium">
        Exibindo <span className="font-bold text-text-primary">{showingItems}</span> de <span className="font-bold text-text-primary">{totalItems}</span> {label}
      </p>
    </div>
    <div className="flex items-center gap-2">
      <button 
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="p-2 border border-border rounded-xl hover:bg-surface-hover disabled:opacity-30 transition-all"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum = i + 1;
          if (totalPages > 5 && currentPage > 3) {
            pageNum = currentPage - 3 + i + 1;
            if (pageNum > totalPages) pageNum = totalPages - (4 - i);
          }
          return (
            <button 
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                "w-9 h-9 rounded-xl text-xs font-bold transition-all",
                currentPage === pageNum ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-surface-hover text-text-secondary"
              )}
            >
              {pageNum}
            </button>
          );
        })}
      </div>
      <button 
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages || totalPages === 0}
        className="p-2 border border-border rounded-xl hover:bg-surface-hover disabled:opacity-30 transition-all"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  </div>
);
