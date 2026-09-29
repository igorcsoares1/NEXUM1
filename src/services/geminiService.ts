import { callAIProxy } from "../lib/ai";

export type ReportInput =
  | { kind: 'pdf'; base64: string; fileName: string }
  | { kind: 'text'; text: string; fileName: string };

// Extrai o JSON mesmo que a IA devolva texto extra ou blocos ```json
const parseJsonSafe = (raw: string) => {
  let t = (raw || '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) t = fence[1].trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last > first) t = t.slice(first, last + 1);
  try {
    return JSON.parse(t);
  } catch {
    throw new Error('A IA retornou uma resposta incompleta. Tente novamente ou envie um arquivo menor (apenas as páginas/abas principais).');
  }
};

export const analyzeDataForReport = async (input: ReportInput) => {
  try {
    const isPdf = input.kind === 'pdf';
    const dataStr = isPdf
      ? '(O documento PDF completo está anexado a esta mensagem. Leia TODAS as páginas.)'
      : input.text;
    
    const prompt = `
      VOCÊ É O ANALISTA DO CONTROLE INTERNO DA PREFEITURA MUNICIPAL DE COARACI-BA, especialista em TCM-BA,
      LRF (LC 101/2000), Lei 4.320/64, Lei 14.133/2021 e Resolução TCM-BA nº 1.120/2005.

      Sua tarefa: ler o arquivo ${isPdf ? 'PDF' : 'Excel'} ("${input.fileName}") e produzir o RELATÓRIO MENSAL DE
      CONTROLE INTERNO COMPLETO, no mesmo padrão do relatório oficial da Controladoria, com 18 seções.
      O arquivo pode ser: balancete, RREO, RGF, exportações do SIGA ou o próprio relatório mensal. Extraia TUDO que existir.

      REGRAS:
      1. Valores monetários SEMPRE como número puro (ex: 8718409.82). Percentuais como número (ex: 72.95).
      2. NUNCA invente valores. Se um dado não existir no arquivo, use null. Se uma seção inteira não tiver dados, use null.
      3. Copie TODAS as linhas das tabelas (todas as secretarias, todos os decretos, todos os contratos e dispensas).
      4. Para cada seção escreva "texto" (2 a 4 parágrafos, linguagem técnica e formal de controle interno, citando os valores
         e a base legal) e "recomendacao" (a "Ação de Correção", objetiva).
      5. ÍNDICES: informe base_calculo, valor_aplicado e o percentual. Refaça as contas: mínimo = base × percentual legal;
         diferença = aplicado − mínimo. Se o arquivo trouxer contas erradas, use as contas CORRETAS e registre a divergência
         em "divergencias".
      6. Seja coerente: um índice com superávit não pode ter recomendação de "não cumprimento", e vice-versa.
      7. Na conclusão, liste de 4 a 8 pontos (urgentes primeiro) e escreva um parecer final de 3 a 5 parágrafos.

      DADOS:
      ${dataStr}

      Responda APENAS com JSON neste esquema:
      {
        "competencia": "YYYY-MM",
        "periodo": "Agosto de 2026",
        "alerta_capa": "frase curta com o principal risco do mês",
        "resumo_geral": {
          "receita_arrecadada": number, "despesa_empenhada": number, "despesa_liquidada": number,
          "despesa_paga": number, "restos_a_pagar_processados": number, "indice_pessoal": number
        },
        "processos": {
          "liquidados_qtd": number, "liquidados_valor": number, "pagos_qtd": number, "pagos_valor": number,
          "por_secretaria": [ { "nome": "string", "liq_qtd": number, "liq_valor": number, "pag_qtd": number, "pag_valor": number } ],
          "texto": "string"
        },
        "execucao_orcamentaria": {
          "texto": "string",
          "creditos_adicionais": [ { "data": "dd/mm/aaaa", "lei": "string", "decreto": "string", "suplementares": number,
            "especiais": number, "superavit": number, "anulacao": number, "excesso": number } ],
          "loa_total": number, "legislativo": number, "executivo": number,
          "max_disponivel_acumulado": number, "max_autorizado_anual": number, "suplementar_acumulado": number,
          "recomendacao": "string"
        },
        "pessoal": { "indice": number, "valor": number, "rcl": number,
          "situacao": "regular|alerta|prudencial|acima_limite", "texto": "string", "recomendacao": "string" },
        "patrimonio": { "valor_incorporado": number, "texto": "string", "recomendacao": "string" },
        "almoxarifado": { "texto": "string", "recomendacao": "string" },
        "combustivel": { "valor": number, "litros": number, "texto": "string", "recomendacao": "string" },
        "licitacoes": {
          "texto": "string",
          "contratos": [ { "numero": "string", "fornecedor": "string", "cnpj": "string", "procedimento": "string", "valor": number, "publicacao": "string" } ],
          "dispensas": [ { "processo": "string", "fundamentacao": "string", "fornecedor": "string", "valor": number, "publicacao": "string" } ],
          "homologadas": [ { "processo": "string", "modalidade": "string", "valor_estimado": number, "publicacao": "string" } ],
          "recomendacao": "string"
        },
        "operacoes_credito": { "texto": "string" },
        "fundeb_receitas": { "impostos": number, "vaaf": number, "vaat": number, "vaar": number },
        "indices_constitucionais": [
          { "id": "mde", "nome": "Educação – MDE (art. 212 CF)", "percentual_minimo": 25, "base_calculo": number, "valor_aplicado": number, "percentual_aplicado": number, "texto": "string", "recomendacao": "string" },
          { "id": "fundeb70", "nome": "FUNDEB 70% – Profissionais do Magistério", "percentual_minimo": 70, "base_calculo": number, "valor_aplicado": number, "percentual_aplicado": number, "texto": "string", "recomendacao": "string" },
          { "id": "vaat50", "nome": "VAAT 50% – Educação Infantil", "percentual_minimo": 50, "base_calculo": number, "valor_aplicado": number, "percentual_aplicado": number, "texto": "string", "recomendacao": "string" },
          { "id": "vaat15", "nome": "VAAT 15% – Despesas de Capital", "percentual_minimo": 15, "base_calculo": number, "valor_aplicado": number, "percentual_aplicado": number, "texto": "string", "recomendacao": "string" },
          { "id": "saude", "nome": "Saúde – ASPS (art. 77 ADCT)", "percentual_minimo": 15, "base_calculo": number, "valor_aplicado": number, "percentual_aplicado": number, "texto": "string", "recomendacao": "string" }
        ],
        "despesa_categoria": {
          "linhas": [ { "nome": "string", "nivel": 1, "dotacao": number, "mes": number, "acumulado": number } ],
          "total_dotacao": number, "total_mes": number, "total_acumulado": number, "texto": "string"
        },
        "receita": { "arrecadada_liquida": number, "correntes": number, "transferencias_correntes": number,
          "impostos_taxas": number, "contribuicoes": number, "patrimonial": number, "texto": "string" },
        "duodecimo": { "valor_repassado": number, "valor_previsto": number, "texto": "string" },
        "precatorios": { "valor": number, "texto": "string" },
        "diarias": { "valor": number, "texto": "string" },
        "divergencias": [ { "secao": "string", "descricao": "string" } ],
        "conclusoes": [ { "tipo": "financeiro|legal|operacional", "nivel": "urgente|atencao|informativo", "titulo": "string", "texto": "string" } ],
        "parecer_final": "string"
      }
      Em despesa_categoria.linhas use nivel 1 para grupos (Despesas Correntes, Despesas de Capital, Reserva de Contingência)
      e nivel 2 para os subitens.
    `;

    const parts: any[] = [];
    if (input.kind === 'pdf') {
      // O Gemini lê PDF nativamente (inclusive tabelas e PDFs escaneados)
      parts.push({ inlineData: { mimeType: 'application/pdf', data: input.base64 } });
    }
    parts.push({ text: prompt });

    const text = await callAIProxy([{ role: 'user', parts }], {
      responseMimeType: "application/json",
      maxOutputTokens: 32768
    }, "gemini-3.8-flash");

    const report = parseJsonSafe(text);
    if (!report || (!report.periodo && !report.resumo_geral && !report.processos)) {
      throw new Error('A IA não conseguiu identificar dados contábeis neste arquivo. Verifique se é o balancete/relatório correto.');
    }
    if (!report.competencia) {
      const now = new Date();
      report.competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    if (!report.periodo) report.periodo = report.competencia;
    return report;
  } catch (error) {
    console.error("Erro ao analisar dados com Gemini:", error);
    throw error;
  }
};