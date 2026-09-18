import { supabase } from '../lib/supabase';
import { callAIProxy } from '../lib/ai';
import { Contract, FuelRecord, DailyRecord, ChecklistItem, User } from '../types';

export interface HealthCheckResult {
  score: number;
  status: 'excelente' | 'bom' | 'atencao' | 'critico';
  recommendations: {
    title: string;
    description: string;
    priority: 'alta' | 'media' | 'baixa';
    action?: string;
  }[];
  insights: string[];
}

export const runSmartHealthCheck = async (
  contracts: Contract[],
  fuelRecords: FuelRecord[],
  dailyRecords: DailyRecord[],
  checklistRecords: ChecklistItem[],
  currentUser: User
): Promise<HealthCheckResult> => {
  try {
    // Payload otimizado para evitar timeouts de RPC
    const dataSummary = {
      contracts: contracts.slice(0, 50).map(c => ({ 
        n: c.number, 
        s: c.status, 
        e: c.expiryDate, 
        c: c.consumption 
      })),
      fuel: fuelRecords.slice(0, 30).map(f => ({ d: f.date, v: f.cost })),
      daily: dailyRecords.slice(0, 30).map(d => ({ d: d.date, v: d.value })),
      checklist: checklistRecords.length
    };

    const prompt = `
      Analise os dados da gestão municipal e gere um relatório técnico de saúde.
      Dados: ${JSON.stringify(dataSummary)}
      
      Retorne apenas um JSON:
      {
        "score": number, (0-100)
        "status": "excelente" | "bom" | "atencao" | "critico",
        "recommendations": [{ "title": "string", "description": "string", "priority": "alta" | "media" | "baixa", "action": "string" }],
        "insights": ["string"]
      }
    `;

    const text = await callAIProxy([{ role: 'user', parts: [{ text: prompt }] }], {
      responseMimeType: "application/json"
    }, "gemini-1.5-flash"); // Switching to a more standard model name just in case
    
    try {
      return JSON.parse(text || "{}");
    } catch (e) {
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) return JSON.parse(codeBlockMatch[1]);
      throw e;
    }
  } catch (error: any) {
    console.error("Erro no Health Check:", error);
    
    // Fallback logic without AI
    const now = new Date();
    const expiringSoon = contracts.filter(c => {
      if (!c.expiryDate) return false;
      const expiry = new Date(c.expiryDate);
      const diff = expiry.getTime() - now.getTime();
      return diff > 0 && diff < (30 * 24 * 60 * 60 * 1000); // 30 days
    });

    const highConsumption = contracts.filter(c => {
      const consumption = parseFloat(c.consumption.replace(/[^0-9,-]/g, '').replace(',', '.'));
      return consumption > 90; // Over 90%
    });

    const baseScore = 75;
    const score = Math.max(10, baseScore - (expiringSoon.length * 10) - (highConsumption.length * 15));
    
    let status: HealthCheckResult['status'] = 'excelente';
    if (score < 40) status = 'critico';
    else if (score < 65) status = 'atencao';
    else if (score < 85) status = 'bom';

    const recommendations: HealthCheckResult['recommendations'] = [];
    if (expiringSoon.length > 0) {
      recommendations.push({
        title: "Contratos Expirando",
        description: `Existem ${expiringSoon.length} contratos que vencem nos próximos 30 dias.`,
        priority: "alta",
        action: "Ver Contratos"
      });
    }

    if (highConsumption.length > 0) {
      recommendations.push({
        title: "Consumo Elevado",
        description: `${highConsumption.length} contratos atingiram mais de 90% do valor empenhado.`,
        priority: "alta",
        action: "Alertar Gestores"
      });
    }

    const insights = [
      "Relatório gerado via análise local (IA em repouso).",
      `Total de contratos ativos: ${contracts.filter(c => c.status === 'vigente').length}`,
      `Registros de combustível analisados: ${fuelRecords.length}`
    ];

    if (error.message?.includes("limite diário")) {
      insights.unshift("⚠️ Quota de IA atingida. Resultados baseados em heurísticas locais.");
    }

    return {
      score,
      status,
      recommendations: recommendations.length > 0 ? recommendations : [
        { title: "Manter Monitoramento", description: "Continue registrando as diárias e consumos regularmente.", priority: "baixa" }
      ],
      insights
    };
  }
};
