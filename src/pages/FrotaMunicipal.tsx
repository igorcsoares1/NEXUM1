import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  FileText, 
  History, 
  AlertCircle,
  Settings,
  ArrowRight,
  TrendingUp,
  Ban,
  Wrench,
  CheckCircle2,
  Trash2,
  Printer,
  X,
  PlusCircle,
  FileBarChart,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Vehicle, VehicleOccurrence, User, Contract } from '../types';
import { fleetService } from '../services/fleet';
import { StatCard } from '../components/StatCard';
import { PaginationControls } from '../components/PaginationControls';
import { generateFleetReportPDF } from '../utils/pdf';
import { supabase } from '../lib/supabase';

interface FrotaMunicipalProps {
  currentUser: User | null;
  systemSettings: any;
  addNotification: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const FrotaMunicipal = ({ currentUser, addNotification, systemSettings }: FrotaMunicipalProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [occurrences, setOccurrences] = useState<VehicleOccurrence[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);

  // Estados para o filtro de período do relatório
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [periodType, setPeriodType] = useState<'hoje' | 'semana' | 'mes' | 'custom'>('mes');
  const [customDateStart, setCustomDateStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customDateEnd, setCustomDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  // New Vehicle Form
  const [newVehicleData, setNewVehicleData] = useState<Partial<Vehicle>>({
    nome: '',
    placa: '',
    ano: new Date().getFullYear().toString(),
    secretaria: '',
    km_atual: '',
    status: 'em_dia',
    tipo_propriedade: 'oficial',
    contrato_id: '',
    observacao: ''
  });

  // New Occurrence Form
  const [newOccurrenceData, setNewOccurrenceData] = useState<Partial<VehicleOccurrence>>({
    tipo: 'manutencao_preventiva',
    descricao: '',
    pecas: '',
    custo: '',
    km: '',
    status_resultado: 'em_dia'
  });

  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const rolesWithWriteAccess = ['superadmin', 'admin', 'gestor', 'transportes'];
  const canWrite = currentUser && rolesWithWriteAccess.includes(currentUser.role);
  const canGenerateReport = currentUser && ['superadmin', 'admin', 'gestor'].includes(currentUser.role);

  useEffect(() => {
    fetchVehicles();
    fetchContracts();
  }, [currentUser]);

  const fetchContracts = async () => {
    if (!currentUser?.prefeituraId) return;
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('prefeituraId', currentUser.prefeituraId)
        .order('number', { ascending: true });
      
      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchVehicles = async () => {
    if (!currentUser?.prefeituraId) return;
    setLoading(true);
    try {
      const data = await fleetService.getVehicles(currentUser.prefeituraId);
      setVehicles(data);
    } catch (error) {
      addNotification("Erro", "Falha ao carregar frota.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchOccurrences = async (vehicleId: string) => {
    setLoadingOccurrences(true);
    try {
      const data = await fleetService.getOccurrences(vehicleId);
      setOccurrences(data);
    } catch (error) {
      addNotification("Erro", "Falha ao carregar histórico.", "error");
    } finally {
      setLoadingOccurrences(false);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.prefeituraId) return;

    try {
      await fleetService.addVehicle({
        ...newVehicleData,
        prefeituraId: currentUser.prefeituraId
      });
      addNotification("Sucesso", "Veículo cadastrado!", "success");
      setShowNewVehicleModal(false);
      setNewVehicleData({
        nome: '',
        placa: '',
        ano: new Date().getFullYear().toString(),
        secretaria: '',
        km_atual: '',
        status: 'em_dia',
        tipo_propriedade: 'oficial',
        contrato_id: '',
        observacao: ''
      });
      fetchVehicles();
    } catch (error) {
      addNotification("Erro", "Falha ao cadastrar veículo.", "error");
    }
  };

  const handleSaveOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !currentUser) return;

    try {
      await fleetService.addOccurrence({
        ...newOccurrenceData,
        frota_id: selectedVehicle.id,
        prefeituraId: currentUser.prefeituraId,
        registrado_por: currentUser.name,
        createdAt: new Date().toISOString()
      });
      addNotification("Sucesso", "Ocorrência registrada!", "success");
      setShowOccurrenceModal(false);
      setNewOccurrenceData({
        tipo: 'manutencao_preventiva',
        descricao: '',
        pecas: '',
        custo: '',
        km: '',
        status_resultado: 'em_dia'
      });
      fetchVehicles();
    } catch (error) {
      addNotification("Erro", "Falha ao registrar ocorrência.", "error");
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("Deseja realmente excluir este veículo?")) return;
    try {
      await fleetService.deleteVehicle(id);
      addNotification("Sucesso", "Veículo removido.", "success");
      fetchVehicles();
    } catch (error) {
      addNotification("Erro", "Falha ao remover veículo.", "error");
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = v.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           v.placa.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           v.secretaria.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, statusFilter]);

  const paginatedVehicles = filteredVehicles.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const stats = useMemo(() => {
    return {
      em_dia: vehicles.filter(v => v.status === 'em_dia').length,
      parado: vehicles.filter(v => v.status === 'parado').length,
      manutencao: vehicles.filter(v => v.status === 'manutencao').length,
      em_uso: vehicles.filter(v => v.status === 'em_uso').length,
    };
  }, [vehicles]);

  const getStatusBadge = (status: Vehicle['status']) => {
    switch (status) {
      case 'em_dia': return <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Em Dia</span>;
      case 'parado': return <span className="bg-rose-500/10 text-rose-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">Parado</span>;
      case 'manutencao': return <span className="bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20">Em Manutenção</span>;
      case 'em_uso': return <span className="bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">Em Uso</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Veículos em Dia" 
          value={stats.em_dia.toString()} 
          icon={<CheckCircle2 size={24} />} 
          isActive={statusFilter === 'em_dia'}
          onClick={() => setStatusFilter(statusFilter === 'em_dia' ? 'all' : 'em_dia')}
        />
        <StatCard 
          title="Veículos Parados" 
          value={stats.parado.toString()} 
          icon={<Ban size={24} />} 
          isActive={statusFilter === 'parado'}
          onClick={() => setStatusFilter(statusFilter === 'parado' ? 'all' : 'parado')}
        />
        <StatCard 
          title="Em Manutenção" 
          value={stats.manutencao.toString()} 
          icon={<Wrench size={24} />} 
          isActive={statusFilter === 'manutencao'}
          onClick={() => setStatusFilter(statusFilter === 'manutencao' ? 'all' : 'manutencao')}
        />
        <StatCard 
          title="Em Uso" 
          value={stats.em_uso.toString()} 
          icon={<ArrowRight size={24} />} 
          isActive={statusFilter === 'em_uso'}
          onClick={() => setStatusFilter(statusFilter === 'em_uso' ? 'all' : 'em_uso')}
        />
      </div>

      {/* Header e Ações */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 w-full max-w-2xl relative group">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por veículo, placa ou secretaria..."
            className="w-full bg-surface border border-border rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-primary transition-all font-medium text-sm shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {canGenerateReport && (
            <div className="relative flex-1 md:flex-none">
              <button 
                onClick={() => setShowPeriodSelector(!showPeriodSelector)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-surface border border-border rounded-2xl text-text-secondary font-black text-[10px] uppercase tracking-widest hover:bg-surface-hover transition-all"
              >
                <Printer size={16} />
                Relatório
                <ChevronDown size={14} className={cn("transition-transform", showPeriodSelector && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showPeriodSelector && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPeriodSelector(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-72 bg-surface border border-border rounded-3xl shadow-2xl z-50 p-6 space-y-4"
                    >
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-1">Período do Relatório</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'hoje', label: 'Hoje' },
                          { id: 'semana', label: 'Semana' },
                          { id: 'mes', label: 'Mês' },
                          { id: 'custom', label: 'Custom' }
                        ].map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setPeriodType(p.id as any)}
                            className={cn(
                              "px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border",
                              periodType === p.id 
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                : "bg-surface-hover border-border text-text-secondary hover:border-primary/40"
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {periodType === 'custom' && (
                        <div className="space-y-3 pt-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-text-secondary ml-1">Início</label>
                            <input 
                              type="date" 
                              className="w-full bg-surface-hover border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                              value={customDateStart}
                              onChange={(e) => setCustomDateStart(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-text-secondary ml-1">Fim</label>
                            <input 
                              type="date" 
                              className="w-full bg-surface-hover border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                              value={customDateEnd}
                              onChange={(e) => setCustomDateEnd(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          generateFleetReportPDF(filteredVehicles, systemSettings);
                          setShowPeriodSelector(false);
                        }}
                        className="w-full py-3.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                      >
                        <Printer size={14} />
                        Imprimir PDF
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
          {canWrite && (
            <button 
              onClick={() => setShowNewVehicleModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={16} />
              <span className="md:inline">Novo Veículo</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Veículos / Card View for Mobile */}
      <div className="bg-surface border border-border rounded-[2rem] overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-hover/30 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">Veículo / Placa</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest text-center">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">Secretaria</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">KM Atual</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-border/50 rounded-lg w-full" /></td>
                  </tr>
                ))
              ) : paginatedVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-text-secondary">
                    <Truck size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-lg font-medium">Nenhum veículo encontrado.</p>
                  </td>
                </tr>
              ) : (
                paginatedVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-surface-hover/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-text-primary uppercase">{vehicle.nome}</span>
                        <span className="text-[10px] font-bold text-primary">{vehicle.placa}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                          vehicle.tipo_propriedade === 'oficial' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                        )}>
                          {vehicle.tipo_propriedade}
                        </span>
                        {vehicle.tipo_propriedade === 'locado' && vehicle.contrato_id && (
                          <span className="text-[8px] font-black text-purple-700 mt-1 uppercase">
                            Contrato: {contracts.find(c => c.id === vehicle.contrato_id)?.number || 'N/A'}
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-text-secondary mt-1">{vehicle.ano}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-text-secondary uppercase">{vehicle.secretaria}</span>
                    </td>
                    <td className="px-6 py-5 text-sm font-black text-text-primary">{vehicle.km_atual} KM</td>
                    <td className="px-6 py-5">{getStatusBadge(vehicle.status)}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            fetchOccurrences(vehicle.id);
                            setShowOccurrenceModal(true);
                          }}
                          className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all"
                          title="Registrar Ocorrência / Histórico"
                        >
                          <History size={18} />
                        </button>
                        {canWrite && (
                          <button 
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                            className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-all"
                            title="Remover Veículo"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-border">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 animate-pulse space-y-3">
                <div className="h-4 bg-border/50 rounded w-1/2" />
                <div className="h-3 bg-border/50 rounded w-1/3" />
                <div className="h-8 bg-border/50 rounded w-full" />
              </div>
            ))
          ) : paginatedVehicles.length === 0 ? (
            <div className="px-6 py-20 text-center text-text-secondary">
              <Truck size={48} className="mx-auto mb-4 opacity-10" />
              <p className="text-lg font-medium">Nenhum veículo encontrado.</p>
            </div>
          ) : (
            paginatedVehicles.map((vehicle) => (
              <div key={vehicle.id} className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-text-primary uppercase">{vehicle.nome}</span>
                    <span className="text-[10px] font-bold text-primary">{vehicle.placa}</span>
                  </div>
                  {getStatusBadge(vehicle.status)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-hover/50 p-3 rounded-xl border border-border">
                    <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-1">Tipo / Ano</p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                        vehicle.tipo_propriedade === 'oficial' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                      )}>
                        {vehicle.tipo_propriedade}
                      </span>
                      <span className="text-xs font-bold text-text-primary">{vehicle.ano}</span>
                    </div>
                  </div>
                  <div className="bg-surface-hover/50 p-3 rounded-xl border border-border">
                    <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-1">KM Atual</p>
                    <p className="text-xs font-black text-text-primary">{vehicle.km_atual} KM</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Secretaria</p>
                    <span className="text-xs font-bold text-text-primary uppercase">{vehicle.secretaria}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        fetchOccurrences(vehicle.id);
                        setShowOccurrenceModal(true);
                      }}
                      className="p-3 bg-primary/10 text-primary rounded-xl transition-all"
                    >
                      <History size={20} />
                    </button>
                    {canWrite && (
                      <button 
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        className="p-3 bg-rose-500/10 text-rose-500 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <PaginationControls 
          currentPage={page}
          totalPages={Math.ceil(filteredVehicles.length / itemsPerPage)}
          onPageChange={setPage}
          totalItems={filteredVehicles.length}
          itemsPerPage={itemsPerPage}
        />
      </div>

      {/* Modal Novo Veículo */}
      <AnimatePresence>
        {showNewVehicleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewVehicleModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-surface border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-border flex justify-between items-center bg-surface-hover/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold">Cadastrar Novo Veículo</h3>
                    <p className="text-[10px] md:text-xs text-text-secondary font-medium uppercase tracking-widest">Frota Municipal</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNewVehicleModal(false)}
                  className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveVehicle} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Modelo / Nome</label>
                    <div className="relative group">
                      <Truck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
                      <input 
                        required
                        type="text" 
                        className="w-full bg-surface-hover border border-border rounded-2xl pl-12 pr-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold"
                        placeholder="Ex: Hilux 4x4"
                        value={newVehicleData.nome}
                        onChange={(e) => setNewVehicleData({ ...newVehicleData, nome: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Placa</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors font-black text-xs">BR</div>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-surface-hover border border-border rounded-2xl pl-12 pr-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold uppercase"
                        placeholder="ABC-1234"
                        value={newVehicleData.placa}
                        onChange={(e) => setNewVehicleData({ ...newVehicleData, placa: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Ano de Fabricação</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold"
                      value={newVehicleData.ano}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, ano: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">KM Inicial / Atual (Opcional)</label>
                    <div className="relative group">
                      <TrendingUp size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
                      <input 
                        type="number" 
                        className="w-full bg-surface-hover border border-border rounded-2xl pl-12 pr-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold"
                        placeholder="0"
                        value={newVehicleData.km_atual}
                        onChange={(e) => setNewVehicleData({ ...newVehicleData, km_atual: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Secretaria Responsável</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold"
                      placeholder="Ex: Saúde, Educação..."
                      value={newVehicleData.secretaria}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, secretaria: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Status de Disponibilidade</label>
                    <div className="relative group">
                      <select 
                        className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold appearance-none cursor-pointer"
                        value={newVehicleData.status}
                        onChange={(e) => setNewVehicleData({ ...newVehicleData, status: e.target.value as any })}
                      >
                        <option value="em_dia">Em Dia</option>
                        <option value="parado">Parado</option>
                        <option value="manutencao">Manutenção</option>
                        <option value="em_uso">Em Uso</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Tipo de Propriedade</label>
                    <div className="relative group">
                      <select 
                        className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold appearance-none cursor-pointer"
                        value={newVehicleData.tipo_propriedade}
                        onChange={(e) => setNewVehicleData({ ...newVehicleData, tipo_propriedade: e.target.value as any })}
                      >
                        <option value="oficial">Patrimônio (Oficial)</option>
                        <option value="locado">Locado (Aluguel)</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                    </div>
                  </div>
                  {newVehicleData.tipo_propriedade === 'locado' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Contrato de Locação Relacionado</label>
                      <div className="relative group">
                        <select 
                          required={newVehicleData.tipo_propriedade === 'locado'}
                          className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold appearance-none cursor-pointer"
                          value={newVehicleData.contrato_id}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, contrato_id: e.target.value })}
                        >
                          <option value="">Selecione um contrato ativo...</option>
                          {contracts.map(contract => (
                            <option key={contract.id} value={contract.id}>
                              {contract.number} - {contract.vendor}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Observações Adicionais</label>
                  <textarea 
                    className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold min-h-[80px]"
                    placeholder="Informações relevantes sobre o veículo..."
                    value={newVehicleData.observacao}
                    onChange={(e) => setNewVehicleData({ ...newVehicleData, observacao: e.target.value })}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 pb-2">
                  <button 
                    type="button"
                    onClick={() => setShowNewVehicleModal(false)}
                    className="order-2 sm:order-1 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit"
                    className="order-1 sm:order-2 px-10 py-3.5 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    Cadastrar Veículo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Ocorrência e Histórico */}
      <AnimatePresence>
        {showOccurrenceModal && selectedVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOccurrenceModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-surface-hover/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedVehicle.nome} - <span className="text-primary">{selectedVehicle.placa}</span></h3>
                    <p className="text-xs text-text-secondary font-medium">Registrar ocorrência e visualizar histórico</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowOccurrenceModal(false)}
                  className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                {/* Formulário de Nova Ocorrência */}
                {canWrite && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1.5 h-4 bg-primary/40 rounded-full" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Nova Ocorrência</p>
                    </div>
                    
              <form onSubmit={handleSaveOccurrence} className="bg-surface-hover/30 p-4 md:p-6 rounded-3xl border border-border space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Tipo de Ocorrência</label>
                    <div className="relative group">
                      <select 
                        className="w-full bg-surface border border-border rounded-2xl px-5 py-3 text-sm outline-none focus:border-primary transition-all font-bold appearance-none cursor-pointer"
                        value={newOccurrenceData.tipo}
                        onChange={(e) => setNewOccurrenceData({ ...newOccurrenceData, tipo: e.target.value as any })}
                      >
                        <option value="quebra">Quebra</option>
                        <option value="avaria">Avaria</option>
                        <option value="manutencao_preventiva">Manutenção Preventiva</option>
                        <option value="retorno">Retorno de Uso</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Status Resultante</label>
                    <div className="relative group">
                      <select 
                        className="w-full bg-surface border border-border rounded-2xl px-5 py-3 text-sm outline-none focus:border-primary transition-all font-bold appearance-none cursor-pointer"
                        value={newOccurrenceData.status_resultado}
                        onChange={(e) => setNewOccurrenceData({ ...newOccurrenceData, status_resultado: e.target.value as any })}
                      >
                        <option value="em_dia">Em Dia</option>
                        <option value="parado">Parado</option>
                        <option value="manutencao">Manutenção</option>
                        <option value="em_uso">Em Uso</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">KM Atual no Registro</label>
                    <div className="relative group">
                      <TrendingUp size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input 
                        required
                        type="number" 
                        className="w-full bg-surface border border-border rounded-2xl pl-10 pr-5 py-3 text-sm outline-none focus:border-primary transition-all font-bold"
                        placeholder="0"
                        value={newOccurrenceData.km}
                        onChange={(e) => setNewOccurrenceData({ ...newOccurrenceData, km: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Peças / Serviços</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface border border-border rounded-2xl px-5 py-3 text-sm outline-none focus:border-primary transition-all font-bold"
                      placeholder="Ex: Óleo, Filtro, Pneus..."
                      value={newOccurrenceData.pecas}
                      onChange={(e) => setNewOccurrenceData({ ...newOccurrenceData, pecas: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Custo Estimado (R$)</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-bold text-xs">R$</span>
                      <input 
                        type="text" 
                        className="w-full bg-surface border border-border rounded-2xl pl-10 pr-5 py-3 text-sm outline-none focus:border-primary transition-all font-bold"
                        placeholder="0,00"
                        value={newOccurrenceData.custo}
                        onChange={(e) => setNewOccurrenceData({ ...newOccurrenceData, custo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Descrição detalhada</label>
                  <textarea 
                    required
                    className="w-full bg-surface border border-border rounded-2xl px-5 py-3 text-sm outline-none focus:border-primary transition-all font-bold min-h-[80px]"
                    placeholder="Descreva o que ocorreu ou o que foi feito..."
                    value={newOccurrenceData.descricao}
                    onChange={(e) => setNewOccurrenceData({ ...newOccurrenceData, descricao: e.target.value })}
                  />
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit"
                    className="w-full sm:w-auto px-10 py-3.5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    Registrar Ocorrência
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Histórico de Ocorrências */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-4 bg-primary/40 rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Histórico de Ocorrências</p>
            </div>

            <div className="space-y-4">
              {loadingOccurrences ? (
                <div className="flex flex-col gap-4">
                  <div className="h-24 bg-surface-hover/30 rounded-3xl animate-pulse" />
                  <div className="h-24 bg-surface-hover/30 rounded-3xl animate-pulse" />
                </div>
              ) : occurrences.length === 0 ? (
                <div className="p-10 text-center bg-surface-hover/20 rounded-3xl border border-dashed border-border">
                  <History size={32} className="mx-auto mb-2 opacity-10" />
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Nenhuma ocorrência registrada.</p>
                </div>
              ) : (
                occurrences.map((occ) => (
                  <div key={occ.id} className="bg-surface border border-border p-4 md:p-5 rounded-3xl flex flex-col md:flex-row gap-4 md:gap-6 hover:border-primary/30 transition-all group relative">
                    <div className="flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start gap-2 min-w-[140px]">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-1 rounded-md border self-start",
                          occ.tipo === 'quebra' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                          occ.tipo === 'avaria' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          occ.tipo === 'retorno' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}>
                          {occ.tipo.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-black text-text-primary">{format(new Date(occ.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                      <span className="text-[10px] font-bold text-text-secondary md:mt-1">{occ.registrado_por}</span>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <p className="text-xs font-bold text-text-primary leading-relaxed">{occ.descricao}</p>
                      {(occ.pecas || occ.custo) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                          {occ.pecas && (
                            <div className="flex items-center gap-1.5">
                              <Settings size={12} className="text-text-secondary" />
                              <span className="text-[10px] font-bold text-text-secondary">{occ.pecas}</span>
                            </div>
                          )}
                          {occ.custo && (
                            <div className="flex items-center gap-1.5">
                              <TrendingUp size={12} className="text-emerald-500" />
                              <span className="text-[10px] font-black text-emerald-600">R$ {occ.custo}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border md:border-none">
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded-lg">{occ.km} KM</span>
                      <div className="scale-75 origin-right">
                        {getStatusBadge(occ.status_resultado)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
              </div>

              <div className="p-8 border-t border-border bg-surface-hover/30 flex justify-end">
                <button 
                  onClick={() => setShowOccurrenceModal(false)}
                  className="px-10 py-3.5 bg-background border border-border text-text-secondary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-surface transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
