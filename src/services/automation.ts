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
    }, "gemini-3.8-flash");
    
    try {
      return JSON.parse(text || "{}");
    } catch (e) {
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) return JSON.parse(codeBlockMatch[1]);
      throw e;
    }
  } catch (error) {
    console.error("Erro no Health Check:", error);
    return {
      score: 0,
      status: 'critico',
      recommendations: [{ title: "Erro na Análise", description: "Não foi possível processar os dados da prefeitura.", priority: "alta" }],
      insights: ["Verifique sua conexão com a API Gemini."]
    };
  }
};
