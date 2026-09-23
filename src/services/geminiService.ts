import { callAIProxy } from "../lib/ai";

export const analyzeDataForReport = async (input: any, isPdf: boolean = false) => {
  try {
    const dataStr = isPdf ? input : JSON.stringify(input, null, 2);
    
    const prompt = `
      VOCÊ É UM ANALISTA DE CONTROLE INTERNO ESPECIALIZADO EM GESTÃO MUNICIPAL (TCM-BA).
      Sua tarefa é extrair com PRECISÃO ABSOLUTA os dados de um arquivo ${isPdf ? 'PDF' : 'Excel'} da Prefeitura de Coaraci-BA.

      REGRAS DE OURO PARA EXTRAÇÃO E ANÁLISE:
      1. PERÍODO: Identifique o mês e ano de referência exatos. Ex: "Março de 2026". Use o formato "YYYY-MM" para o campo de competência.
      2. VALORES MONETÁRIOS: Extraia como NÚMEROS. Trate abreviações (M, K).
      3. DETALHAMENTO DE RECEITAS:
         - Receitas Correntes: FPM, ICMS, IPVA, ITR, Receita de Impostos (IPTU, ISS, ITBI, IRRF).
         - Receitas de Transferências: FUNDEB, SUS (Atenção Primária, Vigilância, etc), FNAS (Assistência).
      4. DETALHAMENTO DE DESPESAS:
         - Divida por Elemento: Vencimentos, Obrigações Patronais, Material de Consumo, Serviços de Terceiros (PF e PJ), Obras.
         - Divida por Função: Administração, Saúde, Educação, Urbanismo, Assistência Social.
      5. LIMITES LEGAIS (CONSTITUCIONAIS E LRF):
         - Pessoal (LRF): Limite 54%. Calcular índice do mês e projetar acumulado 12m.
         - Saúde (ADCT): Mínimo 15%.
         - Educação (MDE): Mínimo 25%.
         - FUNDEB 70%: Magistério.
         - VAAT: Mínimo 15% em Capital e 50% em Educação Infantil.
      6. ALERTAS ESPECÍFICOS TCM-BA: Verifique se há indícios de fragmentação de despesas, excesso de contratações temporárias, ou baixa aplicação em capital.
      7. CONSISTÊNCIA DE DADOS (MANDATÓRIO): TODAS as seções do relatório DEVEM conversar entre si.
         - Os números TOTAIS do Resumo Geral DEVEM ser o somatório exato do detalhamento por Secretarias/Funções ou do detalhamento de Receitas.
         - A Receita Corrente Líquida informada deve servir de base de cálculo idêntica para todas as abas que a utilizam.
         - O Relatório tem uma natureza coesa! Um erro matemático quebra a confiança. Faça cálculos internos antes de gerar o JSON.

      DADOS EXTRAÍDOS PARA ANÁLISE:
      ${dataStr}
      
      Gere um relatório detalhado APENAS em JSON seguindo este esquema:
      {
        "competencia": "YYYY-MM",
        "periodo": "string",
        "resumo_geral": {
          "receita_corrente_liquida": number,
          "despesa_total_empenhada": number,
          "despesa_total_liquidada": number,
          "despesa_total_paga": number,
          "resultado_orcamentario": number,
          "restos_a_pagar_pagos": number
        },
        "detalhamento_receitas": {
          "proprias": { "iptu": number, "iss": number, "itbi": number, "irrf": number, "taxas": number },
          "transferencias": { "fpm": number, "icms": number, "ipva": number, "fundeb": number, "sus": number, "fnas": number }
        },
        "detalhamento_pessoal": {
          "indice_mes": "string",
          "indice_12m": "string",
          "valor_liquido_pessoal": number,
          "rcl_ajustada": number,
          "alerta_lrf": "string (normal/alerta/prudencial/critico)"
        },
        "indices_constitucionais": [
          { "nome": "Saúde (15%)", "minimo": "15%", "aplicado": "string", "valor": number, "status": "ok|critico" },
          { "nome": "Educação (25%)", "minimo": "25%", "aplicado": "string", "valor": number, "status": "ok|critico" },
          { "nome": "FUNDEB (70%)", "minimo": "70%", "aplicado": "string", "valor": number, "status": "ok|critico" },
          { "nome": "VAAT Capital (15%)", "minimo": "15%", "aplicado": "string", "valor": number, "status": "ok|critico" }
        ],
        "despesas_por_secretaria": [
          { "nome": "string", "empenhado": number, "liquidado": number, "pago": number, "percentual": "string" }
        ],
        "top_fornecedores": [
          { "nome": "string", "valor": number, "objeto_resumido": "string" }
        ],
        "conclusoes_tecnicas": [
          { "tipo": "financeiro|legal|operacional", "nivel": "urgente|normal|informativo", "titulo": "string", "texto": "string" }
        ],
        "alerta_capa": "string"
      }
    `;

    const text = await callAIProxy([{ role: 'user', parts: [{ text: prompt }] }], {
      responseMimeType: "application/json"
    }, "gemini-1.5-flash");
    
    return JSON.parse(text || "{}");
  } catch (error) {
    console.error("Erro ao analisar dados com Gemini:", error);
    throw error;
  }
};
