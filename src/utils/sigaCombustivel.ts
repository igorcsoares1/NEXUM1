// Leitura do relatório "Consumo Combustível" do SIGA/TCM-BA (PDF), sem IA.
// Colunas: Placa Veículo · Tipo Combustível · Litros Quant. Mês · Valor Mês. Um relatório = uma competência.

export interface ConsumoSiga {
  placa: string;        // como veio (ex.: "nzv1601", "TEA-01", "RETROJCB")
  placaNorm: string;    // maiúsculas, só letras e números (para cruzar com a frota)
  combustivel: string;  // DIESEL, GASOLINA, ETANOL...
  litros: number;
  valor: number;
}

export interface RelatorioConsumoSiga {
  unidade: string;
  emissao: string;
  competencia: string | null; // AAAA-MM
  linhas: ConsumoSiga[];
  totalInformado: number | null; // "Valor Total" do rodapé
  avisos: string[];
}

type Item = { s: string; x: number; y: number };

export const normalizarPlaca = (p: string) => (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Número no padrão brasileiro ("1.250", "8.684,55", "1125"). */
export const numeroBR = (s: string): number => {
  let t = (s || '').replace(/[R$\s]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
};

function emLinhas(itens: Item[]): string[] {
  const ord = [...itens].filter(i => i.s.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas: Item[][] = [];
  for (const it of ord) {
    const l = linhas[linhas.length - 1];
    if (l && Math.abs(l[0].y - it.y) <= 3) l.push(it); else linhas.push([it]);
  }
  return linhas.map(l => l.sort((a, b) => a.x - b.x).map(i => i.s.trim()).join(' ').replace(/\s+/g, ' ').trim());
}

/** Parte testável: recebe o texto de cada página já em linhas. */
export function lerConsumoLinhas(linhasPorPagina: string[][]): RelatorioConsumoSiga {
  const out: RelatorioConsumoSiga = { unidade: '', emissao: '', competencia: null, linhas: [], totalInformado: null, avisos: [] };
  // placa · tipo (uma ou mais palavras) · litros · R$ valor
  const LINHA = /^(\S+)\s+(.+?)\s+([\d.,]+)\s+R\$\s?([\d.,]+)$/i;
  for (const pag of linhasPorPagina) {
    for (const txt of pag) {
      const un = txt.match(/Unidade:\s*(.+)$/i); if (un) { out.unidade = un[1].trim(); continue; }
      const em = txt.match(/Emiss[ãa]o:\s*(\d{2}\/\d{2}\/\d{4}[\s\d:]*)/i); if (em) out.emissao = em[1].trim();
      const cp = txt.match(/Compet[êe]ncia:\s*(\d{2})\/(\d{4})/i); if (cp) {
        const c = `${cp[2]}-${cp[1]}`;
        if (out.competencia && out.competencia !== c) out.avisos.push(`O arquivo tem mais de uma competência (${out.competencia} e ${c}).`);
        out.competencia = out.competencia || c;
        continue;
      }
      const tot = txt.match(/Valor Total\s*R\$\s?([\d.,]+)/i); if (tot) { out.totalInformado = numeroBR(tot[1]); continue; }
      if (/Placa Ve[íi]culo|Tribunal de Contas|SIGA - Sistema|P[áa]gina \d+ de|^Consumo Combust/i.test(txt)) continue;
      const m = txt.match(LINHA);
      if (!m) { if (/R\$/.test(txt)) out.avisos.push(`Linha não reconhecida: "${txt}"`); continue; }
      out.linhas.push({
        placa: m[1],
        placaNorm: normalizarPlaca(m[1]),
        combustivel: m[2].trim().toUpperCase(),
        litros: numeroBR(m[3]),
        valor: numeroBR(m[4]),
      });
    }
  }
  const soma = out.linhas.reduce((a, l) => a + l.valor, 0);
  if (out.totalInformado !== null && Math.abs(soma - out.totalInformado) > 0.05)
    out.avisos.push(`A soma das linhas (R$ ${soma.toFixed(2)}) difere do Valor Total do relatório (R$ ${out.totalInformado.toFixed(2)}). Confira o arquivo.`);
  return out;
}

let pdfjsCache: any = null;
async function carregarPdfjs() {
  if (!pdfjsCache) {
    const pdfjs: any = await import('pdfjs-dist');
    const worker: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    pdfjsCache = pdfjs;
  }
  return pdfjsCache;
}

export async function lerConsumoSiga(file: File): Promise<RelatorioConsumoSiga> {
  const pdfjs = await carregarPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const paginas: string[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    paginas.push(emLinhas(tc.items.filter((i: any) => i.str !== undefined)
      .map((i: any) => ({ s: i.str, x: i.transform[4], y: i.transform[5] }))));
  }
  const r = lerConsumoLinhas(paginas);
  if (!r.linhas.length) throw new Error('Nenhum abastecimento encontrado. Confira se é o relatório "Consumo Combustível" do SIGA em PDF.');
  if (!r.competencia) r.avisos.push('Competência não encontrada no arquivo: escolha o mês antes de importar.');
  return r;
}
