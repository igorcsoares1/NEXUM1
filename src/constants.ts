import { AuditItem, FuelRecord, DailyRecord, Contract, ChecklistItem, User } from './types';
import { format } from 'date-fns';

export const chartData = [
  { name: 'Jan', value: 4000 },
  { name: 'Fev', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Abr', value: 2800 },
  { name: 'Mai', value: 2200 },
  { name: 'Jun', value: 2500 },
];

export const auditItems: AuditItem[] = [
  { id: '1', prefeituraId: '1', type: 'fuel', title: 'Abastecimento realizado', user: 'JOÃO SILVA', time: 'HÁ 5 MIN' },
  { id: '2', prefeituraId: '1', type: 'checklist', title: 'Checklist aprovado', user: 'MARIA SANTOS', time: 'HÁ 12 MIN' },
  { id: '3', prefeituraId: '1', type: 'daily', title: 'Diária solicitada', user: 'RICARDO OLIVEIRA', time: 'HÁ 24 MIN' },
  { id: '5', prefeituraId: '1', type: 'contract', title: 'Contrato aditivado', user: 'CARLOS LIMA', time: 'HÁ 1H' },
];

export const initialFuelRecords: FuelRecord[] = [
  { 
    id: '1', 
    prefeituraId: '1', 
    vehicle: 'Toyota Hilux', 
    driver: 'João Silva', 
    date: '2026-03-28', 
    quantity: '45.2 L', 
    cost: 'R$ 248,60', 
    status: 'concluido',
    yearModel: '2024/2025',
    official: 'Sim',
    renavam: '123456789',
    plate: 'ABC-1234',
    fuelType: 'Diesel',
    kmPerLiter: '12.5',
    kmReading: '15.000',
    unitPrice: 'R$ 5,50'
  },
  { 
    id: '2', 
    prefeituraId: '1', 
    vehicle: 'Fiat Toro', 
    driver: 'Maria Santos', 
    date: '2026-03-27', 
    quantity: '32.8 L', 
    cost: 'R$ 180,40', 
    status: 'pendente',
    yearModel: '2023/2024',
    official: 'Sim',
    renavam: '987654321',
    plate: 'XYZ-5678',
    fuelType: 'Flex',
    kmPerLiter: '10.2',
    kmReading: '8.500',
    unitPrice: 'R$ 5,50'
  },
  { 
    id: '3', 
    prefeituraId: '1', 
    vehicle: 'VW Gol', 
    driver: 'Ricardo Oliveira', 
    date: '2026-03-27', 
    quantity: '28.5 L', 
    cost: 'R$ 156,75', 
    status: 'concluido',
    yearModel: '2022/2022',
    official: 'Não',
    renavam: '456789123',
    plate: 'DEF-9012',
    fuelType: 'Gasolina',
    kmPerLiter: '14.1',
    kmReading: '45.000',
    unitPrice: 'R$ 5,50'
  },
  { 
    id: '4', 
    prefeituraId: '1', 
    vehicle: 'Ford Ranger', 
    driver: 'Ana Costa', 
    date: '2026-03-26', 
    quantity: '52.0 L', 
    cost: 'R$ 286,00', 
    status: 'atencao',
    yearModel: '2025/2025',
    official: 'Sim',
    renavam: '321654987',
    plate: 'GHI-3456',
    fuelType: 'Diesel',
    kmPerLiter: '11.8',
    kmReading: '2.000',
    unitPrice: 'R$ 5,50'
  },
  { 
    id: '5', 
    prefeituraId: '1', 
    vehicle: 'MICRO ÔNIBUS VOLARE V8', 
    driver: 'SECRETARIA MUNICIPAL DE SAÚDE', 
    date: '2026-02-28', 
    quantity: '600 L', 
    cost: 'R$ 4.134,00', 
    status: 'concluido',
    yearModel: '2024/2024',
    official: 'Sim',
    renavam: '789123456',
    plate: 'JMI-8D01',
    fuelType: 'Diesel',
    kmPerLiter: '6.0',
    kmReading: '600',
    unitPrice: 'R$ 6,89'
  },
];

export const initialDailyRecords: DailyRecord[] = [
  { id: '1', prefeituraId: '1', driver: 'João Silva', destination: 'Belo Horizonte - MG', date: '2026-03-28', value: 'R$ 150,00', status: 'concluido' },
  { id: '2', prefeituraId: '1', driver: 'Maria Santos', destination: 'São Paulo - SP', date: '2026-03-27', value: 'R$ 250,00', status: 'pendente' },
  { id: '3', prefeituraId: '1', driver: 'Ricardo Oliveira', destination: 'Rio de Janeiro - RJ', date: '2026-03-27', value: 'R$ 200,00', status: 'concluido' },
  { id: '4', prefeituraId: '1', driver: 'Ana Costa', destination: 'Curitiba - PR', date: '2026-03-26', value: 'R$ 180,00', status: 'concluido' },
];

export const initialContracts: Contract[] = [
  { 
    id: '1', 
    prefeituraId: '1', 
    number: 'Nº 01/2026', 
    vendor: 'Posto Central Ltda', 
    object: 'Fornecimento de Combustível', 
    validity: '29/03/2026 - 29/03/2027', 
    expiryDate: '2027-03-29', 
    consumption: 'R$ 45.231,00', 
    totalValue: 'R$ 100.000,00', 
    isAditivado: true, 
    status: 'vigente',
    secretariat: 'Transportes',
    modality: 'Pregão Eletrônico',
    signatureDate: '2026-03-29',
    category: 'Serviços Essenciais',
    addendums: [
      { date: '2026-06-15', description: 'Reequilíbrio econômico-financeiro', value: 'R$ 5.000,00' }
    ]
  },
  { 
    id: '2', 
    prefeituraId: '1', 
    number: 'Nº 02/2026', 
    vendor: 'Auto Peças Silva', 
    object: 'Manutenção de Frota', 
    validity: '15/01/2026 - 15/01/2027', 
    expiryDate: '2027-01-15', 
    consumption: 'R$ 12.840,00', 
    totalValue: 'R$ 15.000,00', 
    isAditivado: false, 
    status: 'vencido',
    secretariat: 'Obras',
    modality: 'Dispensa',
    signatureDate: '2026-01-15',
    category: 'Manutenção'
  },
  { 
    id: '3', 
    prefeituraId: '1', 
    number: 'Nº 03/2026', 
    vendor: 'Limpeza Total S.A.', 
    object: 'Serviços de Conservação', 
    validity: '01/02/2026 - 01/02/2027', 
    expiryDate: format(new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    consumption: 'R$ 8.500,00', 
    totalValue: 'R$ 9.000,00', 
    isAditivado: true, 
    status: 'atencao',
    secretariat: 'Administração',
    modality: 'Pregão Presencial',
    signatureDate: '2026-02-01',
    category: 'Serviços Gerais'
  },
];

export const initialChecklistRecords: ChecklistItem[] = [
  { 
    id: '1', 
    prefeituraId: '1',
    processNumber: '2026/000123', 
    contractNumber: '01/2026', 
    vendor: 'Posto Central Ltda', 
    object: 'Fornecimento de Combustível', 
    value: 'R$ 45.231,00', 
    submissionDate: '2026-03-30', 
    status: 'concluido',
    stepsCompleted: 3,
    totalSteps: 3,
    items: [
      { id: '1', label: 'Nota Fiscal Conferida', checked: true },
      { id: '2', label: 'Certidão Negativa de Débitos', checked: true },
      { id: '3', label: 'Relatório de Consumo', checked: true }
    ]
  },
  { 
    id: '2', 
    prefeituraId: '1',
    processNumber: '2026/000456', 
    contractNumber: '02/2026', 
    vendor: 'Auto Peças Silva', 
    object: 'Manutenção de Frota', 
    value: 'R$ 12.840,00', 
    submissionDate: '2026-03-29', 
    status: 'em_analise',
    stepsCompleted: 2,
    totalSteps: 3,
    items: [
      { id: '1', label: 'Nota Fiscal Conferida', checked: true },
      { id: '2', label: 'Ordem de Serviço', checked: true },
      { id: '3', label: 'Certidão Negativa de Débitos', checked: false }
    ]
  },
  { 
    id: '3', 
    prefeituraId: '1', 
    processNumber: '2026/000789', 
    contractNumber: '03/2026', 
    vendor: 'Limpeza Total S.A.', 
    object: 'Serviços de Conservação', 
    value: 'R$ 8.500,00', 
    submissionDate: '2026-03-28', 
    status: 'concluido',
    stepsCompleted: 3,
    totalSteps: 3
  },
  { 
    id: '4', 
    prefeituraId: '1', 
    processNumber: '2026/001011', 
    contractNumber: '04/2026', 
    vendor: 'Tecnologia Avançada', 
    object: 'Licenciamento de Software', 
    value: 'R$ 25.000,00', 
    submissionDate: '2026-03-27', 
    status: 'pendente',
    stepsCompleted: 0,
    totalSteps: 5
  },
];

export const initialUsers: User[] = [
  { id: '1', prefeituraId: '1', name: 'Igor Tráfego Pago', username: 'igor', password: '123', email: 'trafegopagoigor@gmail.com', role: 'superadmin', department: 'Administração', status: 'ativo', lastLogin: '2026-03-31 10:30' },
  { id: '2', prefeituraId: '1', name: 'João Silva', username: 'joao', password: '123', email: 'joao.silva@prefeitura.gov.br', role: 'gestor', department: 'Finanças', status: 'ativo', lastLogin: '2026-03-31 09:15' },
  { id: '3', prefeituraId: '1', name: 'Maria Santos', username: 'maria', password: '123', email: 'maria.santos@prefeitura.gov.br', role: 'visualizador', department: 'Transportes', status: 'ativo', lastLogin: '2026-03-30 16:45' },
  { id: '4', prefeituraId: '1', name: 'Ricardo Oliveira', username: 'ricardo', password: '123', email: 'ricardo.oliveira@prefeitura.gov.br', role: 'visualizador', department: 'Obras', status: 'inativo', lastLogin: '2026-03-25 11:20' },
];

export const DEFAULT_CHECKLIST_DOCUMENTS = [
  'CERTIDÇÃO NEGATIVA DE DEBITOS TRABALHISTAS',
  'CERTIDÃO NEGATIVA DE REGULARIDADE (FGTS)',
  'CERTIDAÇÃO NEGATIVA DE DEBITOS FEDERAIS',
  'CERTIDAÇÃO NETAGIVA DE DEBITOS ESTADUAIS',
  'CERTIDÃO NEGATIVA DE DEBITSO MUNICIPAIS',
  'PLANILHA DE COMPOSIÇÃO DE CUSTOS',
  'RELATORIO DE ATIVIDADES',
  'CONTA BANCARIA DA EMPRESA'
];
