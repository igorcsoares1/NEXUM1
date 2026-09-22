import React from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImportadorCombustivelProps {
  isImporting: boolean;
  handleImportFuel: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ImportadorCombustivel: React.FC<ImportadorCombustivelProps> = ({
  isImporting,
  handleImportFuel
}) => {
  return (
    <label className={cn(
      "flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer text-sm btn-surface transition-all active:scale-95",
      isImporting && "opacity-50 cursor-not-allowed pointer-events-none"
    )}>
      {isImporting ? (
        <RefreshCw size={18} className="animate-spin" />
      ) : (
        <FileText size={18} />
      )}
      <span>
        {isImporting ? "Processando..." : "Importar Planilha"}
      </span>
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleImportFuel}
        disabled={isImporting}
      />
    </label>
  );
};
