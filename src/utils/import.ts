import React from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { supabase } from '../lib/supabase';
import { User, Contract } from '../types';
import { PDFDocument } from 'pdf-lib';
import { callAIProxy } from '../lib/ai';

const safeJsonParse = (text: string, fallback: any = []): any => {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from markdown or find the first/last brackets
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try { return JSON.parse(codeBlockMatch[1]); } catch(e) {}
    }
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try { return JSON.parse(text.substring(firstBracket, lastBracket + 1)); } catch(e) {}
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch(e) {}
    }
    console.error("Falha ao parsear JSON da IA:", text);
    return fallback;
  }
};

const chunkPdfBase64 = async (arrayBuffer: ArrayBuffer, pagesPerBatch: number = 2): Promise<{ base64: string, startPage: number, endPage: number }[]> => {
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();
  const chunks: { base64: string, startPage: number, endPage: number }[] = [];

  for (let startPage = 0; startPage < totalPages; startPage += pagesPerBatch) {
    const endPage = Math.min(startPage + pagesPerBatch, totalPages);
    const newPdf = await PDFDocument.create();
    const pageIndices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    const base64Data = await newPdf.saveAsBase64();
    chunks.push({ base64: base64Data, startPage: startPage + 1, endPage });
  }
  return chunks;
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (ev) => resolve(ev.target?.result as ArrayBuffer || new ArrayBuffer(0));
    r.onerror = (err) => reject(err);
    r.readAsArrayBuffer(file);
  });
};

export const handleImportFile = async (
  e: React.ChangeEvent<HTMLInputElement>,
  setIsImporting: (val: boolean) => void,
  addNotification: (title: string, message: string, type: any) => void,
  currentUser: User,
  contracts: Contract[]
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsImporting(true);

  try {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const processBatch = async (batchData: any, batchInfo: string, retries = 5): Promise<any[]> => {
        const prompt = `Extraia os dados de contratos deste lote de dados (${batchInfo}). 
        Deve extrair TODOS os contratos encontrados, sem pular ou resumir nenhum.
        Seja preciso nas informações financeiras e de vigência.`;

        const contents = [
          {
            role: 'user',
            parts: [
              { text: prompt },
              typeof batchData === 'string' ? { text: batchData } : batchData
            ]
          }
        ];

        try {
          const text = await callAIProxy(contents, {
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              description: "Array of extracted contracts",
              items: {
                type: "OBJECT",
                properties: {
                  number: { type: "STRING", description: "Número do contrato" },
                  vendor: { type: "STRING", description: "Fornecedor ou Contratado" },
                  object: { type: "STRING", description: "Objeto do contrato" },
                  validity: { type: "STRING", description: "Vigência do contrato" },
                  expiryDate: { type: "STRING", description: "Data de expiração no formato YYYY-MM-DD" },
                  consumption: { type: "STRING", description: "Valor financeiro (ex: R$ 100.000,00)" },
                  totalValue: { type: "STRING", description: "Valor total do contrato (ex: R$ 100.000,00)" },
                  status: { type: "STRING", description: "Deve ser exatamente: vencido, vigente, atencao ou vencendo", enum: ["vencido", "vigente", "atencao", "vencendo"] }
                },
                required: ["number", "vendor", "object", "validity", "expiryDate", "consumption", "totalValue", "status"]
              }
            },
            temperature: 0.1,
          }, "gemini-2.0-flash");

          return safeJsonParse(text);
        } catch (error: any) {
          if ((error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) && retries > 0) {
            console.warn(`Rate limit hit for ${batchInfo}. Retrying in 15 seconds... (${retries} retries left)`);
            await delay(15000);
            return processBatch(batchData, batchInfo, retries - 1);
          }
          if (error?.message?.includes('INVALID_ARGUMENT') || error?.message?.includes('exceeds')) {
             console.error("Token limit exceeded for batch", batchInfo);
             // Skip batch if too large instead of crashing the whole import
             return [];
          }
          throw error;
        }
      };

      let allExtractedContracts: any[] = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const data = await readFileAsDataURL(file);
        const base64 = data.split(',')[1];
        const workbook = XLSX.read(base64, { type: 'base64' });
        
        let json: any[] = [];
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          json = json.concat(sheetJson);
        });
        
        const batchSize = 25; // Reduzido de 40 para 25 para evitar limite de output ou token exceed
        const totalBatches = Math.ceil(json.length / batchSize);
        
        for (let i = 0; i < totalBatches; i++) {
          const start = i * batchSize;
          const end = Math.min(start + batchSize, json.length);
          const chunk = json.slice(start, end);
          const batchResults = await processBatch(JSON.stringify(chunk), `Lote ${i+1}/${totalBatches}`);
          allExtractedContracts = [...allExtractedContracts, ...batchResults];
          if (i < totalBatches - 1) await delay(5000);
        }
    } else if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const pdfChunks = await chunkPdfBase64(arrayBuffer, 3);
      
      for (let i = 0; i < pdfChunks.length; i++) {
        const chunk = pdfChunks[i];
        const batchResults = await processBatch({
          inlineData: {
            mimeType: "application/pdf",
            data: chunk.base64
          }
        }, `Páginas PDF ${chunk.startPage}-${chunk.endPage}`);
        allExtractedContracts = [...allExtractedContracts, ...batchResults];
        if (i < pdfChunks.length - 1) await delay(5000);
      }
    } else {
      throw new Error("Formato de arquivo não suportado. Use CSV, Excel ou PDF.");
    }

    if (allExtractedContracts.length > 0) {
      const contractsToUpsert = allExtractedContracts.map(contract => {
        const existing = contracts.find(c => c.number === contract.number);
        const newObj = {
          ...contract,
          prefeituraId: currentUser?.prefeituraId || '1'
        };
        if (existing) {
          newObj.id = existing.id;
        } else {
          delete newObj.id;
        }
        return newObj;
      });

      const { error } = await supabase
        .from('contracts')
        .upsert(contractsToUpsert);

      if (error) throw error;
      addNotification("Sucesso", `${allExtractedContracts.length} contratos importados com sucesso!`, "success");
    } else {
      throw new Error("A IA não conseguiu estruturar/entender contratos neste arquivo.");
    }
  } catch (error: any) {
    console.error("Erro na importação:", error);
    addNotification("Erro na Importação", error.message || "Erro ao processar arquivo.", "error");
  } finally {
    setIsImporting(false);
    if (e.target) e.target.value = '';
  }
};

export const handleImportFuel = async (
  e: React.ChangeEvent<HTMLInputElement>,
  setIsImporting: (val: boolean) => void,
  addNotification: (title: string, message: string, type: any) => void,
  currentUser: User
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsImporting(true);

  try {
    const data = await readFileAsDataURL(file);
    const base64 = data.split(',')[1];
    const workbook = XLSX.read(base64, { type: 'base64' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    console.log("Total linhas: " + json.length);
    console.log("Colunas: " + Object.keys(json[0] || {}).join(", "));

    const records: any[] = [];
    const today = new Date().toISOString().split('T')[0];
    const prefId = currentUser?.prefeituraId || '1';

    for (let i = 0; i < json.length; i++) {
      const row = json[i];

      // BLOCO 1
      const veh1 = row['VEICULO'] ? String(row['VEICULO']).trim() : '';
      const lit1 = row['TOTAL LITROS'] ? String(row['TOTAL LITROS']).trim() : '';
      const pre1 = row['R$/LITRO'] ? String(row['R$/LITRO']).trim() : '';
      const com1 = row['COMBUSTIVEL'] ? String(row['COMBUSTIVEL']).trim() : '';
      const tot1 = row['R$ TOTAL'] ? String(row['R$ TOTAL']).trim() : '';

      if (veh1 && lit1 && !veh1.toLowerCase().includes('total')) {
        const rec = parseRecord(veh1, lit1, pre1, com1, tot1, today, prefId);
        if (rec) records.push(rec);
      }

      // BLOCO 2
      const veh2 = row['VEICULO .1'] ? String(row['VEICULO .1']).trim() : '';
      const lit2 = row['TOTAL LITROS.1'] ? String(row['TOTAL LITROS.1']).trim() : '';
      const pre2 = row['R$/LITRO.1'] ? String(row['R$/LITRO.1']).trim() : '';
      const com2 = row['COMBUSTIVEL'] ? String(row['COMBUSTIVEL']).trim() : '';
      const tot2 = row['R$ TOTAL.1'] ? String(row['R$ TOTAL.1']).trim() : '';

      if (veh2 && lit2 && !veh2.toLowerCase().includes('total')) {
        const rec = parseRecord(veh2, lit2, pre2, com2, tot2, today, prefId);
        if (rec) records.push(rec);
      }
    }

    console.log("Registros extraidos: " + records.length);

    if (records.length === 0) {
      throw new Error("Nenhum registro encontrado na planilha");
    }

    const result = await supabase.from('fuelRecords').insert(records);
    if (result.error) throw result.error;

    addNotification(
      "Sucesso",
      records.length + " registros importados!",
      "success"
    );

  } catch (error: any) {
    console.error("Erro: " + error.message);
    addNotification(
      "Erro",
      error.message || "Falha na importacao",
      "error"
    );
  } finally {
    setIsImporting(false);
    if (e.target) e.target.value = '';
  }
};

function parseRecord(vehicle: string, quantity: string, unitPrice: string, fuelType: string, cost: string, date: string, prefId: string): any {
  if (!vehicle || !quantity) return null;
  vehicle = String(vehicle).trim();
  if (vehicle.toLowerCase().includes('total') || vehicle === '') return null;

  let plate = '';
  const m = vehicle.match(/\(([A-Z0-9-]+)\)/);
  if (m) plate = m[1];

  const qty = parseFloat(String(quantity).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  const uPrice = parseFloat(String(unitPrice).replace(/R\$\s*/i, '').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  const tot = parseFloat(String(cost).replace(/R\$\s*/i, '').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  const fuel = String(fuelType).toLowerCase().includes('gasolina') ? 'GASOLINA' : 'DIESEL';

  return {
    prefeituraId: prefId,
    vehicle: vehicle,
    plate: plate,
    driver: '',
    date: date,
    quantity: qty.toString(),
    cost: tot > 0 ? 'R$ ' + tot.toFixed(2) : '',
    fuelType: fuel,
    unitPrice: uPrice > 0 ? 'R$ ' + uPrice.toFixed(2) : '',
    status: 'concluido',
    official: '',
    renavam: '',
    yearModel: '',
    kmPerLiter: '',
    kmReading: '',
    createdAt: new Date().toISOString()
  };
}



export const handleSmartImport = async (
  file: File,
  setIsImporting: (val: boolean) => void,
  addNotification: (title: string, message: string, type: any) => void,
  currentUser: User,
  contracts: Contract[]
) => {
  setIsImporting(true);

  try {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 1. Classificar o arquivo
    let parts: any[] = [];
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sampleText = XLSX.utils.sheet_to_csv(firstSheet).substring(0, 2000);
      parts = [
        { text: `Analise o seguinte trecho de um arquivo e determine qual é o tipo de dado predominante.
        Responda APENAS com uma das palavras: "CONTRATOS", "COMBUSTIVEL", "DIARIAS", "CHECKLIST" ou "DESCONHECIDO".
        
        Trecho:
        ${sampleText}` }
      ];
    } else if (fileName.endsWith('.pdf')) {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const pdfChunks = await chunkPdfBase64(arrayBuffer, 3);
      if (pdfChunks.length === 0) throw new Error("PDF vazio ou inválido.");
      const base64Data = pdfChunks[0].base64;
      
      parts = [
        { text: `Identifique qual o tipo de documento é este arquivo PDF fornecido. 
        Responda APENAS com uma das seguintes palavras de acordo com o conteúdo: "CONTRATOS", "COMBUSTIVEL", "DIARIAS", "CHECKLIST" ou "DESCONHECIDO".` },
        { inlineData: { mimeType: "application/pdf", data: base64Data } }
      ];
    } else {
      throw new Error("Formato não suportado para classificação inteligente.");
    }

    const typeResponse = await callAIProxy([{ role: 'user', parts }]);
    const type = typeResponse.trim().toUpperCase();

    addNotification("IA Identificou o Arquivo", `Tipo detectado: ${type}. Iniciando extração automatizada...`, "info");

    // 2. Processar baseado no tipo
    if (type.includes("CONTRATOS")) {
      const mockEvent = { target: { files: [file], value: '' } } as any;
      await handleImportFile(mockEvent, setIsImporting, addNotification, currentUser, contracts);
    } else if (type.includes("COMBUSTIVEL")) {
      const mockEvent = { target: { files: [file], value: '' } } as any;
      await handleImportFuel(mockEvent, setIsImporting, addNotification, currentUser);
    } else if (type.includes("DIARIAS")) {
      await extractAndSave(file, "DIARIAS", currentUser, addNotification, setIsImporting);
    } else if (type.includes("CHECKLIST")) {
      await extractAndSave(file, "CHECKLIST", currentUser, addNotification, setIsImporting);
    } else {
      throw new Error("Não foi possível identificar o tipo de dado deste arquivo automaticamente.");
    }

  } catch (error: any) {
    console.error("Erro no Smart Import:", error);
    addNotification("Erro no Smart Import", error.message || "Falha ao processar arquivo.", "error");
  } finally {
    setIsImporting(false);
  }
};

async function extractAndSave(
  file: File, 
  type: string, 
  currentUser: User, 
  addNotification: any,
  setIsImporting: any
) {
  addNotification("Automação em Andamento", `Extraindo dados de ${type}...`, "info");
  
  try {
    const fileName = file.name.toLowerCase();
    let allExtractedData: any[] = [];

    if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const data = await readFileAsDataURL(file);
      const base64 = data.split(',')[1];
      const workbook = XLSX.read(base64, { type: 'base64' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = JSON.stringify(XLSX.utils.sheet_to_json(worksheet));
      
      const promptText = type === "DIARIAS" ? `
      Analise o seguinte texto extraído de um documento e extraia uma lista de registros de DIÁRIAS.
      Retorne um ARRAY JSON de objetos com estes campos:
      - servidor: nome do servidor
      - destination: destino da viagem
      - period: período ou data
      - value: valor da diária (ex: "R$ 150,00")
      - status: "concluido", "pendente" ou "em andamento"
      - description: motivo da viagem
      
      Texto:
      ${rawData.substring(0, 15000)}
    ` : `
      Analise o seguinte texto extraído de um documento e extraia uma lista de registros de CHECKLIST de veículos.
      Retorne um ARRAY JSON de objetos com estes campos:
      - vehicle: nome/modelo do veículo
      - plate: placa
      - driver: motorista
      - submissionDate: data (YYYY-MM-DD)
      - status: "concluido", "pendente" ou "em andamento"
      - items: um array de objetos { name: string, status: 'ok' | 'issue' | 'na' }
      
      Texto:
      ${rawData.substring(0, 15000)}
    `;
      const text = await callAIProxy([{ role: 'user', parts: [{ text: promptText }] }], { responseMimeType: "application/json" }, "gemini-2.0-flash");
      allExtractedData = safeJsonParse(text);

    } else if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const pdfChunks = await chunkPdfBase64(arrayBuffer, 3);
      
      const promptText = type === "DIARIAS" ? `
      Analise o documento PDF fornecido e extraia uma lista de registros de DIÁRIAS.
      Retorne EXCLUSIVAMENTE um ARRAY JSON de objetos com estes campos precisos:
      - servidor: nome do servidor
      - destination: destino da viagem
      - period: período ou data
      - value: valor da diária (ex: "R$ 150,00")
      - status: "concluido", "pendente" ou "em andamento"
      - description: motivo da viagem
    ` : `
      Analise o documento PDF fornecido e extraia uma lista de registros de CHECKLIST de veículos.
      Retorne EXCLUSIVAMENTE um ARRAY JSON de objetos com estes campos precisos:
      - vehicle: nome/modelo do veículo
      - plate: placa
      - driver: motorista
      - submissionDate: data (YYYY-MM-DD)
      - status: "concluido", "pendente" ou "em andamento"
      - items: um array de objetos { name: string, status: 'ok' | 'issue' | 'na' }
    `;
    
      for (let i = 0; i < pdfChunks.length; i++) {
        const chunk = pdfChunks[i];
        const parts = [
          { text: promptText },
          { inlineData: { mimeType: "application/pdf", data: chunk.base64 } }
        ];
        
        const text = await callAIProxy([{ role: 'user', parts }], { responseMimeType: "application/json" }, "gemini-2.0-flash");
        
        const extractedChunkData = safeJsonParse(text);
        allExtractedData = [...allExtractedData, ...extractedChunkData];
        if (i < pdfChunks.length - 1) await new Promise(r => setTimeout(r, 5000));
      }
    } else {
      throw new Error("Formato não suportado para extração.");
    }

    if (type === "DIARIAS") {
      const { error } = await supabase.from('dailyRecords').insert(
        allExtractedData.map((d: any) => ({
          ...d,
          prefeituraId: currentUser.prefeituraId || '1',
          createdAt: new Date().toISOString()
        }))
      );
      if (error) throw error;
      addNotification("Sucesso", `${allExtractedData.length} diárias importadas com sucesso!`, "success");
    } else {
      const { error } = await supabase.from('checklistRecords').insert(
        allExtractedData.map((c: any) => ({
          ...c,
          prefeituraId: currentUser.prefeituraId || '1',
          createdAt: new Date().toISOString()
        }))
      );
      if (error) throw error;
      addNotification("Sucesso", `${allExtractedData.length} checklists importados com sucesso!`, "success");
    }

  } catch (error: any) {
    console.error(`Erro na extração de ${type}:`, error);
    addNotification("Erro na Extração", `Falha ao processar ${type}: ${error.message}`, "error");
  }
}