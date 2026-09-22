import React from 'react';

export type View = 'dashboard' | 'combustivel' | 'diarias' | 'checklists' | 'contratos' | 'notas_fiscais' | 'usuarios' | 'relatorios' | 'prefeituras' | 'configuracoes' | 'protocolo-entrada' | 'protocolo-saida' | 'protocolo-processos' | 'protocolo-tramitacao' | 'protocolo-pendencias' | 'protocolo-arquivos' | 'manual' | 'relatorio_executivo';

export interface Protocol {
  id: string;
  prefeituraId: string;
  type: 'entrada' | 'saida';
  documentType: string;
  priority: 'baixa' | 'normal' | 'alta' | 'urgente';
  subject: string;
  description: string;
  sender: string;
  destinationUnit: string;
  deadline?: string;
  status: 'pendente' | 'em_tramitacao' | 'concluido' | 'arquivado';
  createdAt: string;
  updatedAt?: string;
  processNumber?: string;
  attachments?: { name: string; url: string; type: string }[];
}

export interface SystemSettings {
  id: string;
  prefeituraId: string;
  entidadeFilha: string;
  cnpj: string;
  endereco: string;
  setor: string;
  logoBase64?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Prefeitura {
  id: string;
  name: string;
  cnpj: string;
  city: string;
  state: string;
  status: 'ativo' | 'inativo';
  logoUrl?: string;
  createdAt: string;
}

export interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
  isActive?: boolean;
}

export interface AuditItem {
  id: string;
  prefeituraId: string;
  type: 'fuel' | 'checklist' | 'daily' | 'contract';
  title: string;
  user: string;
  time: string;
}

export interface FuelRecord {
  id: string;
  prefeituraId: string;
  vehicle: string;
  driver: string;
  date: string;
  quantity: string;
  cost: string;
  status: 'concluido' | 'pendente' | 'atencao';
  yearModel?: string;
  official?: string;
  renavam?: string;
  plate?: string;
  fuelType?: string;
  kmPerLiter?: string;
  kmReading?: string;
  unitPrice?: string;
  sheet?: string;
  month?: string;
}

export interface DailyRecord {
  id: string;
  prefeituraId: string;
  driver: string;
  beneficiary?: string;
  registrationNumber?: string;
  servidorId?: string;
  destination: string;
  date: string;
  departureDate?: string;
  returnDate?: string;
  purpose?: string;
  value: string;
  status: 'concluido' | 'pendente' | 'atencao' | 'aprovado' | 'pago' | 'rejeitado';
  approvalStatus?: 'pendente' | 'aprovado' | 'rejeitado';
  attachments?: { name: string; url: string; type: string }[];
  approvedBy?: string;
  approvedAt?: string;
}

export interface Servidor {
  id: string;
  prefeituraId: string;
  name: string;
  cpf: string;
  registrationNumber?: string;
  department: string;
  position: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  prefeituraId: string;
  number: string;
  vendor: string;
  object: string;
  validity: string;
  expiryDate: string;
  consumption: string;
  totalValue?: string;
  isAditivado?: boolean;
  status: 'vencido' | 'vigente' | 'atencao' | 'vencendo' | 'aditivado';
  secretariat?: string;
  modality?: string;
  signatureDate?: string;
  category?: string;
  addendums?: { date: string; description: string; value?: string }[];
}

export interface TramitationStep {
  date: string;
  sector: string;
  action: string;
}

export interface ChecklistItem {
  id: string;
  prefeituraId: string;
  processNumber: string;
  contractNumber: string;
  vendor: string;
  object: string;
  value: string;
  invoiceValue?: string;
  invoiceNumber?: string;
  submissionDate: string;
  status: 'concluido' | 'em_analise' | 'atencao' | 'pendente';
  currentSector?: string;
  items?: { id: string; label: string; checked: boolean }[];
  stepsCompleted?: number;
  totalSteps?: number;
  history?: TramitationStep[];
}

export interface ChecklistConfirmation {
  id: string;
  checklist_id: string;
  prefeituraId: string;
  nome_confirmante: string;
  data_confirmacao: string;
}

export interface DiariaConfirmation {
  id: string;
  diaria_id: string;
  prefeituraId: string;
  nome_aprovador: string;
  data_aprovacao: string;
  observacao?: string;
}

export interface NotaFiscal {
  id: string;
  numero_nota: string;
  fornecedor: string;
  valor: string;
  data_emissao: string;
  contrato_id: string;
  observacao?: string;
  status: 'pendente' | 'recebido';
  enviado_por?: string;
  enviado_em?: string;
  recebido_por?: string;
  recebido_em?: string;
  prefeituraId: string;
}

export interface User {
  id: string;
  uid?: string;
  prefeituraId: string;
  name: string;
  username: string;
  password?: string;
  email?: string;
  role: 'superadmin' | 'admin' | 'gestor' | 'visualizador' | 'compras';
  department: string;
  status: 'ativo' | 'inativo';
  lastLogin: string;
  permissions?: View[];
}