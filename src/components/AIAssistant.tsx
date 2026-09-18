import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, Sparkles, Loader2, MessageSquare, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { callAIProxy } from '../lib/ai';
import { Contract, FuelRecord, DailyRecord, ChecklistItem, User } from '../types';

interface AIAssistantProps {
  contracts: Contract[];
  fuelRecords: FuelRecord[];
  dailyRecords: DailyRecord[];
  checklistRecords: ChecklistItem[];
  currentUser: User;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  contracts,
  fuelRecords,
  dailyRecords,
  checklistRecords,
  currentUser
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const context = `
        Você é o Nexum AI, Assistente de Automação e Gestão de Alta Performance.
        Dados Gerais do Sistema:
        - Contratos Ativos: ${contracts.length}
        - Reg. de Abastecimento: ${fuelRecords.length}
        - Reg. de Diárias: ${dailyRecords.length}
        - Reg. de Checklists: ${checklistRecords.length}
        
        Usuário Autorizado: ${currentUser.name} (Acesso: ${currentUser.role})
        
        DIRETRIZES FUNDAMENTAIS DE COMPORTAMENTO E RESPOSTA:
        1. Seja EXTREMAMENTE direto, objective e claro. Elimine formalidades excessivas.
        2. NUNCA gere textos longos ou encheção de linguiça. Vá absurdamente direto ao ponto.
        3. Fale sempre no formato mais comprimido de dados possível (Ex: Use listas curtas, marcadores, passos ou números reais).
        4. Transmita precisão tecnológica, como um motor de processamento direto das informações da Prefeitura, sem frases introdutórias e desfechos padronizados (Nada de "Olá, posso te ajudar" ou "Espero que faça sentido").
        5. Foque 100% em trazer soluções e números mastigados, analíticos. Respostas com "cara de sistema trabalhando".
      `;

      const contents = [
        { role: 'user', parts: [{ text: context }] },
        ...messages.map(m => ({
          role: m.role === 'ai' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ];

      const aiContent = await callAIProxy(contents, {}, "gemini-1.5-flash");

      setMessages(prev => [...prev, { role: 'ai', content: aiContent || "Desculpe, não consegui gerar uma resposta." }]);
    } catch (error: any) {
      console.warn("Erro no Assistente IA:", error.message);
      let errorMessage = error.message || "Desculpe, tive um problema ao processar sua solicitação.";
      
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('limite diário')) {
        errorMessage = "O limite de uso da IA foi atingido para este projeto. A funcionalidade será restabelecida automaticamente em algumas horas.";
      }
      
      setMessages(prev => [...prev, { role: 'ai', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'Resumo Geral', icon: <Sparkles size={14} />, prompt: 'Me dê um resumo geral da situação da prefeitura hoje.' },
    { label: 'Alertas Críticos', icon: <AlertTriangle size={14} />, prompt: 'Quais são os alertas mais críticos que exigem minha atenção agora?' },
    { label: 'Análise de Gastos', icon: <TrendingUp size={14} />, prompt: 'Analise os gastos com combustível e diárias deste mês.' },
  ];

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed z-40 bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/40 border-4 border-background rounded-full transition-all bottom-20 right-4 w-14 h-14 sm:bottom-6 sm:right-6 sm:w-16 sm:h-16 md:bottom-8 md:right-8"
          >
            <Bot size={28} className="sm:w-8 sm:h-8" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 rounded-full border-2 border-background"
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Background Overlay (Mobile Only) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 sm:hidden"
          />
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed z-50 flex flex-col bg-surface shadow-2xl border-border overflow-hidden
                       bottom-0 left-0 right-0 w-full h-[90dvh] rounded-t-3xl border-t
                       sm:bottom-24 sm:right-6 sm:left-auto sm:w-[400px] sm:h-[600px] sm:rounded-3xl sm:border
                       md:bottom-28 md:right-8 md:w-[450px] md:h-[650px] md:rounded-[2rem]"
          >
            {/* Mobile Drag Indicator */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-12 h-1.5 bg-border rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 sm:p-6 bg-primary text-white flex justify-between items-center sm:rounded-t-3xl md:rounded-t-[2rem]">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl">
                  <Bot size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg tracking-tight">Nexum AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-emerald-100">Online</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap size={28} className="sm:w-8 sm:h-8" />
                  </div>
                  <h4 className="font-black text-base sm:text-lg mb-2">Como posso automatizar seu dia?</h4>
                  <p className="text-xs sm:text-sm text-text-secondary mb-6 max-w-xs mx-auto">
                    Posso analisar contratos, identificar gargalos em processos e gerar relatórios.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {quickActions.map((action, i) => (
                      <button
                        key={`quick-action-${i}`}
                        onClick={() => { setInput(action.prompt); }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left text-xs sm:text-sm font-bold group"
                      >
                        <span className="text-primary group-hover:scale-110 transition-transform">{action.icon}</span>
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={`msg-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-surface-hover border border-border rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-hover border border-border p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span className="text-xs font-bold text-text-secondary">IA está pensando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 pt-4 pb-8 sm:p-6 border-t border-border bg-surface-hover/50">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pergunte ou peça uma automação..."
                  className="w-full bg-surface border border-border rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pl-4 sm:pl-6 pr-14 outline-none focus:border-primary transition-colors text-sm font-medium"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 w-10 sm:w-12 bg-primary text-white rounded-lg sm:rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  <Send size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
