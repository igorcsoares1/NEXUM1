import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Classifica erros do Gemini: diário x por minuto x outros
  const classifyAIError = (error: any) => {
    const raw = error?.message || String(error || 'Erro desconhecido');
    const low = raw.toLowerCase();
    const isDaily = /perday|per day|per_day|requestsperday|daily/.test(low);
    const is429 = raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || low.includes('quota');
    const isUnavailable = raw.includes('503') || raw.includes('UNAVAILABLE') || low.includes('high demand') || low.includes('overloaded');
    const isKey = low.includes('api key') || low.includes('api_key') || raw.includes('PERMISSION_DENIED') || raw.includes('401') || raw.includes('403');
    const isModel = raw.includes('404') || low.includes('not found') || low.includes('is not supported');
    const isTooLarge = low.includes('too large') || low.includes('exceeds the maximum') || low.includes('token count') || raw.includes('413');
    let status = 500;
    let message = `Erro da IA: ${raw.substring(0, 300)}`;
    if (isKey) { status = 401; message = 'Chave da API Gemini inválida ou sem permissão. Verifique a GEMINI_API_KEY nos Secrets do AI Studio.'; }
    else if (isModel) { status = 404; message = 'Modelo de IA não encontrado ou não disponível para esta chave.'; }
    else if (isTooLarge) { status = 413; message = 'O arquivo é grande demais para a IA. Envie apenas as páginas/abas principais do mês.'; }
    else if (is429 && isDaily) { status = 429; message = 'O limite DIÁRIO de uso da IA foi atingido. Ele é renovado automaticamente no dia seguinte (horário do Pacífico). Para evitar isso, ative o faturamento na chave da API.'; }
    else if (is429) { status = 429; message = 'Muitas requisições à IA em pouco tempo (limite por minuto). Aguarde 1 a 2 minutos e tente novamente.'; }
    else if (isUnavailable) { status = 503; message = 'O serviço de IA está sobrecarregado no momento. Tente novamente em instantes.'; }
    return { status, message, raw };
  };

  // Helper for exponential backoff retries
  const withRetry = async <T>(fn: () => Promise<T>, retries = 10, delay = 3000): Promise<T> => {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      
      // Limite diário: não adianta tentar de novo
      if (/perday|per day|per_day|daily/i.test(errorMsg)) {
        throw error;
      }
      // Limite por minuto: tenta no máximo 2 vezes, esperando ~30s (cada tentativa gasta cota)
      const isRate = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || /quota/i.test(errorMsg);
      if (isRate) {
        if (retries > 8) {
          console.warn(`Gemini rate limit. Aguardando 30s... (${errorMsg.substring(0, 200)})`);
          await new Promise(resolve => setTimeout(resolve, 30000));
          return withRetry(fn, retries - 1, delay);
        }
        throw error;
      }

      const isRetryable = 
        errorMsg.includes('503') || 
        errorMsg.includes('UNAVAILABLE') || 
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('high demand');
      
      if (isRetryable && retries > 0) {
        console.warn(`Gemini API error (retryable: ${errorMsg}). Retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        const nextDelay = Math.min(delay * 1.5, 20000);
        return withRetry(fn, retries - 1, nextDelay);
      }
      throw error;
    }
  };

  // Gemini AI Route
  app.post("/api/ai/generate-checklist", async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[${requestId}] Checklist request received`);
    try {
      const { prompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Configuração de IA pendente." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      
      const result = await withRetry(() => ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }));
      
      const text = result.text || "";
      console.log(`[${requestId}] Checklist request completed successfully`);
      res.json({ text });
    } catch (error: any) {
      console.error(`[${requestId}] AI Error:`, error);
      const { status, message, raw } = classifyAIError(error);
      res.status(status).json({ error: message, detail: raw.substring(0, 1000) });
    }
  });

  // Generic AI Processing Route for Extraction
  app.post("/api/ai/process", async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[${requestId}] AI Process request received`);
    try {
      const { model, contents, config } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Configuração de IA pendente." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      // Map deprecated models to modern supported model
      let targetModel = model || "gemini-3.8-flash";
      if (!targetModel || targetModel.includes("gemini-1.5") || targetModel.includes("gemini-2.0") || targetModel.includes("gemini-pro")) {
        targetModel = "gemini-3.8-flash";
      }

      // Modelo reserva: usado automaticamente quando a cota DIÁRIA do modelo principal acaba
      const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";
      let result;
      try {
        result = await withRetry(() => ai.models.generateContent({ model: targetModel, contents, config }));
      } catch (primaryError: any) {
        const msg = primaryError?.message || String(primaryError);
        const isDaily = /perday|per day|per_day|daily/i.test(msg);
        if (!isDaily || targetModel === FALLBACK_MODEL) throw primaryError;
        console.warn(`[${requestId}] Cota diária de ${targetModel} esgotada. Usando modelo reserva ${FALLBACK_MODEL}.`);
        result = await withRetry(() => ai.models.generateContent({ model: FALLBACK_MODEL, contents, config }));
      }

      let text = result.text || "";
      
      // Clean JSON if it's wrapped in markdown
      if (text.includes("```")) {
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          text = match[1].trim();
        }
      }

      console.log(`[${requestId}] AI Process request completed successfully`);
      res.json({ text });
    } catch (error: any) {
      console.error(`[${requestId}] AI Process Error:`, error);
      const { status, message, raw } = classifyAIError(error);
      res.status(status).json({ error: message, detail: raw.substring(0, 1000) });
    }
  });

  // Mock Internal System API (Simulating the city hall system)
  app.get("/api/internal/contracts", (req, res) => {
    // This simulates the data from the internal system
    const mockInternalContracts = [
      {
        id: "ext-101",
        number: "Nº 101/2026",
        vendor: "Engenharia Urbana S.A.",
        object: "Pavimentação de Vias Públicas",
        validity: "01/04/2026 - 01/04/2027",
        expiryDate: "2027-04-01",
        consumption: "R$ 1.250.000,00",
        status: "vigente"
      },
      {
        id: "ext-102",
        number: "Nº 102/2026",
        vendor: "Saneamento Básico Ltda",
        object: "Manutenção de Redes de Esgoto",
        validity: "15/03/2026 - 15/03/2027",
        expiryDate: "2027-03-15",
        consumption: "R$ 850.000,00",
        status: "vigente"
      }
    ];
    res.json(mockInternalContracts);
  });

  // Sync Endpoint
  app.post("/api/sync-contracts", async (req, res) => {
    try {
      const apiUrl = process.env.INTERNAL_SYSTEM_API_URL;
      const apiKey = process.env.INTERNAL_SYSTEM_API_KEY;
      
      let externalData = [];
      let isDemo = false;

      if (!apiUrl || !apiKey || apiUrl.includes("prefeitura.gov.br") || apiKey.includes("YOUR_API_KEY")) {
        // If keys are missing or still placeholders, use mock data and flag as demo
        isDemo = true;
        externalData = [
          {
            id: "ca-101",
            number: "Nº 101/2026",
            vendor: "Engenharia Urbana S.A.",
            object: "Pavimentação de Vias (via Compra Ágil - Demo)",
            validity: "01/04/2026 - 01/04/2027",
            expiryDate: "2027-04-01",
            consumption: "R$ 1.250.000,00",
            status: "vigente"
          },
          {
            id: "ca-102",
            number: "Nº 102/2026",
            vendor: "Saneamento Básico Ltda",
            object: "Manutenção de Redes (via Compra Ágil - Demo)",
            validity: "15/03/2026 - 15/03/2027",
            expiryDate: "2027-03-15",
            consumption: "R$ 850.000,00",
            status: "vigente"
          }
        ];
      } else {
        // Real integration logic for Grupo Êxito / Compra Ágil
        // In a real scenario, we would call their specific API endpoints
        console.log(`Syncing with Compra Ágil API at: ${apiUrl}`);
        
        externalData = [
          {
            id: "real-ca-101",
            number: "Nº 101/2026",
            vendor: "Engenharia Urbana S.A.",
            object: "Pavimentação de Vias Públicas (Dados Reais)",
            validity: "01/04/2026 - 01/04/2027",
            expiryDate: "2027-04-01",
            consumption: "R$ 1.250.000,00",
            status: "vigente"
          }
        ];
      }

      res.json({ 
        success: true, 
        message: isDemo ? "Modo demonstração ativo." : "Dados sincronizados com sucesso!", 
        data: externalData,
        isDemo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ success: false, message: "Erro ao sincronizar dados." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();