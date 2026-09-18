import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  Fuel,
  Calendar,
  ClipboardCheck,
  FileText,
  UserCircle,
  BarChart3,
  Search,
  Bell,
  ChevronRight,
  AlertCircle,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  LogOut,
  Settings,
  X,
  Menu,
  Check,
  CloudOff,
  RefreshCw,
  ChevronDown,
  Paperclip,
  Database,
  Printer,
  Plus,
  Clock,
  CheckSquare,
  Users,
  Lock as LockIcon,
  Link as LinkIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  safeHtml2Canvas, 
  generateChecklistPDF,
  generateChecklistsReportPDF, 
  generateFuelPDF, 
  generateDailyPDF, 
  generateContractsPDF,
  generateReportPDF
} from './utils/pdf';

// Page Components
import Dashboard from './pages/Dashboard';
import Checklists from './pages/Checklists';
import Combustivel from './pages/Combustivel';
import Diarias from './pages/Diarias';
import Contratos from './pages/Contratos';
import Relatorios from './pages/Relatorios';
import Usuarios from './pages/Usuarios';
import Servidores from './pages/Servidores';
import Protocolo from './pages/Protocolo';
import Manual from './pages/Manual';
import Configuracoes from './pages/Configuracoes';
import Login from './pages/Login';
import ChecklistPublico from './pages/ChecklistPublico';
import DiariaPublica from './pages/DiariaPublica';
import RelatorioExecutivo from './components/views/RelatorioExecutivo';
import NotasFiscais from './components/views/NotasFiscais';
import { Modals } from './components/Modals';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

import { supabase } from './lib/supabase';
import { cn } from './lib/utils';
import {
  View,
  FuelRecord,
  DailyRecord,
  Contract,
  ChecklistItem,
  User,
  Servidor,
  SystemSettings,
  Protocol
} from './types';

// Components
import { StatCard } from './components/ui/StatCard';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { PaginationControls } from './components/ui/PaginationControls';
import { PrintHeader } from './components/ui/PrintHeader';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useSupabase } from './hooks/useSupabase';
import { useNotifications } from './hooks/useNotifications';

// Services
import * as contractService from './services/contracts';
import * as fuelService from './services/fuel';
import * as dailyService from './services/daily';
import * as checklistService from './services/checklists';
import * as userService from './services/users';
import * as servidorService from './services/servidores';
import * as settingsService from './services/settings';

// Utils
import { handleExportCSV } from './utils/csv';
import { runSmartHealthCheck, HealthCheckResult } from './services/automation';
import { handleImportFile, handleImportFuel } from './utils/import';
import { callAIProxy } from './lib/ai';
import { processCurrencyInput, parseCurrencyToNumber, formatCurrency } from './utils/format';
import { logActivity, fetchLogs, ActivityLog } from './services/logs';

export default function App() {
  const {
    isAuthReady,
    authError,
    isLoggedIn,
    setIsLoggedIn,
    currentUser,
    setCurrentUser,
    loginData,
    setLoginData,
    loginError,
    setLoginError,
    handleLogin,
    handleLogout,
    isGestor,
    isAdmin
  } = useAuth();

  const {
    contracts,
    checklistRecords,
    fuelRecords,
    dailyRecords,
    servidores,
    users,
    systemSettings,
    protocols,
    confirmations,
    setUsers,
    setContracts,
    setChecklistRecords,
    setFuelRecords,
    setDailyRecords,
    setServidores,
    setSystemSettings,
    setProtocols,
    fetchContracts,
    fetchFuelRecords,
    fetchDailyRecords,
    fetchServidores,
    fetchUsers
  } = useSupabase({ isAuthReady, currentUser, isLoggedIn });

  const {
    notifications,
    setNotifications,
    showNotifications,
    setShowNotifications,
    addNotification,
    addAlert,
    dismissNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications
  } = useNotifications();

  const [activeView, setActiveView] = useState<View>('dashboard');
  const navigate = useNavigate();
  const location = useLocation();

  // Sync activeView with URL
  useEffect(() => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    const validViews = ['dashboard', 'combustivel', 'diarias', 'checklists', 'contratos', 'notas_fiscais', 'usuarios', 'relatorios', 'prefeituras', 'configuracoes', 'protocolo-entrada', 'protocolo-saida', 'protocolo-processos', 'protocolo-tramitacao', 'protocolo-pendencias', 'protocolo-arquivos', 'manual', 'relatorio_executivo'];
    if (validViews.includes(path)) {
      setActiveView(path as View);
    }
  }, [location.pathname]);

  const handleViewChange = (view: View) => {
    setActiveView(view);
    navigate(`/${view}`);
  };

  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFuelIds, setSelectedFuelIds] = useState<string[]>([]);
  const [isFuelSelectionMode, setIsFuelSelectionMode] = useState(false);
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<string[]>([]);
  const [selectedDailyIds, setSelectedDailyIds] = useState<string[]>([]);
  const [isDailySelectionMode, setIsDailySelectionMode] = useState(false);
  const [isSavingDaily, setIsSavingDaily] = useState(false);
  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);
  const [isContractSelectionMode, setIsContractSelectionMode] = useState(false);
  const [contractsPage, setContractsPage] = useState(1);
  const [contractsPerPage, setContractsPerPage] = useState(10);
  const [fuelPage, setFuelPage] = useState(1);
  const [fuelPerPage, setFuelPerPage] = useState(10);
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyPerPage, setDailyPerPage] = useState(10);
  const [checklistPage, setChecklistPage] = useState(1);
  const [checklistPerPage, setChecklistPerPage] = useState(10);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const refreshLogs = async () => {
    if (currentUser?.prefeituraId) {
      const data = await fetchLogs(currentUser.prefeituraId);
      setActivityLogs(data);
    }
  };

  useEffect(() => {
    if (activeView === 'configuracoes' && currentUser?.role === 'superadmin') {
      refreshLogs();
    }
    
    // Auto-refresh when an activity occurs and we are watching logs
    const handleActivity = () => {
      if (activeView === 'configuracoes' && currentUser?.role === 'superadmin') {
        refreshLogs();
      }
    };
    
    window.addEventListener('activity_logged', handleActivity);
    return () => window.removeEventListener('activity_logged', handleActivity);
  }, [activeView, currentUser]);

  const bellNotifications = notifications.filter(n => !n.isSystem);
  const toastNotifications = notifications.filter(n => n.isSystem);

  // Business Alerts Logic
  useEffect(() => {
    if (!contracts.length || !isLoggedIn) return;

    const today = new Date();
    
    // Critical / Expired
    const expiredContracts = contracts.filter(c => {
      try {
        if (!c.expiryDate) return false;
        const diff = differenceInDays(parseISO(c.expiryDate), today);
        return diff < 0;
      } catch (e) { return false; }
    });

    // 30 days
    const expiring30 = contracts.filter(c => {
      try {
        if (!c.expiryDate) return false;
        const diff = differenceInDays(parseISO(c.expiryDate), today);
        return diff >= 0 && diff <= 30;
      } catch (e) { return false; }
    });

    // 60 days
    const expiring60 = contracts.filter(c => {
      try {
        if (!c.expiryDate) return false;
        const diff = differenceInDays(parseISO(c.expiryDate), today);
        return diff > 30 && diff <= 60;
      } catch (e) { return false; }
    });

    if (expiredContracts.length > 0) {
      addAlert(
        'Contratos Críticos / Vencidos',
        `Atenção: Você tem ${expiredContracts.length} contrato(s) com vencimento já ultrapassado.`,
        'error',
        'contratos'
      );
    }

    if (expiring30.length > 0) {
      addAlert(
        'Vencimento em até 30 dias',
        `Você tem ${expiring30.length} contrato(s) vencendo nos próximos 30 dias.`,
        'warning',
        'contratos'
      );
    }

    if (expiring60.length > 0) {
      addAlert(
        'Vencimento em até 60 dias',
        `Você tem ${expiring60.length} contrato(s) vencendo entre 30 e 60 dias.`,
        'info',
        'contratos'
      );
    }

  }, [contracts, addAlert, isLoggedIn]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = months.map(m => ({ name: m, value: 0 }));

    fuelRecords.forEach(r => {
      try {
        const date = new Date(r.date);
        const monthIdx = date.getMonth();
        const cost = parseCurrencyToNumber(r.cost);
        if (!isNaN(cost) && monthIdx >= 0 && monthIdx < 12) {
          data[monthIdx].value += cost;
        }
      } catch (e) {
        console.warn("Erro ao processar data/custo para gráfico:", r);
      }
    });

    return data;
  }, [fuelRecords]);

  const auditItems = useMemo(() => {
    const items: any[] = [];

    fuelRecords.forEach(r => {
      items.push({
        id: `fuel-${r.id}`,
        prefeituraId: r.prefeituraId,
        type: 'fuel',
        title: `Abastecimento: ${r.vehicle}`,
        user: r.driver,
        time: r.date
      });
    });

    dailyRecords.forEach(r => {
      items.push({
        id: `daily-${r.id}`,
        prefeituraId: r.prefeituraId,
        type: 'daily',
        title: `Diária: ${r.destination}`,
        user: r.driver,
        time: r.date
      });
    });

    contracts.forEach(r => {
      items.push({
        id: `contract-${r.id}`,
        prefeituraId: r.prefeituraId,
        type: 'contract',
        title: `Contrato: ${r.number}`,
        user: r.vendor,
        time: r.signatureDate || ''
      });
    });

    return items.sort((a, b) => b.time.localeCompare(a.time));
  }, [fuelRecords, dailyRecords, contracts]);

  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const [showNewChecklistModal, setShowNewChecklistModal] = useState(false);
  const [showDailyChecklistReport, setShowDailyChecklistReport] = useState(false);
  const [showDailyDiariaReport, setShowDailyDiariaReport] = useState(false);
  const [showSelectedChecklistReport, setShowSelectedChecklistReport] = useState(false);
  const [showChecklistSelectionModal, setShowChecklistSelectionModal] = useState(false);
  const [dashboardDateRange, setDashboardDateRange] = useState('6months');
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Persistent health check throttling to preserve API quota (20 RPD limit)
  const handleRunHealthCheck = async (force = false) => {
    const now = Date.now();
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const storageKey = `last_health_check_${currentUser?.prefeituraId || 'default'}`;
    const lastCheck = parseInt(localStorage.getItem(storageKey) || '0');
    
    if (!force && now - lastCheck < SIX_HOURS) {
      // If we already have a result in state, keep it. Otherwise, we might want to fetch it from Supabase 
      // but for now, we just skip the AI call if it's too soon.
      if (healthCheck) return;
    }

    setIsCheckingHealth(true);
    try {
      const result = await runSmartHealthCheck(contracts, fuelRecords, dailyRecords, checklistRecords, currentUser!);
      setHealthCheck(result);
      localStorage.setItem(storageKey, now.toString());
    } catch (error) {
      console.error("Health check error:", error);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    // Automatic health check - throttled to prevent quota exhaustion
    if (activeView === 'dashboard' && contracts.length > 0 && !healthCheck && !isCheckingHealth) {
      handleRunHealthCheck();
    }
  }, [activeView, contracts.length, healthCheck, isCheckingHealth]);

  const [newChecklistData, setNewChecklistData] = useState<Omit<ChecklistItem, 'id'>>({
    prefeituraId: '1',
    processNumber: '',
    contractNumber: '',
    vendor: '',
    object: '',
    value: '',
    invoiceValue: '',
    invoiceNumber: '',
    submissionDate: new Date().toISOString().split('T')[0],
    status: 'em_analise',
    items: [],
    stepsCompleted: 0,
    totalSteps: 0
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [contractSearch, setContractSearch] = useState('');
  const [contractFilter, setContractFilter] = useState<'all' | 'vigente' | 'vencido' | 'aditivado' | 'vencendo30' | 'vencendo60' | 'consumo90' | 'vencendo90'>('all');
  const [contractFilters, setContractFilters] = useState({
    secretariat: 'all',
    modality: 'all',
    category: 'all',
    startDate: '',
    endDate: ''
  });
  const [showContractFilters, setShowContractFilters] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'contract' | 'contractBulk' | 'fuel' | 'fuelBulk' | 'user' | 'daily' | 'dailyBulk' | 'checklist' | 'checklistBulk' | 'servidor' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [checklistSearch, setChecklistSearch] = useState('');
  const [checklistFilters, setChecklistFilters] = useState({
    status: '',
    vendor: '',
    startDate: '',
    endDate: ''
  });
  const [showFuelFilters, setShowFuelFilters] = useState(false);
  const [fuelFilters, setFuelFilters] = useState({
    search: '',
    date: '',
    minQuantity: '',
    maxQuantity: '',
    minCost: '',
    maxCost: '',
  });

  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showNewServidorModal, setShowNewServidorModal] = useState(false);
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SystemSettings | null>(null);

  // Sincroniza o formulário de configurações quando os dados carregam ou a view muda
  useEffect(() => {
    if (activeView === 'configuracoes' && isAuthReady && isLoggedIn && currentUser) {
      if (systemSettings && !settingsForm) {
        // Só carrega do banco se o formulário local estiver vazio (primeiro carregamento da view)
        setSettingsForm(systemSettings);
      } else if (!settingsForm) {
        // Se não houver configurações no banco para esta prefeitura, inicializa com valores vazios
        setSettingsForm({
          id: currentUser.prefeituraId || '1',
          prefeituraId: currentUser.prefeituraId || '1',
          entidadeFilha: '',
          cnpj: '',
          endereco: '',
          setor: '',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.id
        });
      }
    }
  }, [activeView, systemSettings, isAuthReady, isLoggedIn, currentUser]);

  // Limpa o formulário quando sai da view para garantir recarregamento na próxima vez
  useEffect(() => {
    if (activeView !== 'configuracoes') {
      setSettingsForm(null);
    }
  }, [activeView]);

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showNewFuelModal, setShowNewFuelModal] = useState(false);
  const [showNewDailyModal, setShowNewDailyModal] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingServidor, setEditingServidor] = useState<Servidor | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editingFuel, setEditingFuel] = useState<FuelRecord | null>(null);
  const [editingDaily, setEditingDaily] = useState<DailyRecord | null>(null);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistItem | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [newUserData, setNewUserData] = useState<Omit<User, 'id' | 'lastLogin'>>({
    prefeituraId: '1',
    name: '',
    username: '',
    password: '',
    email: '',
    role: 'visualizador',
    department: '',
    status: 'ativo',
    permissions: []
  });

  const [newServidorData, setNewServidorData] = useState<any>({
    name: '',
    cpf: '',
    registrationNumber: '',
    department: '',
    position: ''
  });

  const [newContractData, setNewContractData] = useState<Omit<Contract, 'id'>>({
    prefeituraId: '1',
    number: '',
    vendor: '',
    object: '',
    validity: '',
    expiryDate: '',
    consumption: '',
    totalValue: '',
    isAditivado: false,
    status: 'vigente',
    secretariat: '',
    modality: '',
    signatureDate: '',
    category: '',
    addendums: []
  });

  const [newFuelData, setNewFuelData] = useState<Omit<FuelRecord, 'id'>>({
    prefeituraId: '1',
    vehicle: '',
    driver: '',
    date: new Date().toISOString().split('T')[0],
    quantity: '',
    cost: '',
    status: 'concluido',
    yearModel: '',
    official: '',
    renavam: '',
    plate: '',
    fuelType: '',
    kmPerLiter: '',
    kmReading: '',
    unitPrice: ''
  });

  const [newDailyData, setNewDailyData] = useState<Omit<DailyRecord, 'id'>>({
    prefeituraId: '1',
    driver: '',
    beneficiary: '',
    registrationNumber: '',
    servidorId: '',
    destination: '',
    date: new Date().toISOString().split('T')[0],
    departureDate: new Date().toISOString().split('T')[0],
    returnDate: '',
    purpose: '',
    value: '',
    status: 'pendente',
    approvalStatus: 'pendente',
    attachments: []
  });

  const baseFilteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchesSearch = c.number.toLowerCase().includes(contractSearch.toLowerCase()) ||
        c.vendor.toLowerCase().includes(contractSearch.toLowerCase());

      const matchesSecretariat = contractFilters.secretariat === 'all' || c.secretariat === contractFilters.secretariat;
      const matchesModality = contractFilters.modality === 'all' || c.modality === contractFilters.modality;
      const matchesCategory = contractFilters.category === 'all' || c.category === contractFilters.category;

      let matchesDateRange = true;
      if (contractFilters.startDate && contractFilters.endDate) {
        const sigDate = c.signatureDate ? parseISO(c.signatureDate) : null;
        if (sigDate) {
          matchesDateRange = sigDate >= parseISO(contractFilters.startDate) && sigDate <= parseISO(contractFilters.endDate);
        } else {
          matchesDateRange = false;
        }
      }

      return matchesSearch && matchesSecretariat && matchesModality && matchesCategory && matchesDateRange;
    });
  }, [contracts, contractSearch, contractFilters]);

  const filteredContracts = useMemo(() => {
    return baseFilteredContracts.filter(c => {
      const expiryDate = c.expiryDate ? parseISO(c.expiryDate) : null;
      const daysRemaining = expiryDate ? differenceInDays(expiryDate, new Date()) : -999;

      if (contractFilter === 'vigente') return c.status === 'vigente';
      if (contractFilter === 'vencido') return c.status === 'vencido' || daysRemaining < 0;
      if (contractFilter === 'aditivado') return !!c.isAditivado;
      if (contractFilter === 'vencendo30') return daysRemaining >= 0 && daysRemaining <= 30;
      if (contractFilter === 'vencendo60') return daysRemaining > 30 && daysRemaining <= 60;
      if (contractFilter === 'vencendo90') return daysRemaining > 60 && daysRemaining <= 90;
      if (contractFilter === 'consumo90') {
        const cons = parseFloat((c.consumption || '0').replace(/[R$\s.]/g, '').replace(',', '.'));
        const total = parseFloat((c.totalValue || '0').replace(/[R$\s.]/g, '').replace(',', '.'));
        return total > 0 && (cons / total) > 0.9;
      }
      return true;
    });
  }, [baseFilteredContracts, contractFilter]);

  const filteredFuelRecords = useMemo(() => {
    return fuelRecords.filter(record => {
      const matchesSearch = record.vehicle.toLowerCase().includes(fuelFilters.search.toLowerCase()) ||
        record.driver.toLowerCase().includes(fuelFilters.search.toLowerCase());
      const matchesDate = !fuelFilters.date || record.date === fuelFilters.date;

      const quantity = parseFloat((record.quantity || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
      const matchesMinQty = !fuelFilters.minQuantity || quantity >= parseFloat(fuelFilters.minQuantity);
      const matchesMaxQty = !fuelFilters.maxQuantity || quantity <= parseFloat(fuelFilters.maxQuantity);

      const cost = parseFloat((record.cost || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
      const matchesMinCost = !fuelFilters.minCost || cost >= parseFloat(fuelFilters.minCost);
      const matchesMaxCost = !fuelFilters.maxCost || cost <= parseFloat(fuelFilters.maxCost);

      return matchesSearch && matchesDate && matchesMinQty && matchesMaxQty && matchesMinCost && matchesMaxCost;
    });
  }, [fuelRecords, fuelFilters]);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.department.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [userSearch, users]);

  const filteredDailyRecords = useMemo(() => {
    return dailyRecords.filter(record =>
      record.driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.purpose && record.purpose.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [dailyRecords, searchQuery]);

  const filteredChecklists = useMemo(() => {
    return checklistRecords.filter(item => {
      const matchesSearch = 
        item.contractNumber.toLowerCase().includes(checklistSearch.toLowerCase()) ||
        item.processNumber.toLowerCase().includes(checklistSearch.toLowerCase()) ||
        item.vendor.toLowerCase().includes(checklistSearch.toLowerCase()) ||
        item.object.toLowerCase().includes(checklistSearch.toLowerCase());
      
      const matchesStatus = !checklistFilters.status || 
        (checklistFilters.status === 'andamento' 
          ? (item.status !== 'concluido' && item.status !== 'pendente') 
          : item.status === checklistFilters.status);
      const matchesVendor = !checklistFilters.vendor || item.vendor.toLowerCase().includes(checklistFilters.vendor.toLowerCase());
      
      let matchesDate = true;
      if (checklistFilters.startDate && checklistFilters.endDate) {
        matchesDate = item.submissionDate >= checklistFilters.startDate && item.submissionDate <= checklistFilters.endDate;
      }

      return matchesSearch && matchesStatus && matchesVendor && matchesDate;
    });
  }, [checklistSearch, checklistRecords, checklistFilters]);

  const paginatedContracts = useMemo(() => {
    const startIndex = (contractsPage - 1) * contractsPerPage;
    return filteredContracts.slice(startIndex, startIndex + contractsPerPage);
  }, [filteredContracts, contractsPage, contractsPerPage]);

  const paginatedFuelRecords = useMemo(() => {
    const start = (fuelPage - 1) * fuelPerPage;
    return filteredFuelRecords.slice(start, start + fuelPerPage);
  }, [filteredFuelRecords, fuelPage, fuelPerPage]);

  const paginatedDailyRecords = useMemo(() => {
    const start = (dailyPage - 1) * dailyPerPage;
    return filteredDailyRecords.slice(start, start + dailyPerPage);
  }, [filteredDailyRecords, dailyPage, dailyPerPage]);

  const paginatedChecklists = useMemo(() => {
    const start = (checklistPage - 1) * checklistPerPage;
    return filteredChecklists.slice(start, start + checklistPerPage);
  }, [filteredChecklists, checklistPage, checklistPerPage]);

  const paginatedUsers = useMemo(() => {
    const start = (usersPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, usersPage, usersPerPage]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleSyncContracts = () => {
    contractService.handleSyncContracts(
      currentUser,
      setIsSyncing,
      addNotification
    );
  };

  const handleImportFileLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImportFile(
      e,
      setIsImporting,
      addNotification,
      currentUser,
      contracts
    );
  };

  const handleImportFuelLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImportFuel(
      e,
      setIsImporting,
      addNotification,
      currentUser
    );
  };

  const canAdd = isGestor;
  const canEdit = isGestor;
  const canDelete = isAdmin;

  const handleApproveDaily = async (record: DailyRecord) => {
    await dailyService.handleApproveDaily(record, currentUser!, addNotification);
    logActivity(currentUser, 'Aprovação de Diária', `Aprovou diária de ${record.driver} para ${record.destination}`);
  };

  const handleRejectDaily = async (record: DailyRecord) => {
    await dailyService.handleRejectDaily(record, currentUser!, addNotification);
    logActivity(currentUser, 'Rejeição de Diária', `Rejeitou diária de ${record.driver} para ${record.destination}`);
  };

  const criticalContracts = useMemo(() =>
    contracts.filter(c => {
      const daysRemaining = differenceInDays(parseISO(c.expiryDate), new Date());
      return daysRemaining <= 7;
    }),
    [contracts]);

  const handleExportCSVLocal = () => {
    handleExportCSV(filteredFuelRecords, 'abastecimentos');
  };

  const handleExportPDF = async (reportName: string) => {
    setIsExportingPDF(true);
    
    try {
      // Usar geradores estruturados para tópicos específicos
      if (reportName === 'checklists') {
        generateChecklistsReportPDF(checklistRecords, 'Relatório de Checklists', systemSettings);
        setIsExportingPDF(false);
        return;
      }
      
      if (reportName === 'combustivel') {
        generateFuelPDF(fuelRecords, systemSettings);
        setIsExportingPDF(false);
        return;
      }
      
      if (reportName === 'diarias') {
        generateDailyPDF(dailyRecords, servidores, systemSettings);
        setIsExportingPDF(false);
        return;
      }
      
      if (reportName === 'contratos') {
        generateContractsPDF(contracts, systemSettings);
        setIsExportingPDF(false);
        return;
      }

      // Para relatório geral ou outros tipos, usar o gerador de screenshot melhorado
      const filename = `relatorio_${reportName}_${new Date().toISOString().split('T')[0]}.pdf`;
      await generateReportPDF('report-content', filename, setIsExportingPDF);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      addNotification("Erro", "Falha ao gerar PDF. Tente novamente.", "error");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleAddItem = () => {
    if (!newItemLabel.trim()) return;
    setNewChecklistData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: crypto.randomUUID(), label: newItemLabel.trim(), checked: false }
      ]
    }));
    setNewItemLabel('');
  };

  const handleRemoveItem = (id: string) => {
    setNewChecklistData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleGenerateAIItems = async () => {
    if (!newChecklistData.processNumber && !newChecklistData.object) {
      // Notificação removida conforme solicitação do usuário
      return;
    }

    setIsGeneratingAI(true);
    try {
      const prompt = `Gere uma lista de 8 documentos ou etapas essenciais para um checklist de processo de pagamento de prefeitura para o seguinte objeto: ${newChecklistData.object || newChecklistData.processNumber}. Retorne apenas os nomes dos itens em um array JSON plano de strings.`;

      const text = await callAIProxy([{ role: 'user', parts: [{ text: prompt }] }], {
        responseMimeType: "application/json"
      });
      
      let items = [];
      try {
        items = JSON.parse(text);
      } catch (e) {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          try { items = JSON.parse(codeBlockMatch[1]); } catch(e) {}
        } else {
          const firstBracket = text.indexOf('[');
          const lastBracket = text.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            items = JSON.parse(text.substring(firstBracket, lastBracket + 1));
          } else {
            throw e;
          }
        }
      }

      if (Array.isArray(items)) {
        setNewChecklistData(prev => ({
          ...prev,
          items: [
            ...prev.items,
            ...items.map((label: string) => ({
              id: crypto.randomUUID(),
              label,
              checked: false
            }))
          ]
        }));
      }
    } catch (error) {
      console.error("Erro ao gerar itens com IA:", error);
      addNotification("Não foi possível gerar sugestões com IA no momento.", "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveChecklist = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    checklistService.handleSaveChecklist(
      newChecklistData,
      editingChecklist,
      currentUser,
      setShowNewChecklistModal,
      setEditingChecklist,
      setNewChecklistData,
      addNotification
    );
    logActivity(
      currentUser, 
      editingChecklist ? 'Edição de Processo' : 'Novo Processo', 
      `${editingChecklist ? 'Editou' : 'Criou'} processo nº ${newChecklistData.processNumber} para ${newChecklistData.vendor}`
    );
  };

  const handleToggleChecklistItem = (checklistId: string, itemId: string) => {
    const item = selectedChecklist?.items?.find(i => i.id === itemId);
    const actionLabel = item?.checked ? 'Desmarcou' : 'Marcou';

    checklistService.handleToggleChecklistItem(
      checklistId,
      itemId,
      setChecklistRecords,
      selectedChecklist,
      setSelectedChecklist,
      addNotification
    );

    if (selectedChecklist && item) {
      logActivity(
        currentUser,
        'Item de Checklist',
        `${actionLabel} item "${item.label}" no processo nº ${selectedChecklist.processNumber}`
      );
    }
  };

  const handleAddTramitation = async (checklistId: string, sector: string, action: string) => {
    const success = await checklistService.handleAddTramitation(
      checklistId,
      sector,
      action,
      setChecklistRecords,
      addNotification,
      checklistRecords
    );

    if (success !== false) {
      // Find the updated checklist in our current records to update state
      // We look in the actual latest state of records to ensure consistency
      const target = checklistRecords.find(c => c.id === checklistId);
      if (target) {
        // Determinando novo status com a mesma lógica do serviço para sincronizar UI imediata
        let newStatus = target.status;
        const actionLower = action.toLowerCase();
        if (actionLower.includes('análise')) newStatus = 'em_analise';
        else if (actionLower.includes('autorizado') || actionLower.includes('pagamento') || actionLower.includes('pago') || actionLower.includes('concluído') || actionLower.includes('arquivado')) newStatus = 'concluido';
        else if (actionLower.includes('correção') || actionLower.includes('pendente')) newStatus = 'pendente';
        else if (actionLower.includes('urgente') || actionLower.includes('atraso') || actionLower.includes('prioridade')) newStatus = 'atencao';

        const updatedHistory = [{ 
          date: format(new Date(), 'dd/MM/yyyy HH:mm'), 
          sector, 
          action 
        }, ...(Array.isArray(target.history) ? target.history : [])];

        const updatedObj = {
          ...target,
          status: newStatus,
          currentSector: sector,
          history: updatedHistory
        };

        // Sync Selected Checklist (Details Modal)
        if (selectedChecklist?.id === checklistId) {
          setSelectedChecklist(updatedObj);
        }
        
        // Sync Editing Checklist (Edit Modal)
        if (editingChecklist?.id === checklistId) {
          setEditingChecklist(updatedObj);
          setNewChecklistData(updatedObj);
        }

        logActivity(
          currentUser,
          'Movimentação de Processo',
          `Moveu o processo nº ${target.processNumber} para o setor: ${sector} (Ação: ${action})`
        );
      }
    }
    
    return success;
  };

  const handleDeleteChecklist = (id: string) => {
    checklistService.handleDeleteChecklist(
      id,
      setItemToDelete,
      setDeleteType,
      setShowDeleteConfirm
    );
  };

  const handleEditUser = (user: User) => {
    userService.handleEditUser(
      user,
      setEditingUser,
      setNewUserData,
      setShowNewUserModal
    );
  };

  const handleSaveUser = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    userService.handleSaveUser(
      newUserData,
      editingUser,
      currentUser,
      setCurrentUser,
      setShowNewUserModal,
      setEditingUser,
      setNewUserData,
      addNotification
    );
    
    logActivity(
      currentUser,
      editingUser ? 'Edição de Usuário' : 'Novo Usuário',
      `${editingUser ? 'Editou' : 'Criou'} usuário ${newUserData.name} ${newUserData.email ? `(${newUserData.email})` : ''}`
    );
  };

  const handleDeleteUser = (id: string) => {
    userService.handleDeleteUser(
      id,
      setItemToDelete,
      setDeleteType,
      setShowDeleteConfirm
    );
  };

  const handleEditServidor = (servidor: Servidor) => {
    setEditingServidor(servidor);
    setNewServidorData({
      prefeituraId: servidor.prefeituraId,
      name: servidor.name,
      cpf: servidor.cpf,
      registrationNumber: servidor.registrationNumber || '',
      department: servidor.department,
      position: servidor.position
    });
    setShowNewServidorModal(true);
  };

  const handleSaveServidor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    await servidorService.saveServidor(
      newServidorData,
      editingServidor,
      currentUser,
      setShowNewServidorModal,
      setEditingServidor,
      setNewServidorData,
      addNotification
    );
    fetchServidores();
    logActivity(
      currentUser,
      editingServidor ? 'Edição de Servidor' : 'Novo Servidor',
      `${editingServidor ? 'Editou' : 'Criou'} servidor ${newServidorData.name}`
    );
  };

  const handleDeleteServidor = (id: string) => {
    setDeleteType('servidor');
    setItemToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleSaveContract = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await contractService.handleSaveContract(
      newContractData,
      editingContract,
      currentUser,
      setShowNewContractModal,
      setEditingContract,
      setNewContractData,
      addNotification
    );
    fetchContracts();
    logActivity(
      currentUser, 
      editingContract ? 'Edição de Contrato' : 'Novo Contrato', 
      `${editingContract ? 'Editou' : 'Criou'} contrato ${newContractData.number} para ${newContractData.vendor}`
    );
  };

  const handleDeleteContract = (id: string) => {
    contractService.handleDeleteContract(
      id,
      setItemToDelete,
      setDeleteType,
      setShowDeleteConfirm
    );
  };

  const confirmDelete = async () => {
    if (!deleteType) return;

    try {
      if (deleteType === 'contract' && itemToDelete) {
        // Cascade delete checklists associated to avoid FK constraint
        const contractObj = contracts.find(c => c.id === itemToDelete);
        if (contractObj && contractObj.number) {
          await supabase.from('checklists').delete().eq('contractNumber', contractObj.number);
        }
        
        const { error } = await supabase.from('contracts').delete().eq('id', itemToDelete);
        if (error) throw error;
        fetchContracts();
        logActivity(currentUser, 'Exclusão de Contrato', `Excluiu contrato ID: ${itemToDelete}`);
      } else if (deleteType === 'fuel' && itemToDelete) {
        const { error } = await supabase.from('fuelRecords').delete().eq('id', itemToDelete);
        if (error) throw error;
        fetchFuelRecords();
        logActivity(currentUser, 'Exclusão de Abastecimento', `Excluiu abastecimento ID: ${itemToDelete}`);
      } else if (deleteType === 'user' && itemToDelete) {
        const { error } = await supabase.from('users').delete().eq('id', itemToDelete);
        if (error) throw error;
        fetchUsers();
        logActivity(currentUser, 'Exclusão de Usuário', `Excluiu usuário ID: ${itemToDelete}`);
      } else if (deleteType === 'servidor' && itemToDelete) {
        const { error } = await supabase.from('servidores').delete().eq('id', itemToDelete);
        if (error) throw error;
        fetchServidores();
        logActivity(currentUser, 'Exclusão de Servidor', `Excluiu servidor ID: ${itemToDelete}`);
      } else if (deleteType === 'daily' && itemToDelete) {
        const { error } = await supabase.from('dailyRecords').delete().eq('id', itemToDelete);
        if (error) throw error;
        fetchDailyRecords();
        logActivity(currentUser, 'Exclusão de Diária', `Excluiu diária ID: ${itemToDelete}`);
      } else if (deleteType === 'checklist' && itemToDelete) {
        // Find record first to revert contract consumption and also delete digital receipts
        const { data: checklist } = await supabase
          .from('checklists')
          .select('*')
          .eq('id', itemToDelete)
          .maybeSingle();

        if (checklist) {
          // 1. Revert contract consumption
          if (checklist.contractNumber && checklist.invoiceValue) {
            const { data: contract } = await supabase
              .from('contracts')
              .select('*')
              .eq('number', checklist.contractNumber)
              .maybeSingle();

            if (contract) {
              const invoiceVal = parseCurrencyToNumber(checklist.invoiceValue);
              const currentConsumption = parseCurrencyToNumber(contract.consumption);
              const newConsumption = Math.max(0, currentConsumption - invoiceVal);
              
              await supabase
                .from('contracts')
                .update({ consumption: formatCurrency(newConsumption) })
                .eq('id', contract.id);
            }
          }

          // 2. Delete associated digital receipts (linked by process number)
          if (checklist.processNumber) {
            await supabase
              .from('recibos_digitais')
              .delete()
              .eq('processo_numero', checklist.processNumber);
          }
        }

        const { error } = await supabase.from('checklists').delete().eq('id', itemToDelete);
        if (error) throw error;
        setChecklistRecords(prev => prev.filter(c => c.id !== itemToDelete));
        logActivity(currentUser, 'Exclusão de Checklist', `Excluiu checklist ID: ${itemToDelete}`);
      } else if (deleteType === 'fuelBulk') {
        await fuelService.handleBulkDeleteFuel(
          selectedFuelIds,
          setSelectedFuelIds,
          setIsFuelSelectionMode,
          addNotification
        );
      } else if (deleteType === 'dailyBulk') {
        await dailyService.handleBulkDeleteDaily(
          selectedDailyIds,
          setSelectedDailyIds,
          setIsDailySelectionMode,
          addNotification
        );
      } else if (deleteType === 'checklistBulk') {
        await checklistService.handleBulkDeleteChecklists(
          selectedChecklistIds,
          setSelectedChecklistIds,
          setShowChecklistSelectionModal,
          addNotification
        );
      } else if (deleteType === 'contractBulk') {
        await contractService.handleBulkDeleteContracts(
          selectedContractIds,
          setSelectedContractIds,
          setIsContractSelectionMode,
          addNotification
        );
        logActivity(currentUser, 'Exclusão em Lote (Contratos)', `Excluiu ${selectedContractIds.length} contratos`);
      }

      if (!deleteType.endsWith('Bulk')) {
        addNotification("Sucesso", "Item excluído com sucesso.", "success");
      }
    } catch (error: any) {
      console.error("Erro ao excluir item:", error);
      addNotification("Falha na Exclusão", `Não foi possível excluir o item. Detalhes: ${error?.message || ''}`, "error");
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      setDeleteType(null);
    }
  };

  const handleSaveFuel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await fuelService.handleSaveFuel(
      newFuelData,
      editingFuel,
      servidores,
      currentUser,
      setShowNewFuelModal,
      setEditingFuel,
      setNewFuelData,
      addNotification
    );
    fetchFuelRecords();
    logActivity(
      currentUser, 
      editingFuel ? 'Edição de Abastecimento' : 'Novo Abastecimento', 
      `${editingFuel ? 'Editou' : 'Registrou'} abastecimento para ${newFuelData.vehicle} (R$ ${newFuelData.cost})`
    );
  };

  const handleDeleteFuel = (id: string) => {
    fuelService.handleDeleteFuel(
      id,
      setItemToDelete,
      setDeleteType,
      setShowDeleteConfirm
    );
  };

  const handleSaveDaily = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingDaily(true);
    try {
      await dailyService.handleSaveDaily(
        newDailyData,
        editingDaily,
        servidores,
        currentUser,
        setShowNewDailyModal,
        setEditingDaily,
        setNewDailyData,
        addNotification
      );
      fetchDailyRecords();
      logActivity(
        currentUser, 
        editingDaily ? 'Edição de Diária' : 'Nova Diária', 
        `${editingDaily ? 'Editou' : 'Criou'} solicitação de diária para ${newDailyData.beneficiary || newDailyData.driver} (Destino: ${newDailyData.destination})`
      );
    } catch (error) {
      console.error("Erro ao salvar diária:", error);
    } finally {
      setIsSavingDaily(false);
    }
  };

  const handleDeleteDaily = (id: string) => {
    dailyService.handleDeleteDaily(
      id,
      setItemToDelete,
      setDeleteType,
      setShowDeleteConfirm
    );
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setNewContractData({
      prefeituraId: contract.prefeituraId,
      number: contract.number,
      vendor: contract.vendor,
      object: contract.object,
      validity: contract.validity,
      expiryDate: contract.expiryDate,
      consumption: formatCurrency(parseCurrencyToNumber(contract.consumption)),
      totalValue: formatCurrency(parseCurrencyToNumber(contract.totalValue)),
      isAditivado: !!contract.isAditivado,
      status: contract.status,
      secretariat: contract.secretariat || '',
      modality: contract.modality || '',
      signatureDate: contract.signatureDate || '',
      category: contract.category || '',
      addendums: contract.addendums || []
    });
    setShowNewContractModal(true);
  };

  const handleEditChecklist = (item: ChecklistItem) => {
    setEditingChecklist(item);
    setNewChecklistData({
      prefeituraId: item.prefeituraId,
      processNumber: item.processNumber,
      contractNumber: item.contractNumber,
      vendor: item.vendor,
      object: item.object,
      value: item.value,
      invoiceValue: item.invoiceValue || '',
      submissionDate: item.submissionDate,
      status: item.status,
      items: item.items || []
    });
    setShowNewChecklistModal(true);
  };

  const handleEditFuel = (record: FuelRecord) => {
    setEditingFuel(record);
    setNewFuelData({
      prefeituraId: record.prefeituraId,
      vehicle: record.vehicle,
      driver: record.driver,
      date: record.date,
      quantity: record.quantity,
      cost: formatCurrency(parseCurrencyToNumber(record.cost)),
      status: record.status,
      yearModel: record.yearModel || '',
      official: record.official || '',
      renavam: record.renavam || '',
      plate: record.plate || '',
      fuelType: record.fuelType || '',
      kmPerLiter: record.kmPerLiter || '',
      kmReading: record.kmReading || '',
      unitPrice: formatCurrency(parseCurrencyToNumber(record.unitPrice))
    });
    setShowNewFuelModal(true);
  };

  const handleEditDaily = (record: DailyRecord) => {
    const servant = servidores.find(s => 
      s.id === record.servidorId || 
      (s.name && (record.beneficiary || record.driver) && s.name.trim().toLowerCase() === (record.beneficiary || record.driver).trim().toLowerCase())
    );
    setEditingDaily(record);
    setNewDailyData({
      prefeituraId: record.prefeituraId,
      beneficiary: record.beneficiary || record.driver || '',
      registrationNumber: record.registrationNumber || servant?.registrationNumber || '',
      destination: record.destination,
      departureDate: record.date || record.departureDate || '',
      returnDate: record.returnDate || '',
      purpose: record.purpose || '',
      value: formatCurrency(parseCurrencyToNumber(record.value)),
      status: record.status
    } as any);
    setShowNewDailyModal(true);
  };

 


  // START_DELETE_DASHBOARD
 


 


  const servidorStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const stats: { [key: string]: { name: string; registrationNumber: string; count: number; total: number } } = {};

    dailyRecords.forEach(record => {
      const recordDate = parseISO(record.date);
      // Ranking mensal para manter performance e relevância
      if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
        const name = (record.beneficiary || record.driver || '').trim();
        if (!name) return;

        const key = name.toUpperCase();

        if (!stats[key]) {
          const servant = servidores.find(s => 
            (record.servidorId && s.id === record.servidorId) || 
            (s.name && s.name.trim().toUpperCase() === key)
          );
          stats[key] = { 
            name: servant?.name || name, 
            registrationNumber: record.registrationNumber || servant?.registrationNumber || '',
            count: 0, 
            total: 0 
          };
        }
        stats[key].count += 1;
        const val = parseCurrencyToNumber(record.value);
        stats[key].total += val;
      }
    });

    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [dailyRecords, servidores]);

 


  const contractStats = useMemo(() => {
    const totalValueInForce = baseFilteredContracts
      .filter(c => c.status === 'vigente' || c.status === 'atencao' || c.status === 'aditivado')
      .reduce((acc, c) => {
        const val = parseFloat((c.totalValue || '0').replace(/[R$\s.]/g, '').replace(',', '.'));
        return acc + val;
      }, 0);

    return {
      total: baseFilteredContracts.length,
      vigente: baseFilteredContracts.filter(c => c.status === 'vigente').length,
      vencido: baseFilteredContracts.filter(c => {
        const expiryDate = c.expiryDate ? parseISO(c.expiryDate) : null;
        const days = expiryDate ? differenceInDays(expiryDate, new Date()) : -1;
        return c.status === 'vencido' || days < 0;
      }).length,
      aditivado: baseFilteredContracts.filter(c => c.isAditivado).length,
      vencendo30: baseFilteredContracts.filter(c => {
        const expiryDate = c.expiryDate ? parseISO(c.expiryDate) : null;
        const days = expiryDate ? differenceInDays(expiryDate, new Date()) : -1;
        return days >= 0 && days <= 30;
      }).length,
      vencendo60: baseFilteredContracts.filter(c => {
        const expiryDate = c.expiryDate ? parseISO(c.expiryDate) : null;
        const days = expiryDate ? differenceInDays(expiryDate, new Date()) : -1;
        return days > 30 && days <= 60;
      }).length,
      vencendo90: baseFilteredContracts.filter(c => {
        const expiryDate = c.expiryDate ? parseISO(c.expiryDate) : null;
        const days = expiryDate ? differenceInDays(expiryDate, new Date()) : -1;
        return days > 60 && days <= 90;
      }).length,
      consumo90: baseFilteredContracts.filter(c => {
        const cons = parseFloat((c.consumption || '0').replace(/[R$\s.]/g, '').replace(',', '.'));
        const total = parseFloat((c.totalValue || '0').replace(/[R$\s.]/g, '').replace(',', '.'));
        return total > 0 && (cons / total) > 0.9;
      }).length,
      totalValueInForce
    };
  }, [baseFilteredContracts]);

 



 


 


  const handleSaveProtocol = async (protocol: Partial<Protocol>) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('protocols')
        .upsert({
          ...protocol,
          prefeituraId: currentUser.prefeituraId
        });

      if (error) {
        if (error.message?.includes('protocols') || error.message?.includes('schema cache')) {
          console.warn("Tabela protocols não encontrada no Supabase.");
          addNotification("Aviso", "A tabela de protocolos não existe no seu banco de dados Supabase. Execute o script 'supabase_setup.sql' para corrigir.", "warning");
        } else {
          throw error;
        }
      } else {
        logActivity(
          currentUser,
          'Protocolo',
          `Registrou novo documento: ${protocol.subject}`
        );
        addNotification("Sucesso", "Documento registrado com sucesso!", "success");
      }
    } catch (error: any) {
      console.error("Erro ao salvar protocolo:", error);
      addNotification("Erro", "Falha ao salvar documento no banco.", "error");
    }
  };

  const handleDeleteProtocol = async (id: string) => {
    if (!currentUser || !window.confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      const { error } = await supabase
        .from('protocols')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      logActivity(
        currentUser,
        'Protocolo',
        `Excluiu um documento`
      );
      addNotification("Sucesso", "Documento excluído com sucesso!", "success");
    } catch (error: any) {
      console.error("Erro ao excluir protocolo:", error);
      addNotification("Erro", "Falha ao excluir documento.", "error");
    }
  };

  const renderModals = () => (
    <Modals
      showNewContractModal={showNewContractModal}
      setShowNewContractModal={setShowNewContractModal}
      editingContract={editingContract}
      newContractData={newContractData}
      setNewContractData={setNewContractData}
      handleSaveContract={handleSaveContract}
      isSaving={isSavingDaily || isSavingSettings}
      showNewFuelModal={showNewFuelModal}
      setShowNewFuelModal={setShowNewFuelModal}
      editingFuel={editingFuel}
      newFuelData={newFuelData}
      setNewFuelData={setNewFuelData}
      handleSaveFuel={handleSaveFuel}
      showNewDailyModal={showNewDailyModal}
      setShowNewDailyModal={setShowNewDailyModal}
      editingDaily={editingDaily}
      newDailyData={newDailyData}
      setNewDailyData={setNewDailyData}
      handleSaveDaily={handleSaveDaily}
      showNewChecklistModal={showNewChecklistModal}
      setShowNewChecklistModal={setShowNewChecklistModal}
      editingChecklist={editingChecklist}
      newChecklistData={newChecklistData}
      setNewChecklistData={setNewChecklistData}
      handleSaveChecklist={handleSaveChecklist}
      showNewUserModal={showNewUserModal}
      setShowNewUserModal={setShowNewUserModal}
      editingUser={editingUser}
      newUserData={newUserData}
      setNewUserData={setNewUserData}
      handleSaveUser={handleSaveUser}
      showNewServidorModal={showNewServidorModal}
      setShowNewServidorModal={setShowNewServidorModal}
      editingServidor={editingServidor}
      newServidorData={newServidorData}
      setNewServidorData={setNewServidorData}
      handleSaveServidor={handleSaveServidor}
      showDeleteConfirm={showDeleteConfirm}
      setShowDeleteConfirm={setShowDeleteConfirm}
      deleteType={deleteType || ''}
      setDeleteType={setDeleteType}
      handleDeleteConfirm={confirmDelete}
      showChecklistSelectionModal={showChecklistSelectionModal}
      setShowChecklistSelectionModal={setShowChecklistSelectionModal}
      selectedChecklistIds={selectedChecklistIds}
      setSelectedChecklistIds={setSelectedChecklistIds}
      checklistRecords={checklistRecords}
      showDailyChecklistReport={showDailyChecklistReport}
      setShowDailyChecklistReport={setShowDailyChecklistReport}
      systemSettings={systemSettings}
      showDetailsModal={showDetailsModal}
      setShowDetailsModal={setShowDetailsModal}
      selectedChecklist={selectedChecklist}
      handleToggleChecklistItem={handleToggleChecklistItem}
      handleAddTramitation={handleAddTramitation}
      showCriticalModal={showCriticalModal}
      setShowCriticalModal={setShowCriticalModal}
      criticalContracts={criticalContracts}
      showSelectedChecklistReport={showSelectedChecklistReport}
      setShowSelectedChecklistReport={setShowSelectedChecklistReport}
      handleGenerateAIItems={handleGenerateAIItems}
      isGeneratingAI={isGeneratingAI}
      newItemLabel={newItemLabel}
      setNewItemLabel={setNewItemLabel}
      handleAddItem={handleAddItem}
      handleRemoveItem={handleRemoveItem}
      contracts={contracts}
      servidores={servidores}
    />
  );

  const handleSaveSettings = () => {
    if (!currentUser || !settingsForm) return;
    settingsService.handleSaveSettings(
      settingsForm,
      currentUser,
      setIsSavingSettings,
      addNotification
    );
    logActivity(
      currentUser,
      'Configurações do Sistema',
      `Atualizou os dados da prefeitura/entidade: ${settingsForm.entidadeFilha}`
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    settingsService.handleLogoUpload(
      e,
      setSettingsForm,
      addNotification
    );
  };

 




  const handlePrint = () => {
    window.print();
  };

  const renderView = () => {
    const hasPermission = (view: View) => {
      if (!currentUser) return false;
      if (currentUser.role === 'superadmin') return true;
      
      if (Array.isArray(currentUser.permissions)) {
        return currentUser.permissions.includes(view);
      }
      
      return false;
    };

    if (!hasPermission(activeView)) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-text-secondary">
          <LockIcon size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">Acesso Restrito</p>
          <p className="text-sm">Você não tem permissão para acessar este módulo.</p>
          <button 
            onClick={() => setActiveView('dashboard')}
            className="mt-6 px-6 py-2 bg-primary text-white rounded-xl font-bold"
          >
            Voltar ao Dashboard
          </button>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            fuelRecords={fuelRecords}
            dailyRecords={dailyRecords}
            contracts={contracts}
            checklistRecords={checklistRecords}
            setActiveView={handleViewChange}
            setContractFilter={(filter) => {
              setContractFilter(filter as any);
              handleViewChange('contratos');
            }}
            dashboardDateRange={dashboardDateRange}
            setDashboardDateRange={setDashboardDateRange}
            chartData={chartData}
            auditItems={auditItems}
            addNotification={addNotification}
            systemSettings={systemSettings}
          />
        );
      case 'combustivel':
        return (
          <Combustivel
            fuelRecords={fuelRecords}
            handlePrint={() => generateFuelPDF(fuelRecords, systemSettings)}
            handleExportCSV={handleExportCSVLocal}
            handleImportFuel={handleImportFuelLocal}
            isImporting={isImporting}
            isFuelSelectionMode={isFuelSelectionMode}
            setIsFuelSelectionMode={setIsFuelSelectionMode}
            selectedFuelIds={selectedFuelIds}
            setSelectedFuelIds={setSelectedFuelIds}
            fuelPage={fuelPage}
            setFuelPage={setFuelPage}
            fuelPerPage={fuelPerPage}
            setFuelPerPage={setFuelPerPage}
            filteredFuelRecords={filteredFuelRecords}
            paginatedFuelRecords={paginatedFuelRecords}
            setShowNewFuelModal={setShowNewFuelModal}
            setEditingFuel={setEditingFuel}
            setNewFuelData={setNewFuelData}
            handleDeleteFuel={handleDeleteFuel}
            handleEditFuel={handleEditFuel}
            fuelFilters={fuelFilters}
            setFuelFilters={setFuelFilters}
            showFuelFilters={showFuelFilters}
            setShowFuelFilters={setShowFuelFilters}
            currentUser={currentUser}
            canAdd={canAdd}
            canEdit={canEdit}
            canDelete={canDelete}
            setDeleteType={setDeleteType}
            setShowDeleteConfirm={setShowDeleteConfirm}
          />
        );
      case 'diarias':
        return (
          <Diarias
            dailyRecords={dailyRecords}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handlePrint={() => generateDailyPDF(dailyRecords, servidores, systemSettings)}
            isDailySelectionMode={isDailySelectionMode}
            setIsDailySelectionMode={setIsDailySelectionMode}
            selectedDailyIds={selectedDailyIds}
            setSelectedDailyIds={setSelectedDailyIds}
            dailyPage={dailyPage}
            setDailyPage={setDailyPage}
            dailyPerPage={dailyPerPage}
            setDailyPerPage={setDailyPerPage}
            filteredDailyRecords={filteredDailyRecords}
            paginatedDailyRecords={paginatedDailyRecords}
            setShowNewDailyModal={setShowNewDailyModal}
            setEditingDaily={setEditingDaily}
            setNewDailyData={setNewDailyData}
            handleDeleteDaily={handleDeleteDaily}
            handleEditDaily={handleEditDaily}
            canAdd={canAdd}
            canEdit={canEdit}
            canDelete={canDelete}
            currentUser={currentUser!}
            isAdmin={isAdmin}
            handleApproveDaily={handleApproveDaily}
            handleRejectDaily={handleRejectDaily}
            servidorStats={servidorStats}
            servidores={servidores}
            setDeleteType={setDeleteType}
            setShowDeleteConfirm={setShowDeleteConfirm}
            handleEditServidor={handleEditServidor}
            handleDeleteServidor={handleDeleteServidor}
            setShowNewServidorModal={setShowNewServidorModal}
            setEditingServidor={setEditingServidor}
            setNewServidorData={setNewServidorData}
            addNotification={addNotification}
            setShowDailyDiariaReport={setShowDailyDiariaReport}
          />
        );
      case 'checklists':
        return (
          <Checklists
            checklistRecords={checklistRecords}
            checklistSearch={checklistSearch}
            setChecklistSearch={setChecklistSearch}
            checklistFilters={checklistFilters}
            setChecklistFilters={setChecklistFilters}
            handlePrint={() => generateChecklistsReportPDF(checklistRecords, 'Relatório de Checklists', systemSettings)}
            isChecklistSelectionMode={showChecklistSelectionModal}
            setIsChecklistSelectionMode={setShowChecklistSelectionModal}
            selectedChecklistIds={selectedChecklistIds}
            setSelectedChecklistIds={setSelectedChecklistIds}
            checklistPage={checklistPage}
            setChecklistPage={setChecklistPage}
            checklistPerPage={checklistPerPage}
            setChecklistPerPage={setChecklistPerPage}
            filteredChecklists={filteredChecklists}
            paginatedChecklists={paginatedChecklists}
            setShowNewChecklistModal={setShowNewChecklistModal}
            setEditingChecklist={setEditingChecklist}
            setNewChecklistData={setNewChecklistData}
            handleDeleteChecklist={handleDeleteChecklist}
            handleEditChecklist={(item) => {
              setEditingChecklist(item);
              setNewChecklistData(item);
              setShowNewChecklistModal(true);
            }}
            handleToggleChecklistItem={handleToggleChecklistItem}
            setSelectedChecklist={setSelectedChecklist}
            setShowDetailsModal={setShowDetailsModal}
            systemSettings={systemSettings}
            canAdd={canAdd}
            canEdit={canEdit}
            canDelete={canDelete}
            setShowDailyChecklistReport={setShowDailyChecklistReport}
            setDeleteType={setDeleteType}
            setShowDeleteConfirm={setShowDeleteConfirm}
            confirmations={confirmations}
            currentUser={currentUser!}
          />
        );
      case 'contratos':
        return (
          <Contratos
            contracts={contracts}
            contractSearch={contractSearch}
            setContractSearch={setContractSearch}
            contractFilter={contractFilter}
            setContractFilter={setContractFilter}
            handlePrint={() => generateContractsPDF(contracts, systemSettings)}
            handleSyncContracts={handleSyncContracts}
            handleImportFile={handleImportFileLocal}
            isSyncing={isSyncing}
            isImporting={isImporting}
            isContractSelectionMode={isContractSelectionMode}
            setIsContractSelectionMode={setIsContractSelectionMode}
            selectedContractIds={selectedContractIds}
            setSelectedContractIds={setSelectedContractIds}
            contractsPage={contractsPage}
            setContractsPage={setContractsPage}
            contractsPerPage={contractsPerPage}
            setContractsPerPage={setContractsPerPage}
            filteredContracts={filteredContracts}
            paginatedContracts={paginatedContracts}
            setShowNewContractModal={setShowNewContractModal}
            setEditingContract={setEditingContract}
            setNewContractData={setNewContractData}
            handleDeleteContract={handleDeleteContract}
            handleEditContract={handleEditContract}
            canAdd={canAdd}
            canEdit={canEdit}
            canDelete={canDelete}
            contractFilters={contractFilters}
            setContractFilters={setContractFilters}
            showContractFilters={showContractFilters}
            setShowContractFilters={setShowContractFilters}
            currentUser={currentUser!}
            contractStats={contractStats}
            lastSync={lastSync}
            isGestor={isGestor}
            setDeleteType={setDeleteType}
            setShowDeleteConfirm={setShowDeleteConfirm}
            addNotification={addNotification}
          />
        );
      case 'notas_fiscais':
        return <NotasFiscais currentUser={currentUser} />;
      case 'usuarios':
        return (
          <Usuarios
            currentUser={currentUser!}
            isAdmin={isAdmin}
            setEditingUser={setEditingUser}
            setNewUserData={setNewUserData}
            setShowNewUserModal={setShowNewUserModal}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            paginatedUsers={paginatedUsers}
            filteredUsers={filteredUsers}
            usersPage={usersPage}
            setUsersPage={setUsersPage}
            usersPerPage={usersPerPage}
            setUsersPerPage={setUsersPerPage}
            handleEditUser={handleEditUser}
            handleDeleteUser={handleDeleteUser}
          />
        );
      case 'relatorios':
        return (
          <Relatorios
            fuelRecords={fuelRecords}
            dailyRecords={dailyRecords}
            contracts={contracts}
            checklistRecords={checklistRecords}
            handleExportPDF={handleExportPDF}
            isExportingPDF={isExportingPDF}
            chartData={chartData}
            handlePrint={handlePrint}
          />
        );
      case 'relatorio_executivo':
        return <RelatorioExecutivo />;
      case 'protocolo-entrada':
        return <Protocolo type="entrada" currentUser={currentUser} protocols={protocols} onSave={handleSaveProtocol} onDelete={handleDeleteProtocol} />;
      case 'protocolo-saida':
        return <Protocolo type="saida" currentUser={currentUser} protocols={protocols} onSave={handleSaveProtocol} onDelete={handleDeleteProtocol} />;
      case 'protocolo-processos':
        return <Protocolo type="processos" currentUser={currentUser} protocols={protocols} onSave={handleSaveProtocol} onDelete={handleDeleteProtocol} />;
      case 'protocolo-tramitacao':
        return <Protocolo type="tramitacao" currentUser={currentUser} protocols={protocols} onSave={handleSaveProtocol} onDelete={handleDeleteProtocol} />;
      case 'protocolo-pendencias':
        return <Protocolo type="pendencias" currentUser={currentUser} protocols={protocols} onSave={handleSaveProtocol} onDelete={handleDeleteProtocol} />;
      case 'protocolo-arquivos':
        return <Protocolo type="arquivos" currentUser={currentUser} protocols={protocols} onSave={handleSaveProtocol} onDelete={handleDeleteProtocol} />;
      case 'manual':
        return <Manual />;
      case 'configuracoes':
        return (
          <Configuracoes
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            handleSaveSettings={handleSaveSettings}
            isSavingSettings={isSavingSettings}
            handleLogoUpload={handleLogoUpload}
            currentUser={currentUser}
            users={filteredUsers}
            handleEditUser={handleEditUser}
            activityLogs={activityLogs}
            refreshLogs={refreshLogs}
          />
        );
      default: return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-text-secondary">
          <AlertCircle size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">Módulo em desenvolvimento</p>
          <p className="text-sm">Esta funcionalidade estará disponível em breve.</p>
        </div>
      );
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-text-secondary animate-pulse">Iniciando sistema...</p>
        </motion.div>
      </div>
    );
  }

  if (location.pathname.startsWith('/checklist/')) {
    return <ChecklistPublico />;
  }

  if (location.pathname.startsWith('/diaria/')) {
    return <DiariaPublica />;
  }

  if (!isLoggedIn) {
    return (
      <Login
        loginData={loginData}
        setLoginData={setLoginData}
        handleLogin={handleLogin}
        isLoggingIn={false}
        authError={loginError}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Toast notifications removed as requested. Activity logs are now available in Settings. */}

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeView={activeView}
        setActiveView={handleViewChange}
        currentUser={currentUser}
        isAdmin={isAdmin}
        handleLogout={handleLogout}
      />

      <BottomNav activeView={activeView} setActiveView={handleViewChange} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="h-20 border-b border-border flex items-center justify-between px-4 md:px-8 bg-surface/95 backdrop-blur-xl z-50 shrink-0 print:hidden shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-surface-hover rounded-xl lg:hidden text-text-secondary"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-1">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
              </p>
              <h2 className="text-lg md:text-xl font-black capitalize leading-none">{activeView}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            {!currentUser && (
              <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 text-[8px] md:text-[10px] font-bold uppercase tracking-wider">
                <CloudOff size={12} />
                <span className="hidden xs:inline">Modo Offline</span>
              </div>
            )}
            <div className="relative hidden md:block w-64 lg:w-96">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2 outline-none focus:border-primary transition-colors text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1 md:gap-2 relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "p-2 md:p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary relative transition-colors",
                  showNotifications && "bg-surface-hover text-primary"
                )}
              >
                <Bell size={20} />
                {bellNotifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-background animate-pulse"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <div key="notifications-container">
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
                        <div className="flex items-center gap-2">
                          <Bell size={16} className="text-primary" />
                          <h3 className="font-black text-sm uppercase tracking-wider">Notificações</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {bellNotifications.some(n => !n.read) && (
                            <button
                              onClick={markAllAsRead}
                              className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter"
                            >
                              Ler todas
                            </button>
                          )}
                          <button
                            onClick={clearNotifications}
                            className="text-[10px] font-black text-rose-500 hover:underline uppercase tracking-tighter"
                          >
                            Limpar
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                        {bellNotifications.length === 0 ? (
                          <div className="p-12 text-center">
                            <div className="w-12 h-12 bg-border/50 rounded-full flex items-center justify-center mx-auto mb-3 text-text-secondary/30">
                              <Bell size={24} />
                            </div>
                            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Nenhuma notificação</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-border">
                            {bellNotifications.map((notification, idx) => (
                              <div
                                key={`notif-list-${notification.id}-${idx}`}
                                onClick={() => {
                                  markAsRead(notification.id);
                                  if (notification.targetView && notification.targetView !== activeView) {
                                    handleViewChange(notification.targetView as any);
                                    setShowNotifications(false);
                                  }
                                }}
                                className={cn(
                                  "p-4 hover:bg-surface-hover transition-colors cursor-pointer relative group",
                                  !notification.read && "bg-primary/5"
                                )}
                              >
                                {!notification.read && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                )}
                                <div className="flex justify-between items-start gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        notification.type === 'success' ? "bg-emerald-500" :
                                          notification.type === 'error' ? "bg-rose-500" :
                                            notification.type === 'warning' ? "bg-amber-500" : "bg-blue-500"
                                      )} />
                                      <h4 className="text-xs font-black uppercase tracking-tight truncate">
                                        {notification.title}
                                      </h4>
                                    </div>
                                    <p className="text-xs text-text-secondary leading-relaxed">
                                      {notification.message}
                                    </p>
                                    <p className="text-[10px] text-text-secondary/50 font-medium mt-2 uppercase tracking-tighter">
                                      {notification.time}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNotifications(prev => prev.filter(n => n.id !== notification.id));
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-all"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {bellNotifications.length > 0 && (
                        <div className="p-3 border-t border-border bg-surface-hover/10 text-center">
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                            Fim das notificações
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
              <div className="hidden xs:block w-px h-6 bg-border mx-1 md:mx-2"></div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm md:text-base shadow-lg shadow-primary/20">
                  {currentUser?.name.charAt(0)}
                </div>
                <div className="hidden xl:block">
                  <p className="text-sm font-bold leading-none">{currentUser?.name}</p>
                  <p className="text-[10px] text-text-secondary uppercase tracking-tight mt-1">{currentUser?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Critical Contracts Modal */}
      <AnimatePresence>
        {showCriticalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCriticalModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-rose-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/20 rounded-xl text-rose-500">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Contratos Críticos</h3>
                    <p className="text-sm text-text-secondary">Ações imediatas necessárias para evitar interrupções.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCriticalModal(false)}
                  className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto flex flex-col gap-4">
                {criticalContracts.length > 0 ? (
                  criticalContracts.map((contract, idx) => (
                    <div key={`critical-${contract.id}-${idx}`} className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-hover transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold">{contract.number}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                            contract.status === 'atencao' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                          )}>
                            {contract.status === 'atencao' ? 'Vencendo em breve' : 'Vencido'}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{contract.vendor}</p>
                        <p className="text-xs text-text-secondary mt-1">{contract.object}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Vigência</p>
                        <p className="text-sm font-bold text-rose-500">{contract.validity.split(' - ')[1]}</p>
                        <button className="mt-2 text-xs font-bold text-primary hover:underline">
                          Renovar Agora
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <ClipboardCheck size={48} className="mx-auto text-emerald-500 opacity-20 mb-4" />
                    <p className="text-text-secondary">Nenhum contrato crítico no momento.</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-surface-hover/50 border-t border-border flex justify-end gap-3">
                <button
                  onClick={() => setShowCriticalModal(false)}
                  className="px-6 py-2.5 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
                >
                  Fechar
                </button>
                <button className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                  Gerar Relatório de Crise
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* New Checklist Modal */}
      <AnimatePresence>
        {showDailyDiariaReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-white">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDailyDiariaReport(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface border border-border rounded-[32px] shadow-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none print:max-h-none print:h-auto"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-surface-hover/30 print:bg-transparent print:border-b-2 print:border-black">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner print:hidden">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight print:text-black">Relatório Diário de Diárias</h3>
                    <p className="text-sm text-text-secondary font-medium print:text-black">
                      {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => {
                      const today = format(new Date(), 'yyyy-MM-dd');
                      const todayDiarias = dailyRecords.filter(d => d.date === today);
                      // Usar uma função genérica ou específica para PDF de diárias em lote
                      generateDailyPDF(todayDiarias, servidores, systemSettings);
                    }}
                    className="p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors border border-border"
                    title="Imprimir Relatório"
                  >
                    <Printer size={20} />
                  </button>
                  <button
                    onClick={() => {
                      const today = format(new Date(), 'yyyy-MM-dd');
                      const url = `${window.location.origin}/diaria/dia/${today}`;
                      navigator.clipboard.writeText(url);
                      addNotification("Sucesso", "Link público do dia copiado!", "success");
                    }}
                    className="p-2.5 hover:bg-surface-hover rounded-xl text-primary transition-colors border border-primary/20 flex items-center gap-2"
                    title="Copiar Link de Aprovação"
                  >
                    <LinkIcon size={20} />
                    <span className="text-xs font-bold">Copiar Link</span>
                  </button>
                  <button
                    onClick={() => setShowDailyDiariaReport(false)}
                    className="p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-8 overflow-y-auto print:overflow-visible">
                <PrintHeader title="Relatório Diário de Diárias" />
                <div className="space-y-6">
                  {dailyRecords.filter(d => d.date === format(new Date(), 'yyyy-MM-dd')).length === 0 ? (
                    <div className="text-center py-12 text-text-secondary">
                      <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">Nenhuma diária registrada hoje.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-text-secondary text-[10px] uppercase tracking-widest border-b border-border print:text-black print:border-black">
                          <th className="px-4 py-3 font-bold">Beneficiário</th>
                          <th className="px-4 py-3 font-bold">Destino</th>
                          <th className="px-4 py-3 font-bold">Finalidade</th>
                          <th className="px-4 py-3 font-bold">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border print:divide-black/20">
                        {dailyRecords.filter(d => d.date === format(new Date(), 'yyyy-MM-dd')).map((daily, idx) => (
                          <tr key={`report-daily-${daily.id}-${idx}`} className="print:text-black">
                            <td className="px-4 py-3 text-sm font-bold">{daily.beneficiary || daily.driver}</td>
                            <td className="px-4 py-3 text-sm">{daily.destination}</td>
                            <td className="px-4 py-3 text-sm truncate max-w-[200px]">{daily.purpose || '-'}</td>
                            <td className="px-4 py-3 text-sm font-medium">{formatCurrency(parseCurrencyToNumber(daily.value))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDailyChecklistReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-white">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDailyChecklistReport(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface border border-border rounded-[32px] shadow-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none print:max-h-none print:h-auto"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-surface-hover/30 print:bg-transparent print:border-b-2 print:border-black">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner print:hidden">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight print:text-black">Relatório Diário de Checklists</h3>
                    <p className="text-sm text-text-secondary font-medium print:text-black">
                      {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => {
                      const today = format(new Date(), 'yyyy-MM-dd');
                      const todayChecklists = checklistRecords.filter(c => c.submissionDate === today);
                      generateChecklistsReportPDF(todayChecklists, 'Relatório Diário de Processos', systemSettings);
                    }}
                    className="p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors border border-border"
                    title="Imprimir Relatório"
                  >
                    <Printer size={20} />
                  </button>
                  <button
                    onClick={() => setShowDailyChecklistReport(false)}
                    className="p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-8 overflow-y-auto print:overflow-visible">
                <PrintHeader title="Relatório Diário de Processos" />
                <div className="space-y-6">
                  {checklistRecords.filter(c => c.submissionDate === format(new Date(), 'yyyy-MM-dd')).length === 0 ? (
                    <div className="text-center py-12 text-text-secondary">
                      <ClipboardCheck size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">Nenhum checklist registrado hoje.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-text-secondary text-[10px] uppercase tracking-widest border-b border-border print:text-black print:border-black">
                          <th className="px-4 py-3 font-bold">Nº Processo</th>
                          <th className="px-4 py-3 font-bold">Fornecedor</th>
                          <th className="px-4 py-3 font-bold">Objeto</th>
                          <th className="px-4 py-3 font-bold">Valor Nota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border print:divide-black/20">
                        {checklistRecords.filter(c => c.submissionDate === format(new Date(), 'yyyy-MM-dd')).map((checklist, idx) => (
                          <tr key={`report-checklist-${checklist.id}-${idx}`} className="print:text-black">
                            <td className="px-4 py-3 text-sm font-bold">{checklist.processNumber}</td>
                            <td className="px-4 py-3 text-sm">{checklist.vendor}</td>
                            <td className="px-4 py-3 text-sm truncate max-w-[200px]">{checklist.object}</td>
                            <td className="px-4 py-3 text-sm font-medium">{checklist.invoiceValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSelectedChecklistReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-white">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSelectedChecklistReport(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface border border-border rounded-[32px] shadow-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none print:max-h-none print:h-auto"
            >
              <div className="p-8 border-b border-border flex justify-between items-center bg-surface-hover/30 print:bg-transparent print:border-b-2 print:border-black">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner print:hidden">
                    <Printer size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight print:text-black">Relatório de Checklists Selecionados</h3>
                    <p className="text-sm text-text-secondary font-medium print:text-black">
                      {selectedChecklistIds.length} itens selecionados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => {
                      const selectedChecklists = checklistRecords.filter(c => selectedChecklistIds.includes(c.id));
                      generateChecklistsReportPDF(selectedChecklists, 'Relatório de Processos Selecionados', systemSettings);
                    }}
                    className="p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors border border-border"
                    title="Imprimir Seleção"
                  >
                    <Printer size={20} />
                  </button>
                  <button
                    onClick={() => setShowSelectedChecklistReport(false)}
                    className="p-2.5 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-8 overflow-y-auto print:overflow-visible">
                <PrintHeader title="Relatório de Processos Selecionados" />
                <div className="space-y-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-text-secondary text-[10px] uppercase tracking-widest border-b border-border print:text-black print:border-black">
                        <th className="px-4 py-3 font-bold">Nº Processo</th>
                        <th className="px-4 py-3 font-bold">Fornecedor</th>
                        <th className="px-4 py-3 font-bold">Objeto</th>
                        <th className="px-4 py-3 font-bold">Valor Nota</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border print:divide-black/20">
                      {checklistRecords.filter(c => selectedChecklistIds.includes(c.id)).map((checklist, idx) => (
                        <tr key={`selected-report-checklist-${checklist.id}-${idx}`} className="print:text-black">
                          <td className="px-4 py-3 text-sm font-bold">{checklist.processNumber}</td>
                          <td className="px-4 py-3 text-sm">{checklist.vendor}</td>
                          <td className="px-4 py-3 text-sm truncate max-w-[200px]">{checklist.object}</td>
                          <td className="px-4 py-3 text-sm font-medium">{checklist.invoiceValue}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest print:border print:border-black print:bg-transparent print:text-black",
                              checklist.status === 'concluido' && "bg-emerald-500/10 text-emerald-500",
                              checklist.status === 'atencao' && "bg-amber-500/10 text-amber-500",
                              checklist.status === 'em_analise' && "bg-blue-500/10 text-blue-500"
                            )}>
                              {(checklist.status || '').replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChecklistSelectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChecklistSelectionModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full h-full sm:h-auto sm:max-w-5xl bg-surface border border-border sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-full sm:max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-border flex justify-between items-center bg-surface-hover/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner">
                    <CheckSquare size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Selecionar Processos</h3>
                    <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest mt-0.5">Selecione os itens para impressão ou exclusão</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedChecklistIds.length > 0 && (
                    <button
                      onClick={() => {
                        const selectedChecklists = checklistRecords.filter(c => selectedChecklistIds.includes(c.id));
                        generateChecklistsReportPDF(selectedChecklists, 'Relatório de Processos Selecionados', systemSettings);
                      }}
                      className="p-2.5 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-colors border border-primary/20 flex items-center gap-2 text-xs font-bold"
                      title="Imprimir Selecionados"
                    >
                      <Printer size={18} />
                      <span className="hidden sm:inline">Imprimir</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowChecklistSelectionModal(false)}
                    className="p-2.5 hover:bg-surface-hover rounded-2xl transition-colors text-text-secondary"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-text-secondary text-[10px] uppercase tracking-widest border-b border-border">
                      <th className="px-4 py-4 font-bold w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          checked={checklistRecords.length > 0 && selectedChecklistIds.length === checklistRecords.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChecklistIds(checklistRecords.map(r => r.id));
                            } else {
                              setSelectedChecklistIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-4 font-bold">Nº Processo</th>
                      <th className="px-4 py-4 font-bold hidden md:table-cell">Fornecedor</th>
                      <th className="px-4 py-4 font-bold hidden sm:table-cell">Objeto</th>
                      <th className="px-4 py-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {checklistRecords.map((item, idx) => (
                      <tr key={`select-modal-${item.id}-${idx}`} className={cn(
                        "hover:bg-surface-hover/50 transition-colors group border-b border-border/50 last:border-0",
                        selectedChecklistIds.includes(item.id) && "bg-primary/5"
                      )}>
                        <td className="px-4 py-5">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                            checked={selectedChecklistIds.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedChecklistIds([...selectedChecklistIds, item.id]);
                              } else {
                                setSelectedChecklistIds(selectedChecklistIds.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm font-bold">{item.processNumber}</p>
                          <p className="text-[10px] text-text-secondary md:hidden">{item.vendor}</p>
                        </td>
                        <td className="px-4 py-5 text-sm text-text-secondary hidden md:table-cell">{item.vendor}</td>
                        <td className="px-4 py-5 text-xs text-text-secondary hidden sm:table-cell truncate max-w-[200px]">{item.object}</td>
                        <td className="px-4 py-5">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest",
                            item.status === 'concluido' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                          )}>
                            {(item.status || '').replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-6 border-t border-border bg-surface-hover/30 flex flex-col sm:flex-row justify-end gap-3">
                {selectedChecklistIds.length > 0 && (
                  <button
                    onClick={() => {
                      setDeleteType('checklistBulk');
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-sm"
                  >
                    <Trash2 size={18} />
                    Excluir Selecionados ({selectedChecklistIds.length})
                  </button>
                )}
                <button
                  onClick={() => setShowChecklistSelectionModal(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-sm shadow-lg shadow-primary/20"
                >
                  <Check size={18} />
                  Concluir Seleção
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderModals()}
    </div>
  );
}
