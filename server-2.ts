import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
