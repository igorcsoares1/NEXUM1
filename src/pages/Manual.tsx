import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  LayoutDashboard, 
  Fuel, 
  Calendar, 
  ClipboardCheck, 
  FileText, 
  Users, 
  BarChart3, 
  Settings,
  Download,
  Upload,
  Repeat,
  Clock,
  Archive,
  Info,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  PlayCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const ManualPage = () => {
  const [activeTab, setActiveTab] = useState('introducao');

  const categories = [
    { id: 'introducao', label: 'Introdução', icon: Info },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'combustivel', label: 'Gestão de Combustível', icon: Fuel },
    { id: 'diarias', label: 'Gestão de Diárias', icon: Calendar },
    { id: 'contratos', label: 'Gestão de Contratos', icon: FileText },
    { id: 'protocolo', label: 'Módulo Protocolo', icon: Download },
    { id: 'checklists', label: 'Checklists Auditáveis', icon: ClipboardCheck },
    { id: 'usuarios', label: 'Administração', icon: Users },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'introducao':
        return (
          <div className="space-y-8">
            <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10">
              <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight">Bem-vindo ao NEXUM</h2>
              <p className="text-slate-600 leading-relaxed font-medium">
                O NEXUM é uma plataforma integrada de gestão pública municipal, projetada para oferecer transparência, 
                eficiência e controle total sobre os processos administrativos da prefeitura. Este manual servirá como 
                seu guia completo para navegar e utilizar todas as funcionalidades do sistema.
              </p>
            </div>

            <section className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Primeiros Passos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-black text-slate-900 uppercase text-sm">Acesso ao Sistema</h4>
                  <p className="text-xs text-slate-500 font-medium">Utilize suas credenciais fornecidas pelo administrador para realizar o login seguro na plataforma.</p>
                </div>
                <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <LayoutDashboard size={24} />
                  </div>
                  <h4 className="font-black text-slate-900 uppercase text-sm">Navegação</h4>
                  <p className="text-xs text-slate-500 font-medium">Utilize a barra lateral esquerda para transitar entre os diferentes módulos e funcionalidades disponíveis.</p>
                </div>
              </div>
            </section>
          </div>
        );
      case 'dashboard':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Dashboard & Visão Geral</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              O Dashboard é o seu centro de comando. Aqui você visualiza os principais indicadores da gestão em tempo real.
            </p>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <h4 className="font-black text-slate-900 uppercase text-xs mb-3 flex items-center gap-2">
                    <BarChart3 size={16} className="text-primary" />
                    Cards de Resumo
                  </h4>
                  <p className="text-sm text-slate-500 font-medium">Visualize instantaneamente o total de abastecimentos, diárias pagas, contratos ativos e alertas de pendências.</p>
                </div>
                <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <h4 className="font-black text-slate-900 uppercase text-xs mb-3 flex items-center gap-2">
                    <Settings size={16} className="text-primary" />
                    Filtros Globais
                  </h4>
                  <p className="text-sm text-slate-500 font-medium">A maioria dos gráficos e listas podem ser filtrados por período, secretaria ou status específico.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'combustivel':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Combustível</h2>
            <p className="text-slate-500 font-medium">Controle rigoroso sobre o consumo de combustível da frota municipal.</p>
            <div className="space-y-4">
              <div className="flex gap-4 items-start p-6 bg-blue-50/30 border border-blue-100 rounded-3xl">
                <Fuel size={24} className="text-primary shrink-0 mt-1" />
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">Registro de Abastecimento</h4>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">Para cada abastecimento, registre o veículo (placa), motorista, quantidade de litros, valor unitário e quilometragem atual do veículo.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start p-6 bg-white border border-slate-100 rounded-3xl">
                <CheckCircle2 size={24} className="text-emerald-500 shrink-0 mt-1" />
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">Controle de Média</h4>
                  <p className="text-sm text-slate-600 font-medium">O sistema calcula automaticamente a média de consumo (km/l) de cada veículo para detectar possíveis irregularidades.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'diarias':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Diárias</h2>
            <p className="text-slate-500 font-medium">Solicitação e prestação de contas de viagens a serviço.</p>
            <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-6">
              <div className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs">1</div>
                <p className="text-sm font-bold text-slate-900">Solicitação: O servidor solicita a diária informando destino e motivo.</p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs">2</div>
                <p className="text-sm font-bold text-slate-900">Aprovação: O gestor responsável avalia e autoriza o pagamento.</p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs">3</div>
                <p className="text-sm font-bold text-slate-900">Prestação de Contas: O servidor anexa notas e relatórios após a viagem.</p>
              </div>
            </div>
          </div>
        );
      case 'contratos':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Contratos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-white border border-slate-200 rounded-3xl">
                <h4 className="text-xs font-black text-primary uppercase mb-2">Vigência</h4>
                <p className="text-sm text-slate-600 font-medium">O sistema alerta automaticamente quando um contrato está próximo do vencimento (30, 60 e 90 dias).</p>
              </div>
              <div className="p-6 bg-white border border-slate-200 rounded-3xl">
                <h4 className="text-xs font-black text-primary uppercase mb-2">Aditivos</h4>
                <p className="text-sm text-slate-600 font-medium">Registre reajustes de valor ou prorrogações de prazo mantendo o histórico completo.</p>
              </div>
            </div>
          </div>
        );
      case 'protocolo':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Módulo de Protocolo</h2>
            <p className="text-slate-500 font-medium">
              O módulo de protocolo é responsável pelo registro e controle de fluxo de todos os documentos e processos 
              que tramitam na administração pública.
            </p>

            <div className="space-y-6">
              {[
                { title: 'Entrada de Documentos', content: 'Registra a chegada de ofícios, requerimentos e cartas externas. Gera um número de protocolo único para acompanhamento.', icon: Download },
                { title: 'Tramitação', content: 'Permite mover um documento de um setor para outro, registrando data, hora e responsável por cada passo.', icon: Repeat },
                { title: 'Processos', content: 'Agrupa documentos relacionados a uma finalidade específica (ex: Licitação, Recurso Humano) com status de evolução.', icon: LayoutDashboard },
                { title: 'Arquivamento', content: 'Destinação final de documentos concluídos para o arquivo permanente ou temporário.', icon: Archive },
              ].map((item, i) => (
                <div key={i} className="flex gap-6 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <item.icon size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-900 uppercase tracking-tight">{item.title}</h4>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'checklists':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Checklists Auditáveis</h2>
            <p className="text-slate-500 font-medium">Garantia de conformidade em todos os processos da prefeitura.</p>
            <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2 uppercase text-xs">Relatórios Fotográficos</h4>
                <p className="text-sm text-slate-500 font-medium">O servidor pode anexar fotos diretamente do celular para comprovar a realização de tarefas ou o estado de bens públicos.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2 uppercase text-xs">Assinatura Digital</h4>
                <p className="text-sm text-slate-500 font-medium">Coleta de rubricas e assinaturas diretamente na tela garantindo a irretratabilidade da auditoria.</p>
              </div>
            </div>
          </div>
        );
      case 'usuarios':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Administração de Usuários</h2>
            <p className="text-slate-500 font-medium leading-relaxed">Controle quem pode acessar o quê no sistema.</p>
            <div className="bg-rose-50/30 p-6 rounded-3xl border border-rose-100 flex gap-4">
              <AlertTriangle className="text-rose-500 shrink-0" size={24} />
              <div>
                <h4 className="font-bold text-rose-700 text-xs uppercase mb-1">Avisos de Segurança</h4>
                <p className="text-xs text-rose-600 font-medium leading-relaxed">Apenas o Super-Admin pode criar novos perfis de administrador. Nunca compartilhe sua senha de acesso.</p>
              </div>
            </div>
            <div className="p-6 bg-white border border-slate-200 rounded-3xl">
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-3">Níveis de Acesso</h4>
              <ul className="space-y-2">
                <li className="text-sm text-slate-500 font-medium flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Super-Admin: Acesso total a todas as prefeituras.</li>
                <li className="text-sm text-slate-500 font-medium flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Admin Regional: Todas as secretarias de uma prefeitura específica.</li>
                <li className="text-sm text-slate-500 font-medium flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Operador: Acesso limitado a módulos específicos (ex: apenas Combustível).</li>
              </ul>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-300">
              <PlayCircle size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Em Construção</h2>
              <p className="text-slate-500 font-medium max-w-sm">Esta sessão do manual está sendo atualizada para incluir as últimas funcionalidades do sistema.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <BookOpen size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                Manual do Usuário
              </h1>
              <p className="text-slate-500 font-medium tracking-tight">
                Guia interativo para utilização completa da plataforma NEXUM.
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar no manual..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-primary shadow-sm font-bold text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-4 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">Principais Tópicos</p>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 text-left group",
                  activeTab === cat.id 
                    ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                  activeTab === cat.id ? "bg-white/20" : "bg-slate-100 text-slate-400 group-hover:text-primary group-hover:bg-primary/5"
                )}>
                  <cat.icon size={20} />
                </div>
                <span className="font-black text-xs uppercase tracking-widest">{cat.label}</span>
                {activeTab === cat.id && <ChevronRight size={18} className="ml-auto" />}
              </button>
            ))}

            <div className="mt-8 p-6 bg-slate-900 rounded-[2.5rem] border border-slate-800 text-white space-y-4">
              <h4 className="font-black uppercase tracking-tight text-sm">Precisa de Ajuda?</h4>
              <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-wider">
                Nossa equipe de suporte está disponível de Seg. a Sex. das 08h às 18h.
              </p>
              <button 
                onClick={() => window.location.href = 'mailto:suporte@nexum.com.br?subject=Suporte%20NEXUM'}
                className="w-full bg-white text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-2"
              >
                <HelpCircle size={14} />
                Falar com Suporte
              </button>
            </div>
          </div>

          {/* Content Area */}
          <main className="lg:col-span-8 bg-white border border-slate-200 rounded-[3rem] p-8 md:p-12 shadow-sm min-h-[600px]">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {renderContent()}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ManualPage;
