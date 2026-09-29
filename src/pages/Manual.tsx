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
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'introducao', label: 'Introdução', icon: Info },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'combustivel', label: 'Gestão de Combustível', icon: Fuel },
    { id: 'diarias', label: 'Gestão de Diárias', icon: Calendar },
    { id: 'contratos', label: 'Gestão de Contratos', icon: FileText },
    { id: 'protocolo', label: 'Módulo Protocolo', icon: Download },
    { id: 'checklists', label: 'Checklists Auditáveis', icon: ClipboardCheck },
    { id: 'relatorios', label: 'Relatórios e BI', icon: BarChart3 },
    { id: 'usuarios', label: 'Administração', icon: Users },
    { id: 'faq', label: 'FAQ / Dúvidas', icon: HelpCircle },
  ];

  const filteredCategories = categories.filter(cat => 
    cat.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  <p className="text-xs text-slate-500 font-medium">Utilize suas credenciais fornecidas pelo administrador para realizar o login seguro na plataforma. Recomenda-se a troca da senha no primeiro acesso.</p>
                </div>
                <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <LayoutDashboard size={24} />
                  </div>
                  <h4 className="font-black text-slate-900 uppercase text-sm">Navegação</h4>
                  <p className="text-xs text-slate-500 font-medium">Utilize a barra lateral esquerda para transitar entre os módulos. Em dispositivos móveis, utilize o menu inferior.</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Segurança dos Dados</h3>
              <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex gap-4">
                <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                <p className="text-sm text-amber-700 font-medium">
                  Todas as ações realizadas no sistema são registradas em logs de auditoria (quem fez, o que fez e quando fez). Mantenha sua senha segura.
                </p>
              </div>
            </section>
          </div>
        );
      case 'dashboard':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Dashboard & Visão Geral</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              O Dashboard é o seu centro de comando. Aqui você visualiza os principais indicadores da gestão em tempo real, permitindo uma tomada de decisão baseada em dados.
            </p>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <h4 className="font-black text-slate-900 uppercase text-xs mb-3 flex items-center gap-2">
                    <BarChart3 size={16} className="text-primary" />
                    Cards de Resumo
                  </h4>
                  <p className="text-sm text-slate-500 font-medium">Visualize instantaneamente o total de abastecimentos, diárias pagas, contratos ativos e alertas de pendências críticas que necessitam de atenção imediata.</p>
                </div>
                <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <h4 className="font-black text-slate-900 uppercase text-xs mb-3 flex items-center gap-2">
                    <Settings size={16} className="text-primary" />
                    Filtros Globais
                  </h4>
                  <p className="text-sm text-slate-500 font-medium">A maioria dos gráficos e listas podem ser filtrados por período (últimos 3, 6 ou 12 meses), secretaria ou status específico para uma análise granular.</p>
                </div>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                <h4 className="font-black text-slate-900 uppercase text-xs mb-3">Análise de Tendência</h4>
                <p className="text-sm text-slate-500 font-medium">O gráfico principal compara os gastos de combustível e diárias ao longo do tempo, ajudando a identificar picos de consumo ou sazonalidades.</p>
              </div>
            </div>
          </div>
        );
      case 'combustivel':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Combustível</h2>
            <p className="text-slate-500 font-medium leading-relaxed">Controle rigoroso sobre o consumo de combustível da frota municipal para evitar desperdícios e irregularidades.</p>
            <div className="space-y-4">
              <div className="flex gap-4 items-start p-6 bg-blue-50/30 border border-blue-100 rounded-3xl">
                <Fuel size={24} className="text-primary shrink-0 mt-1" />
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">Registro de Abastecimento</h4>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">Para cada abastecimento, registre o veículo (placa), motorista, quantidade de litros, valor unitário e quilometragem atual do veículo. O sistema validará se a quilometragem é superior ao último registro.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl">
                <CheckCircle2 size={24} className="text-emerald-500 shrink-0 mt-1" />
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">Cálculo de Eficiência (KM/L)</h4>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">O sistema calcula automaticamente a média de consumo de cada veículo. Médias fora do padrão esperado para o modelo podem indicar necessidade de manutenção ou desvios.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start p-6 bg-white border border-slate-100 rounded-3xl">
                <Upload size={24} className="text-slate-400 shrink-0 mt-1" />
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">Importação de Planilhas</h4>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">É possível importar lotes de abastecimentos via arquivos Excel (.xlsx), facilitando a migração de dados ou consolidação mensal.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'diarias':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Diárias</h2>
            <p className="text-slate-500 font-medium">Solicitação, aprovação e prestação de contas de viagens a serviço dos servidores municipais.</p>
            <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-6">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
                <div>
                  <h5 className="font-bold text-slate-900 text-sm">Solicitação</h5>
                  <p className="text-xs text-slate-500 font-medium">O servidor ou gestor solicita a diária informando destino, motivo, datas de ida/volta e valor estimado.</p>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
                <div>
                  <h5 className="font-bold text-slate-900 text-sm">Aprovação / Auditoria</h5>
                  <p className="text-xs text-slate-500 font-medium">O ordenador de despesas avalia a legalidade e necessidade da viagem, podendo aprovar ou rejeitar a solicitação com justificativa.</p>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
                <div>
                  <h5 className="font-bold text-slate-900 text-sm">Pagamento e Prestação de Contas</h5>
                  <p className="text-xs text-slate-500 font-medium">Após o retorno, devem ser anexados comprovantes (notas, certificados, fotos) para encerrar o processo no sistema.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'contratos':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Contratos</h2>
            <p className="text-slate-500 font-medium leading-relaxed">Controle do ciclo de vida dos contratos administrativos, desde a assinatura até o encerramento.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-white border border-slate-200 rounded-3xl">
                <h4 className="text-xs font-black text-primary uppercase mb-2">Monitoramento de Vigência</h4>
                <p className="text-sm text-slate-600 font-medium">O sistema emite alertas coloridos baseados no prazo de vencimento: Verde (Vigente), Amarelo (Vencendo em breve) e Vermelho (Vencido).</p>
              </div>
              <div className="p-6 bg-white border border-slate-200 rounded-3xl">
                <h4 className="text-xs font-black text-primary uppercase mb-2">Aditivos e Reajustes</h4>
                <p className="text-sm text-slate-600 font-medium">Registre aditivos de prazo ou valor. O sistema mantém o histórico do contrato original e todos os seus aditivos para fins de auditoria.</p>
              </div>
              <div className="p-6 bg-white border border-slate-200 rounded-3xl">
                <h4 className="text-xs font-black text-primary uppercase mb-2">Controle de Consumo</h4>
                <p className="text-sm text-slate-600 font-medium">Para contratos continuados, o sistema monitora o quanto do valor total já foi empenhado/gasto através dos checklists de pagamento.</p>
              </div>
              <div className="p-6 bg-white border border-slate-200 rounded-3xl">
                <h4 className="text-xs font-black text-primary uppercase mb-2">Arquivos Anexos</h4>
                <p className="text-sm text-slate-600 font-medium">Anexe cópias digitalizadas do contrato, edital e propostas vencedoras para consulta rápida em qualquer lugar.</p>
              </div>
            </div>
          </div>
        );
      case 'protocolo':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Módulo de Protocolo</h2>
            <p className="text-slate-500 font-medium">
              O módulo de protocolo é o sistema nervoso da prefeitura, responsável pelo registro e controle de fluxo de todos os documentos oficiais.
            </p>

            <div className="space-y-6">
              {[
                { title: 'Entrada de Documentos', content: 'Registra a chegada de ofícios, requerimentos e cartas externas. Gera um número de protocolo único e comprovante de recebimento.', icon: Download },
                { title: 'Tramitação', content: 'Permite mover um documento de um setor para outro, registrando a custódia do documento. Cada movimentação gera um registro histórico imutável.', icon: Repeat },
                { title: 'Processos Administrativos', content: 'Criação de capas de processos que agrupam diversos documentos com um objetivo comum (ex: Processo de Licitação).', icon: LayoutDashboard },
                { title: 'Gestão de Prazos', content: 'Configuração de prazos de resposta para cada tipo de documento. Documentos com prazo expirando são destacados automaticamente.', icon: Clock },
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
            <p className="text-slate-500 font-medium leading-relaxed">Ferramenta para garantir que nenhum processo de pagamento seja realizado sem a documentação completa exigida pela legislação.</p>
            <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2 uppercase text-xs">Inteligência Artificial (IA)</h4>
                <p className="text-sm text-slate-500 font-medium">Ao criar um novo checklist, a IA pode sugerir automaticamente quais documentos são necessários com base no objeto do contrato (ex: Obras, Merenda, Medicamentos).</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2 uppercase text-xs">Auditoria Fotográfica</h4>
                <p className="text-sm text-slate-500 font-medium">Anexe fotos geolocalizadas para comprovar a entrega de materiais ou realização de serviços diretamente no local.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2 uppercase text-xs">Workflow de Aprovação</h4>
                <p className="text-sm text-slate-500 font-medium">O processo tramita digitalmente entre os conferentes até a autorização final de pagamento.</p>
              </div>
            </div>
          </div>
        );
      case 'relatorios':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Relatórios e Business Intelligence</h2>
            <p className="text-slate-500 font-medium leading-relaxed">Transforme dados em informações estratégicas para a gestão pública.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-white border border-slate-200 rounded-3xl">
                <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">Exportação PDF/CSV</h4>
                <p className="text-sm text-slate-500 font-medium">Gere relatórios formatados com cabeçalho oficial da prefeitura para prestação de contas aos tribunais.</p>
              </div>
              <div className="p-6 bg-white border border-slate-200 rounded-3xl">
                <h4 className="font-bold text-slate-900 uppercase text-xs mb-2">Relatório Executivo AI</h4>
                <p className="text-sm text-slate-500 font-medium">A IA analisa todos os dados e gera um resumo executivo com insights e alertas sobre a saúde financeira e operacional.</p>
              </div>
            </div>
          </div>
        );
      case 'usuarios':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Administração de Usuários</h2>
            <p className="text-slate-500 font-medium leading-relaxed">Controle detalhado de quem pode visualizar ou editar cada parte do sistema.</p>
            <div className="bg-rose-50/30 p-6 rounded-3xl border border-rose-100 flex gap-4">
              <AlertTriangle className="text-rose-500 shrink-0" size={24} />
              <div>
                <h4 className="font-bold text-rose-700 text-xs uppercase mb-1">Políticas de Acesso</h4>
                <p className="text-xs text-rose-600 font-medium leading-relaxed">Cada usuário deve ter apenas as permissões necessárias para sua função (Princípio do Menor Privilégio).</p>
              </div>
            </div>
            <div className="p-6 bg-white border border-slate-200 rounded-3xl">
              <h4 className="font-bold text-slate-900 uppercase text-xs mb-3">Perfis de Acesso</h4>
              <ul className="space-y-3">
                <li className="text-sm text-slate-500 font-medium flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle2 size={12} /></div>
                  <div>
                    <span className="font-bold text-slate-900">Super-Admin:</span> Gestão de múltiplas prefeituras e acesso total às configurações do sistema.
                  </div>
                </li>
                <li className="text-sm text-slate-500 font-medium flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle2 size={12} /></div>
                  <div>
                    <span className="font-bold text-slate-900">Admin:</span> Gestão completa de uma prefeitura específica.
                  </div>
                </li>
                <li className="text-sm text-slate-500 font-medium flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle2 size={12} /></div>
                  <div>
                    <span className="font-bold text-slate-900">Gestor:</span> Pode visualizar e editar registros em seus módulos permitidos.
                  </div>
                </li>
                <li className="text-sm text-slate-500 font-medium flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle2 size={12} /></div>
                  <div>
                    <span className="font-bold text-slate-900">Visualizador:</span> Acesso apenas para leitura de dados e relatórios.
                  </div>
                </li>
              </ul>
            </div>
          </div>
        );
      case 'faq':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Perguntas Frequentes (FAQ)</h2>
            <div className="space-y-4">
              {[
                { q: "Como alterar minha senha?", a: "Vá em 'Configurações' no menu lateral e procure a seção de perfil de usuário." },
                { q: "Esqueci minha senha, o que fazer?", a: "Entre em contato com o administrador do sistema da sua prefeitura para solicitar um reset de senha." },
                { q: "Posso acessar o NEXUM pelo celular?", a: "Sim, o sistema é responsivo e funciona perfeitamente em navegadores de smartphones e tablets." },
                { q: "Como exportar dados para o tribunal de contas?", a: "Utilize o módulo de Relatórios e escolha a opção 'PDF' para documentos oficiais ou 'CSV' para planilhas de trabalho." },
                { q: "O que é o Status de Atenção nos abastecimentos?", a: "Significa que o sistema detectou uma quilometragem incoerente ou consumo (KM/L) muito acima ou abaixo do esperado." },
              ].map((item, i) => (
                <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-2">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{item.q}</h4>
                  <p className="text-sm text-slate-500 font-medium">{item.a}</p>
                </div>
              ))}
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
              placeholder="Pesquisar tópicos..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-primary shadow-sm font-bold text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-4 space-y-2 lg:sticky lg:top-8 self-start">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">Principais Tópicos</p>
            {(searchQuery ? filteredCategories : categories).map((cat) => (
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

            {filteredCategories.length === 0 && searchQuery && (
              <div className="p-8 text-center text-slate-400">
                <p className="text-xs font-bold uppercase tracking-widest">Nenhum tópico encontrado</p>
              </div>
            )}

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
