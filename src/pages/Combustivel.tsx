import React from 'react';
import {
  Printer,
  CheckSquare,
  Trash2,
  FileText,
  RefreshCw,
  Download,
  Plus,
  Fuel,
  BarChart3,
  TrendingUp,
  Search,
  Filter,
  Calendar,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { FuelRecord, User } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { PaginationControls } from '../components/ui/PaginationControls';
import { PrintHeader } from '../components/ui/PrintHeader';
import { formatCurrency, parseCurrencyToNumber } from '../utils/format';

interface CombustivelProps {
  currentUser: User;
  fuelRecords: FuelRecord[];
  filteredFuelRecords: FuelRecord[];
  paginatedFuelRecords: FuelRecord[];
  handlePrint: () => void;
  isFuelSelectionMode: boolean;
  setIsFuelSelectionMode: (mode: boolean) => void;
  selectedFuelIds: string[];
  setSelectedFuelIds: (ids: string[]) => void;
  setDeleteType: (type: any) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  isImporting: boolean;
  handleImportFuel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExportCSV: () => void;
  canAdd: boolean;
  setEditingFuel: (record: FuelRecord | null) => void;
  setNewFuelData: (data: any) => void;
  setShowNewFuelModal: (show: boolean) => void;
  fuelFilters: any;
  setFuelFilters: (filters: any) => void;
  showFuelFilters: boolean;
  setShowFuelFilters: (show: boolean) => void;
  fuelPage: number;
  setFuelPage: (page: number) => void;
  fuelPerPage: number;
  setFuelPerPage: (val: number) => void;
  canEdit: boolean;
  canDelete: boolean;
  handleEditFuel: (record: FuelRecord) => void;
  handleDeleteFuel: (id: string) => void;
}

const Combustivel = ({
  currentUser,
  fuelRecords,
  filteredFuelRecords,
  paginatedFuelRecords,
  handlePrint,
  isFuelSelectionMode,
  setIsFuelSelectionMode,
  selectedFuelIds,
  setSelectedFuelIds,
  setDeleteType,
  setShowDeleteConfirm,
  isImporting,
  handleImportFuel,
  handleExportCSV,
  canAdd,
  setEditingFuel,
  setNewFuelData,
  setShowNewFuelModal,
  fuelFilters,
  setFuelFilters,
  showFuelFilters,
  setShowFuelFilters,
  fuelPage,
  setFuelPage,
  fuelPerPage,
  setFuelPerPage,
  canEdit,
  canDelete,
  handleEditFuel,
  handleDeleteFuel
}: CombustivelProps) => {
  // FIX: Ref para o input de arquivo
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  const totalLiters = filteredFuelRecords.reduce((acc, r) => acc + (parseFloat(r.quantity?.toString() || '0')), 0);
  const totalCost = filteredFuelRecords.reduce((acc, r) => acc + parseCurrencyToNumber(r.cost), 0);

  const vehicleSummary = filteredFuelRecords.reduce((acc, record) => {
    const vehicle = record.vehicle || 'Sem Veículo';
    if (!acc[vehicle]) {
      acc[vehicle] = { liters: 0, cost: 0 };
    }
    acc[vehicle].liters += parseFloat(record.quantity?.toString() || '0');
    acc[vehicle].cost += parseCurrencyToNumber(record.cost);
    return acc;
  }, {} as Record<string, { liters: number; cost: number }>);

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'concluido':
        return {
          color: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
          text: 'Concluído',
          dot: 'bg-emerald-500',
          avatarBg: 'bg-emerald-500/10',
          avatarText: 'text-emerald-500'
        };
      case 'pendente':
        return {
          color: 'bg-rose-500/15 text-rose-500 border border-rose-500/30',
          text: 'Pendente',
          dot: 'bg-rose-500',
          avatarBg: 'bg-rose-500/10',
          avatarText: 'text-rose-500'
        };
      default:
        return {
          color: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
          text: 'Em Andamento',
          dot: 'bg-amber-400',
          avatarBg: 'bg-amber-500/10',
          avatarText: 'text-amber-500'
        };
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden" id="fuel-content">
      <PrintHeader title="Gestão de Combustível" />

      {/* ── MOBILE LAYOUT ─────────────────────────────────── */}
      <div className="flex flex-col xl:hidden flex-1 overflow-y-auto bg-background pb-20">

        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 pt-4 pb-3 print:hidden">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-black tracking-tight">Abastecimentos</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-black">{filteredFuelRecords.length}</span>
              </div>
              <button
                onClick={handlePrint}
                className="p-2 rounded-full hover:bg-surface-hover text-text-secondary active:scale-95 transition-colors"
                title="Imprimir"
              >
                <Printer size={20} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/60" />
            <input
              type="text"
              placeholder="Buscar veículo ou motorista..."
              className="w-full bg-surface-hover border-0 rounded-full pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm font-medium placeholder:text-text-secondary/50"
              value={fuelFilters.search}
              onChange={(e) => setFuelFilters({ ...fuelFilters, search: e.target.value })}
            />
          </div>
        </div>

        {/* Horizontal Metrics */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-border/40 print:hidden" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-1.5 bg-surface border border-border/60 rounded-full px-3 py-1.5 shrink-0">
            <Fuel size={12} className="text-text-secondary" />
            <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Total:</span>
            <span className="text-xs font-black">{totalLiters.toFixed(0)}L</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 shrink-0">
            <TrendingUp size={12} className="text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Investimento:</span>
            <span className="text-xs font-black text-emerald-600">R$ {totalCost.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Card Feed */}
        <div className="flex flex-col flex-1">
          {paginatedFuelRecords.length > 0 ? (
            paginatedFuelRecords.map((record, idx) => {
              const statusCfg = getStatusConfig(record.status);
              return (
                <div
                  key={`fuel-feed-${record.id}-${idx}`}
                  className="w-full border-b border-border/50 last:border-0 px-4 py-5 active:bg-surface-hover/70 transition-colors"
                >
                  <div className="flex gap-4 items-start">
                    {/* Icon Circle */}
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                      statusCfg.avatarBg,
                      statusCfg.avatarText,
                      "border-current/20 shadow-sm shadow-current/10"
                    )}>
                      <Fuel size={22} strokeWidth={2.5} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Row 1: Vehicle + Status */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-base font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                          {record.vehicle}
                        </span>
                        <span className={cn(
                          "text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 uppercase tracking-widest",
                          statusCfg.color
                        )}>
                          <span className={cn("w-1 h-1 rounded-full shrink-0", statusCfg.dot)}></span>
                          {statusCfg.text}
                        </span>
                      </div>

                      {/* Row 2: Driver */}
                      <div className="flex items-center gap-1.5 mb-1 text-text-secondary/80">
                        <div className="w-4 h-4 rounded-full bg-border/50 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-text-secondary/50"></div>
                        </div>
                        <p className="text-sm font-bold truncate uppercase">{record.driver || 'Não Identificado'}</p>
                      </div>

                      {/* Row 3: Placa + Data */}
                      <div className="flex items-center gap-3 text-xs font-medium text-text-secondary/60">
                        <span className="bg-surface-hover px-2 py-0.5 rounded border border-border/40 font-black">
                          {record.plate || 'SEM PLACA'}
                        </span>
                        <span>•</span>
                        <span>{record.fuelType}</span>
                      </div>

                      {/* Row 4: Values Highlight */}
                      <div className="flex items-center justify-between mt-4 p-3 bg-surface rounded-2xl border border-border/50 shadow-inner">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-text-secondary/60 tracking-tighter">Quantidade</span>
                          <span className="text-sm font-black text-text-primary">{record.quantity}L</span>
                        </div>
                        <div className="w-px h-6 bg-border/50"></div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] font-black uppercase text-primary/60 tracking-tighter">Custo Total</span>
                          <span className="text-sm font-black text-primary">{formatCurrency(parseCurrencyToNumber(record.cost))}</span>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center gap-2 mt-4 justify-end">
                        {canEdit && (
                          <button
                            onClick={() => handleEditFuel(record)}
                            className="bg-surface border border-border flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-text-primary active:scale-95 transition-all shadow-sm"
                          >
                            <Settings size={14} className="text-primary" /> Editar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteFuel(record.id)}
                            className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-rose-500 active:scale-95 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-24 px-8 text-center text-text-secondary">
              <div className="w-20 h-20 rounded-full bg-surface-hover flex items-center justify-center">
                <Fuel size={32} className="opacity-30" />
              </div>
              <p className="text-base font-bold text-text-primary">Nenhum abastecimento encontrado</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 py-4 border-t border-border/60">
          <PaginationControls
            currentPage={fuelPage}
            totalPages={Math.ceil(filteredFuelRecords.length / fuelPerPage)}
            onPageChange={setFuelPage}
            itemsPerPage={fuelPerPage}
            onItemsPerPageChange={(val) => {
              setFuelPerPage(val);
              setFuelPage(1);
            }}
            totalItems={filteredFuelRecords.length}
            showingItems={paginatedFuelRecords.length}
            label="registros"
          />
        </div>

        {/* Mobile FAB */}
        {canAdd && (
          <button
            onClick={() => {
              setEditingFuel(null);
              setNewFuelData({
                prefeituraId: currentUser.prefeituraId || '1',
                vehicle: '',
                driver: '',
                date: new Date().toISOString().split('T')[0],
                quantity: '',
                cost: '',
                status: 'concluido'
              });
              setShowNewFuelModal(true);
            }}
            className="fixed bottom-24 right-5 z-40 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
            style={{ animation: 'pulse 2s infinite' }}
          >
            <Plus size={28} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* ── DESKTOP LAYOUT ────────────────────────────────── */}
      <div className="hidden xl:flex flex-col gap-6 p-8 flex-1 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Gestão de Combustível</h2>
            <p className="text-sm text-text-secondary">Controle de abastecimentos, consumo por veículo e auditoria de gastos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm btn-surface"
              title="Imprimir"
            >
              <Printer size={18} />
              <span>Imprimir</span>
            </button>
            <label className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold flex items-center justify-center cursor-pointer text-sm btn-surface">
              <FileText size={18} />
              {isImporting ? 'Processando...' : 'Importar Planilha'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportFuel}
                disabled={isImporting}
              />
            </label>
            <button
              onClick={() => {
                setIsFuelSelectionMode(!isFuelSelectionMode);
                if (isFuelSelectionMode) setSelectedFuelIds([]);
              }}
              className={cn(
                "p-2.5 rounded-xl flex items-center gap-2 text-sm",
                isFuelSelectionMode
                  ? "btn-primary bg-primary/10 text-primary border border-primary/30"
                  : "btn-surface"
              )}
              title={isFuelSelectionMode ? "Cancelar Seleção" : "Selecionar Múltiplos"}
            >
              <CheckSquare size={18} />
              {isFuelSelectionMode && <span className="text-xs font-bold uppercase tracking-widest">Cancelar</span>}
            </button>
            {selectedFuelIds.length > 0 && (
              <button
                onClick={() => {
                  setDeleteType('fuelBulk');
                  setShowDeleteConfirm(true);
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm btn-white bg-rose-500 text-white hover:bg-rose-600"
              >
                <Trash2 size={18} />
                Excluir ({selectedFuelIds.length})
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm btn-surface"
            >
              <Download size={18} />
              Exportar CSV
            </button>
            {canAdd && (
              <button
                onClick={() => {
                  setEditingFuel(null);
                  setNewFuelData({
                    prefeituraId: currentUser.prefeituraId || '1',
                    vehicle: '',
                    driver: '',
                    date: new Date().toISOString().split('T')[0],
                    quantity: '',
                    cost: '',
                    status: 'concluido'
                  });
                  setShowNewFuelModal(true);
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm btn-primary"
              >
                <Plus size={18} />
                Novo Abastecimento
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <StatCard title="Consumo Total (Filtro)" value={`${totalLiters.toFixed(0)} L`} icon={<Fuel size={24} />} />
          <StatCard title="Investimento Total (Filtro)" value={`R$ ${totalCost.toLocaleString('pt-BR')}`} icon={<BarChart3 size={24} />} />
          <StatCard title="Média Ponderada" value="12.4 km/L" icon={<TrendingUp size={24} />} />
        </div>

        <div className='glass-card p-6 mb-6'>
          <h3 className='text-lg font-bold text-text-primary mb-4'>Resumo por Veículo</h3>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border'>
                  <th className='text-left py-2 font-bold'>Veículo</th>
                  <th className='text-right py-2 font-bold'>Litros</th>
                  <th className='text-right py-2 font-bold'>Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(vehicleSummary).map(([vehicle, data]) => (
                  <tr key={vehicle} className='border-b border-border/30 hover:bg-surface-hover'>
                    <td className='py-3'>{vehicle}</td>
                    <td className='text-right py-3 font-bold'>{data.liters.toFixed(1)} L</td>
                    <td className='text-right py-3 font-bold text-primary'>R$ {data.cost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Buscar por veículo ou motorista..."
                  className="w-full bg-surface-hover border border-border rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-primary transition-colors text-sm"
                  value={fuelFilters.search}
                  onChange={(e) => setFuelFilters({ ...fuelFilters, search: e.target.value })}
                />
              </div>
              <button
                onClick={() => setShowFuelFilters(!showFuelFilters)}
                className={cn(
                  "p-2.5 border border-border rounded-xl transition-all",
                  showFuelFilters ? "bg-primary text-white border-primary" : "hover:bg-surface-hover text-text-secondary"
                )}
              >
                <Filter size={20} />
              </button>
              <button className="p-2.5 border border-border rounded-xl hover:bg-surface-hover text-text-secondary">
                <Calendar size={20} />
              </button>
            </div>

            <AnimatePresence>
              {showFuelFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface-hover/30 rounded-2xl border border-border">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Data do Abastecimento</label>
                      <input
                        type="date"
                        className="bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                        value={fuelFilters.date}
                        onChange={(e) => setFuelFilters({ ...fuelFilters, date: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Mês do Abastecimento</label>
                      <select
                        value={fuelFilters.month || ''}
                        onChange={(e) => setFuelFilters({ ...fuelFilters, month: e.target.value })}
                        className='bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary'
                      >
                        <option value=''>Todos os meses</option>
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    {/* Mais filtros aqui se necessário */}
                    <div className="md:col-span-3 flex justify-end">
                      <button
                        onClick={() => setFuelFilters({ search: '', date: '', month: '', minQuantity: '', maxQuantity: '', minCost: '', maxCost: '' })}
                        className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-6 sm:px-0">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-text-secondary text-[10px] uppercase tracking-widest border-b border-border">
                    {isFuelSelectionMode && (
                      <th className="px-4 py-4 font-bold">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          checked={filteredFuelRecords.length > 0 && selectedFuelIds.length === filteredFuelRecords.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFuelIds(filteredFuelRecords.map(r => r.id));
                            } else {
                              setSelectedFuelIds([]);
                            }
                          }}
                        />
                      </th>
                    )}
                    <th className="px-4 py-4 font-bold">Veículo / Fabricante</th>
                    <th className="px-4 py-4 font-bold">Km Dezena</th>
                    <th className="px-4 py-4 font-bold">Renavam</th>
                    <th className="px-4 py-4 font-bold">Placas</th>
                    <th className="px-4 py-4 font-bold">Combust</th>
                    <th className="px-4 py-4 font-bold">Qt. Lt Diário</th>
                    <th className="px-4 py-4 font-bold">V. Total</th>
                    <th className="px-4 py-4 font-bold">Status</th>
                    <th className="px-4 py-4 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedFuelRecords.length > 0 ? (
                    paginatedFuelRecords.map((record, idx) => {
                      const statusCfg = getStatusConfig(record.status);
                      return (
                        <tr key={`${record.id}-${idx}`} className={cn(
                          "hover:bg-surface-hover/50 transition-colors group border-b border-border/50 last:border-0",
                          selectedFuelIds.includes(record.id) && "bg-primary/5"
                        )}>
                          {isFuelSelectionMode && (
                            <td className="px-4 py-5">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                checked={selectedFuelIds.includes(record.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFuelIds([...selectedFuelIds, record.id]);
                                  } else {
                                    setSelectedFuelIds(selectedFuelIds.filter(id => id !== record.id));
                                  }
                                }}
                              />
                            </td>
                          )}
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-inner shrink-0">
                                <Fuel size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black tracking-tight truncate">{record.vehicle}</p>
                                <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-0.5 truncate">{record.driver}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-sm text-text-secondary font-medium whitespace-nowrap">{record.kmReading || '-'}</td>
                          <td className="px-4 py-5 text-sm text-text-secondary font-medium whitespace-nowrap">{record.renavam || '-'}</td>
                          <td className="px-4 py-5 text-sm text-text-secondary font-medium whitespace-nowrap">{record.plate || '-'}</td>
                          <td className="px-4 py-5 text-sm text-text-secondary font-medium whitespace-nowrap">{record.fuelType || '-'}</td>
                          <td className="px-4 py-5 text-sm font-black tracking-tight whitespace-nowrap">{record.quantity}L</td>
                          <td className="px-4 py-5 text-sm font-black text-primary tracking-tight whitespace-nowrap">{formatCurrency(parseCurrencyToNumber(record.cost))}</td>
                          <td className="px-4 py-5">
                            <span className={cn(
                              "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5",
                              statusCfg.color
                            )}>
                              <span className={cn("w-1 h-1 rounded-full shrink-0", statusCfg.dot)}></span>
                              {statusCfg.text}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-right">
                            <div className="flex justify-end gap-1">
                              {canEdit && (
                                <button
                                  onClick={() => handleEditFuel(record)}
                                  className="p-2 hover:bg-primary/10 rounded-xl text-primary transition-all hover:scale-110 active:scale-95"
                                  title="Editar"
                                >
                                  <Settings size={18} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteFuel(record.id)}
                                  className="p-2 hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all hover:scale-110 active:scale-95"
                                  title="Excluir"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-text-secondary">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationControls
            currentPage={fuelPage}
            totalPages={Math.ceil(filteredFuelRecords.length / fuelPerPage)}
            onPageChange={setFuelPage}
            itemsPerPage={fuelPerPage}
            onItemsPerPageChange={(val) => {
              setFuelPerPage(val);
              setFuelPage(1);
            }}
            totalItems={filteredFuelRecords.length}
            showingItems={paginatedFuelRecords.length}
            label="registros"
          />
        </div>
      </div>
    </div>
  );

};

export default Combustivel;