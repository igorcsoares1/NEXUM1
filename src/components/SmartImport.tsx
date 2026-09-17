import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Zap, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { handleSmartImport } from '../utils/import';
import { User, Contract } from '../types';

interface SmartImportProps {
  currentUser: User;
  contracts: Contract[];
  addNotification: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const SmartImport: React.FC<SmartImportProps> = ({ currentUser, contracts, addNotification }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleSmartImport(file, setIsImporting, addNotification, currentUser, contracts);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleSmartImport(file, setIsImporting, addNotification, currentUser, contracts);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative group overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-500 ${
          isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-border hover:border-primary/50 bg-surface/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
          accept=".csv,.xlsx,.xls,.pdf"
        />

        <div className="p-8 flex flex-col items-center text-center">
          <div className="mb-4 relative">
            <motion.div
              animate={isImporting ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-500 ${
                isImporting ? 'bg-primary/20 text-primary' : 'bg-surface-hover text-text-secondary group-hover:bg-primary/10 group-hover:text-primary'
              }`}
            >
              {isImporting ? <Loader2 size={32} /> : <Zap size={32} />}
            </motion.div>
            
            <AnimatePresence>
              {!isImporting && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg"
                >
                  <Upload size={12} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <h3 className="text-xl font-black mb-2">Importação Inteligente</h3>
          <p className="text-text-secondary text-sm max-w-xs mb-6">
            Arraste qualquer arquivo (PDF, Excel, CSV) e nossa IA identificará e processará os dados automaticamente.
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className={`px-8 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center gap-2 ${
              isImporting
                ? 'bg-surface-hover text-text-secondary cursor-not-allowed'
                : 'bg-primary text-white hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 active:scale-95'
            }`}
          >
            {isImporting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processando...
              </>
            ) : (
              <>
                <FileText size={20} />
                Selecionar Arquivo
              </>
            )}
          </button>

          <div className="mt-6 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary/50">
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Contratos</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Combustível</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Diárias</span>
          </div>
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Zap size={120} className="text-primary" />
        </div>
      </div>

      {isImporting && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3"
        >
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Info size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">A IA está analisando seu arquivo...</p>
            <p className="text-xs text-text-secondary mt-1">
              Isso pode levar alguns segundos dependendo do tamanho do arquivo. Não feche esta página.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
