import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
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
  ChevronDown,
  RefreshCw,
  Download,
  Zap,
  DollarSign,
  BarChart3,
  LayoutGrid,
  List,
  Eye,
  Clock
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Vehicle, VehicleOccurrence, User, SystemSettings } from '../types';
import { fleetService } from '../services/fleet';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FrotaMunicipalProps {
  currentUser: User | null;
  systemSettings: SystemSettings | null;
  addNotification: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const FrotaMunicipal = ({ currentUser, addNotification, systemSettings }: FrotaMunicipalProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [activeTab, setActiveTab] = useState<'frota' | 'dashboard'>('frota');

  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [occurrences, setOccurrences] = useState<VehicleOccurrence[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [isHistoryViewOnly, setIsHistoryViewOnly] = useState(false);

  // New Vehicle Form
  const [newVehicleData, setNewVehicleData] = useState<Partial<Vehicle>>({
    nome: '',
    placa: '',
    ano: new Date().getFullYear().toString(),
    cor: '',
    combustivel: 'flex',
    renavam: '',
    chassi: '',
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

  const rolesWithWriteAccess = ['superadmin', 'admin', 'gestor', 'transportes'];
  const canWrite = currentUser && rolesWithWriteAccess.includes(currentUser.role);
  const canGenerateReport = currentUser && ['superadmin', 'admin', 'gestor'].includes(currentUser.role);

  useEffect(() => {
    fetchVehicles();
  }, [currentUser]);

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
        cor: '',
        combustivel: 'flex',
        renavam: '',
        chassi: '',
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

  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      em_dia: vehicles.filter(v => v.status === 'em_dia').length,
      parado: vehicles.filter(v => v.status === 'parado').length,
      manutencao: vehicles.filter(v => v.status === 'manutencao').length,
      em_uso: vehicles.filter(v => v.status === 'em_uso').length,
    };
  }, [vehicles]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date();

    doc.setFontSize(20);
    doc.text('Relatório de Frota Municipal', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(now, 'dd/MM/yyyy HH:mm')}`, 14, 30);
    doc.text(`Entidade: ${systemSettings?.entidadeFilha || 'Prefeitura Municipal'}`, 14, 35);

    const tableData = filteredVehicles.map(v => [
      v.nome,
      v.placa,
      v.secretaria,
      `${v.km_atual} KM`,
      v.status.replace('_', ' ').toUpperCase()
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Veículo', 'Placa', 'Secretaria', 'KM Atual', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Frota_Municipal_${format(now, 'yyyyMMdd')}.pdf`);
    addNotification("Sucesso", "Relatório gerado!", "success");
  };

  const getStatusBadge = (status: Vehicle['status']) => {
    switch (status) {
      case 'em_dia': return <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Em Dia</span>;
      case 'parado': return <span className="bg-rose-500/10 text-rose-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">Parado</span>;
      case 'manutencao': return <span className="bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20">Manutenção</span>;
      case 'em_uso': return <span className="bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">Em Uso</span>;
      default: return null;
    }
  };

  // Mock data for charts if fuel data is not available, or we could fetch it
  const statusChartData = [
    { name: 'Em Dia', value: stats.em_dia, color: '#10b981' },
    { name: 'Parado', value: stats.parado, color: '#f43f5e' },
    { name: 'Manutenção', value: stats.manutencao, color: '#f59e0b' },
    { name: 'Em Uso', value: stats.em_uso, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-border/40 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Truck size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-text-primary tracking-tight">Frota Municipal</h1>
              <p className="text-sm text-text-secondary font-medium">Controle de patrimônio e manutenção veicular</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-surface p-1 rounded-xl border border-border/40 flex">
              <button
                onClick={() => setActiveTab('frota')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'frota' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-secondary hover:bg-surface-hover"
                )}
              >
                <Truck size={14} /> Frota
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'dashboard' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-secondary hover:bg-surface-hover"
                )}
              >
                <TrendingUp size={14} /> Dashboard
              </button>
            </div>

            <div className="h-8 w-px bg-border/40 hidden md:block mx-2" />

            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border/40 rounded-xl font-bold text-sm hover:bg-surface-hover transition-all"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            {canWrite && (
              <button
                onClick={() => setShowNewVehicleModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Novo Veículo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
        {activeTab === 'dashboard' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total da Frota', value: stats.total, icon: Truck, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Operacionais', value: stats.em_dia + stats.em_uso, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Em Manutenção', value: stats.manutencao, icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { label: 'Fora de Serviço', value: stats.parado, icon: Ban, color: 'text-rose-500', bg: 'bg-rose-500/10' },
              ].map((stat, i) => (
                <div key={i} className="bg-surface border border-border/40 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                      <stat.icon size={24} />
                    </div>
                    <div>
                      <p className="text-text-secondary text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
                      <h4 className="text-3xl font-black text-text-primary tracking-tighter">{stat.value}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-surface border border-border/40 p-8 rounded-[2rem] shadow-sm">
                <h3 className="text-lg font-black text-text-primary mb-8 flex items-center gap-3">
                  <LayoutGrid size={20} className="text-primary" />
                  Distribuição por Status
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                  {statusChartData.map((item, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-black uppercase text-text-secondary text-center">{item.name}</span>
                      <span className="text-sm font-black text-text-primary">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-border/40 p-8 rounded-[2rem] shadow-sm flex flex-col justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mx-auto">
                  <Zap size={32} />
                </div>
                <h3 className="text-xl font-black text-text-primary">Monitoramento em Tempo Real</h3>
                <p className="text-text-secondary text-sm max-w-sm mx-auto">
                  O módulo de frota está integrado aos lançamentos de combustível e ocorrências para gerar relatórios precisos de consumo e performance.
                </p>
                <div className="pt-4 flex justify-center gap-4">
                  <div className="bg-surface-hover px-4 py-2 rounded-xl border border-border/40">
                    <p className="text-[10px] font-black text-text-secondary uppercase mb-1">Média de Idade</p>
                    <p className="text-xl font-black text-text-primary">4.2 anos</p>
                  </div>
                  <div className="bg-surface-hover px-4 py-2 rounded-xl border border-border/40">
                    <p className="text-[10px] font-black text-text-secondary uppercase mb-1">Disponibilidade</p>
                    <p className="text-xl font-black text-emerald-500">92%</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar por veículo, placa ou secretaria..."
                  className="w-full bg-surface border border-border rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-primary transition-all font-bold text-sm shadow-sm shadow-black/5"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    className="appearance-none bg-surface border border-border rounded-2xl pl-5 pr-10 py-3.5 text-sm font-bold outline-none focus:border-primary cursor-pointer shadow-sm shadow-black/5"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Todos os Status</option>
                    <option value="em_dia">Em Dia</option>
                    <option value="parado">Parado</option>
                    <option value="manutencao">Em Manutenção</option>
                    <option value="em_uso">Em Uso</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                </div>

                <div className="bg-surface p-1 rounded-xl border border-border/40 flex">
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "p-2.5 rounded-lg transition-all",
                      viewMode === 'table' ? "bg-primary text-white shadow-md" : "text-text-secondary hover:bg-surface-hover"
                    )}
                  >
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2.5 rounded-lg transition-all",
                      viewMode === 'grid' ? "bg-primary text-white shadow-md" : "text-text-secondary hover:bg-surface-hover"
                    )}
                  >
                    <LayoutGrid size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* List/Grid Component */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCw size={40} className="text-primary animate-spin opacity-40" />
                <p className="text-text-secondary font-black text-xs uppercase tracking-widest">Carregando Frota...</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-surface border border-border/40 rounded-[2rem]">
                <Truck size={64} className="text-text-secondary/20 mb-4" />
                <h3 className="text-lg font-black text-text-primary">Nenhum veículo encontrado</h3>
                <p className="text-text-secondary text-sm">Ajuste os filtros ou cadastre um novo veículo.</p>
              </div>
            ) : viewMode === 'table' ? (
              <div className="bg-surface border border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-hover/30 border-b border-border/40">
                        <th className="px-6 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Veículo / Placa</th>
                        <th className="px-6 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest text-center">Tipo</th>
                        <th className="px-6 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Secretaria</th>
                        <th className="px-6 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">KM Atual</th>
                        <th className="px-6 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Status / Observação</th>
                        <th className="px-6 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredVehicles.map((vehicle) => (
                        <tr key={vehicle.id} className="hover:bg-surface-hover/20 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-text-primary uppercase leading-tight">{vehicle.nome}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-primary tracking-tighter">{vehicle.placa}</span>
                                {vehicle.cor && <span className="text-[9px] text-text-secondary uppercase">• {vehicle.cor}</span>}
                              </div>
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
                                  Contrato: {vehicle.contrato_id}
                                </span>
                              )}
                              <span className="text-[9px] font-bold text-text-secondary mt-1">{vehicle.ano}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-tight">{vehicle.secretaria}</span>
                          </td>
                          <td className="px-6 py-5 text-sm font-black text-text-primary tracking-tighter">{vehicle.km_atual} KM</td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(vehicle.status)}
                              {vehicle.observacao && (
                                <span className="text-[9px] font-medium text-text-secondary line-clamp-1 italic max-w-[150px]" title={vehicle.observacao}>
                                  "{vehicle.observacao}"
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedVehicle(vehicle);
                                  fetchOccurrences(vehicle.id);
                                  setIsHistoryViewOnly(true);
                                  setShowOccurrenceModal(true);
                                }}
                                className="p-2.5 hover:bg-blue-500/10 text-blue-500 rounded-xl transition-all hover:scale-110"
                                title="Visualizar Histórico"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedVehicle(vehicle);
                                  fetchOccurrences(vehicle.id);
                                  setIsHistoryViewOnly(false);
                                  setShowOccurrenceModal(true);
                                }}
                                className="p-2.5 hover:bg-primary/10 text-primary rounded-xl transition-all hover:scale-110"
                                title="Registrar Ocorrência"
                              >
                                <History size={18} />
                              </button>
                              {canWrite && (
                                <button
                                  onClick={() => handleDeleteVehicle(vehicle.id)}
                                  className="p-2.5 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-all hover:scale-110"
                                  title="Remover Veículo"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle, i) => (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-surface border border-border/40 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <h4 className="text-lg font-black text-text-primary uppercase leading-tight mb-1">{vehicle.nome}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary tracking-tighter bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">{vehicle.placa}</span>
                          {getStatusBadge(vehicle.status)}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors">
                        <Truck size={20} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-surface-hover/50 p-3 rounded-2xl border border-border/40">
                        <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-1.5">KM Atual</p>
                        <p className="text-sm font-black text-text-primary">{vehicle.km_atual} KM</p>
                      </div>
                      <div className="bg-surface-hover/50 p-3 rounded-2xl border border-border/40">
                        <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-1.5">Secretaria</p>
                        <p className="text-xs font-black text-text-primary uppercase truncate">{vehicle.secretaria}</p>
                      </div>
                    </div>

                    {vehicle.observacao && (
                      <div className="mb-6 px-4 py-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                        <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Última Observação de Status</p>
                        <p className="text-xs font-medium text-text-primary line-clamp-2 italic">"{vehicle.observacao}"</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-border/30">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Ano / Tipo</span>
                        <span className="text-[11px] font-black text-text-primary">{vehicle.ano} • {vehicle.tipo_propriedade.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            fetchOccurrences(vehicle.id);
                            setIsHistoryViewOnly(true);
                            setShowOccurrenceModal(true);
                          }}
                          className="p-3 bg-blue-500/10 text-blue-500 rounded-xl transition-all hover:scale-105 active:scale-95"
                          title="Visualizar Histórico"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            fetchOccurrences(vehicle.id);
                            setIsHistoryViewOnly(false);
                            setShowOccurrenceModal(true);
                          }}
                          className="p-3 bg-primary/10 text-primary rounded-xl transition-all hover:scale-105 active:scale-95"
                          title="Registrar Ocorrência"
                        >
                          <History size={18} />
                        </button>
                        {canWrite && (
                          <button
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                            className="p-3 bg-rose-500/10 text-rose-500 rounded-xl transition-all hover:scale-105 active:scale-95"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals - (Keeping them identical but inside the component) */}
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
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors font-black text-xs uppercase tracking-tighter bg-border/50 px-1 rounded">PLACA</div>
                        <input
                          required
                          type="text"
                          className="w-full bg-surface-hover border border-border rounded-2xl pl-16 pr-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold uppercase"
                          placeholder="ABC-1234"
                          value={newVehicleData.placa}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, placa: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Cor</label>
                      <input
                        type="text"
                        className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold"
                        placeholder="Ex: Branco, Preto..."
                        value={newVehicleData.cor}
                        onChange={(e) => setNewVehicleData({ ...newVehicleData, cor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Combustível</label>
                      <div className="relative group">
                        <select
                          className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold appearance-none cursor-pointer"
                          value={newVehicleData.combustivel}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, combustivel: e.target.value })}
                        >
                          <option value="flex">Flex</option>
                          <option value="gasolina">Gasolina</option>
                          <option value="diesel">Diesel</option>
                          <option value="etanol">Etanol</option>
                          <option value="gnv">GNV</option>
                          <option value="eletrico">Elétrico</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
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
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Renavam</label>
                      <input
                        type="text"
                        className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold"
                        placeholder="Número do Renavam"
                        value={newVehicleData.renavam}
                        onChange={(e) => setNewVehicleData({ ...newVehicleData, renavam: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Chassi</label>
                      <input
                        type="text"
                        className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold"
                        placeholder="Número do Chassi"
                        value={newVehicleData.chassi}
                        onChange={(e) => setNewVehicleData({ ...newVehicleData, chassi: e.target.value })}
                      />
                    </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">KM Inicial / Atual (Opcional)</label>
                    <div className="relative group">
                      <TrendingUp size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
                      <input
                        type="number"
                        className="w-full bg-surface-hover border border-border rounded-2xl pl-12 pr-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold placeholder:font-medium"
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
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Número do Contrato (Opcional)</label>
                      <div className="relative group">
                        <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          className="w-full bg-surface-hover border border-border rounded-2xl pl-12 pr-5 py-3.5 text-sm outline-none focus:border-primary transition-all font-bold placeholder:font-medium"
                          placeholder="Digite o número do contrato"
                          value={newVehicleData.contrato_id}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, contrato_id: e.target.value })}
                        />
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
                  <div className={cn("p-3 rounded-2xl", isHistoryViewOnly ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500")}>
                    {isHistoryViewOnly ? <Eye size={24} /> : <History size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedVehicle.nome} - <span className="text-primary">{selectedVehicle.placa}</span></h3>
                    <p className="text-xs text-text-secondary font-medium uppercase tracking-widest">
                      {isHistoryViewOnly ? "Visualização de Histórico" : "Registrar ocorrência e visualizar histórico"}
                    </p>
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
                {canWrite && !isHistoryViewOnly && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1.5 h-4 bg-primary/40 rounded-full" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Nova Ocorrência</p>
                    </div>

              <form onSubmit={handleSaveOccurrence} className="bg-surface-hover/30 p-4 md:p-6 rounded-[2rem] border border-border/50 space-y-4 md:space-y-6">
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

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    Registrar Ocorrência
                  </button>
                </div>
              </form>
                  </section>
                )}

                {/* Lista de Histórico */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-4 bg-amber-500/40 rounded-full" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Histórico Recente</p>
                  </div>

                  <div className="space-y-4">
                    {loadingOccurrences ? (
                      <div className="p-10 text-center animate-pulse">
                        <History size={32} className="mx-auto mb-2 text-text-secondary/20" />
                        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Carregando histórico...</p>
                      </div>
                    ) : occurrences.length === 0 ? (
                      <div className="p-10 text-center bg-surface-hover/20 rounded-[2rem] border border-dashed border-border/50">
                        <History size={32} className="mx-auto mb-2 opacity-10" />
                        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Nenhuma ocorrência registrada.</p>
                      </div>
                    ) : (
                      occurrences.map((occ) => (
                        <div key={occ.id} className="bg-surface border border-border/40 p-5 rounded-[2rem] flex flex-col md:flex-row gap-4 md:gap-8 hover:border-primary/40 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity bg-primary" />

                          <div className="flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start gap-4 md:min-w-[160px] border-b md:border-b-0 md:border-r border-border/50 pb-4 md:pb-0 md:pr-6">
                            <div className="flex flex-col gap-1.5">
                              <span className={cn(
                                "text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border self-start tracking-widest shadow-sm",
                                occ.tipo === 'quebra' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                occ.tipo === 'avaria' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                occ.tipo === 'manutencao_preventiva' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              )}>
                                {occ.tipo.replace('_', ' ')}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-text-primary tracking-tight">
                                  {format(new Date(occ.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                                <span className="text-[10px] font-bold text-text-secondary/70">
                                  {format(new Date(occ.createdAt), 'HH:mm', { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end md:items-start text-right md:text-left">
                              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-0.5 opacity-60">Registrador</span>
                              <span className="text-[10px] font-black text-text-primary uppercase truncate max-w-[120px]">{occ.registrado_por}</span>
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-between py-1">
                            <div className="space-y-4">
                              <p className="text-sm font-bold text-text-primary leading-relaxed">{occ.descricao}</p>

                              {(occ.pecas || occ.custo) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {occ.pecas && (
                                    <div className="bg-surface-hover/40 p-3 rounded-2xl border border-border/40">
                                      <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-1.5">Peças / Serviços</p>
                                      <p className="text-xs font-bold text-text-primary">{occ.pecas}</p>
                                    </div>
                                  )}
                                  {occ.custo && (
                                    <div className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/20">
                                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Investimento Estimado</p>
                                      <p className="text-sm font-black text-emerald-600">R$ {occ.custo}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-border/30">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Quilometragem</span>
                                  <span className="text-xs font-black text-primary">{occ.km} KM</span>
                                </div>
                                <div className="w-px h-6 bg-border/50" />
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Resultado</span>
                                  <div className="scale-90 origin-left mt-0.5">
                                    {getStatusBadge(occ.status_resultado)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className="p-8 border-t border-border/40 bg-surface-hover/30 flex justify-end">
                <button
                  onClick={() => setShowOccurrenceModal(false)}
                  className="px-10 py-3.5 bg-background border border-border/40 text-text-secondary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-surface transition-all"
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
