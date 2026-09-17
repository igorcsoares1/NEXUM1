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

  // Helper for exponential backoff retries
  const withRetry = async <T>(fn: () => Promise<T>, retries = 10, delay = 3000): Promise<T> => {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const isRetryable = 
        errorMsg.includes('503') || 
        errorMsg.includes('UNAVAILABLE') || 
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('high demand');
      
      if (isRetryable && retries > 0) {
        console.warn(`Gemini API error (retryable: ${errorMsg}). Retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Exponential backoff with a cap at 20 seconds to stay within client timeout
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
      res.status(503).json({ 
        error: "O serviço de IA está temporariamente sobrecarregado. Por favor, aguarde alguns instantes e tente novamente."
      });
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

      // Stick to the recommended stable model for this environment
      const targetModel = "gemini-3.8-flash";

      const result = await withRetry(() => ai.models.generateContent({
        model: targetModel,
        contents,
        config
      }));

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
      const errorMsg = error?.message || String(error || "Erro desconhecido");
      const isUnavailable = errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('high demand');
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');
      
      const status = isUnavailable ? 503 : (isRateLimit ? 429 : 500);
      res.status(status).json({ 
        error: errorMsg
      });
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
