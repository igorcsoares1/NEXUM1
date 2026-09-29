// Leitura do relatório "Frota" do SIGA/TCM-BA (PDF), sem IA.
// Layout: blocos "Veículo: Terceiro/Próprio" e "Tipo: Automóvel/Utilitários/...", com as colunas
// Placa · Marca · Renavam · Chassi · Combustível · Ano · N. Fiscal/Contrato · Valor Aquisição · Dt. Aquisição · Dt. Baixa.
// O SIGA não traz o modelo/nome do veículo: ele é digitado na conferência antes de importar.

export interface VeiculoSiga {
  placa: string;
  marca: string;
  renavam: string;
  chassi: string;
  combustivel: string;      // já no formato do NEXUM (flex, gasolina, diesel...)
  ano: string;
  nf_contrato: string;
  valor_aquisicao: number | null;
  data_aquisicao: string | null; // AAAA-MM-DD
  data_baixa: string | null;     // AAAA-MM-DD
  tipo_siga: string;        // como veio do SIGA (ex.: "Utilitários")
  tipo_veiculo: string;     // valor do select do NEXUM (Carro, Caminhonete, Caminhão, Ônibus, Moto, Máquina)
  vinculo_siga: string;     // "Terceiro" / "Próprio"
  tipo_propriedade: 'oficial' | 'locado';
}

export interface FrotaSiga {
  unidade: string;
  emissao: string;
  veiculos: VeiculoSiga[];
  avisos: string[];
}

type Item = { s: string; x: number; y: number; w: number };

const COLUNAS = [
  { k: 'placa', re: /^Placa$/i },
  { k: 'marca', re: /^Marca$/i },
  { k: 'renavam', re: /^Renavam$/i },
  { k: 'chassi', re: /^Chassi$/i },
  { k: 'combustivel', re: /^Combust/i },
  { k: 'ano', re: /^Ano$/i },
  { k: 'nf', re: /Fiscal|Contrato/i },
  { k: 'valor', re: /^Valor/i },
  { k: 'dt_aq', re: /^Dt\.?\s*Aquisi/i },
  { k: 'dt_baixa', re: /^Dt\.?\s*Baixa/i },
] as const;
type Col = typeof COLUNAS[number]['k'];

export const normalizarPlaca = (p: string) => (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function tipoNexum(tipoSiga: string): string {
  const t = tipoSiga.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/moto|lambreta|ciclo/.test(t)) return 'Moto';
  if (/onibus|micro/.test(t)) return 'Ônibus';
  if (/caminhao/.test(t)) return 'Caminhão';
  if (/maquina|trator|retro|patrol/.test(t)) return 'Máquina';
  if (/utilit|caminhonete|van|pick/.test(t)) return 'Caminhonete';
  return 'Carro';
}

export function combustivelNexum(c: string): string {
  const t = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/flex|bicomb/.test(t)) return 'flex';
  if (/diesel/.test(t)) return 'diesel';
  if (/gasolina/.test(t)) return 'gasolina';
  if (/etanol|alcool/.test(t)) return 'etanol';
  if (/gnv|gas natural/.test(t)) return 'gnv';
  if (/eletr/.test(t)) return 'eletrico';
  return t.trim();
}

const data = (s: string) => {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const numero = (s: string) => {
  const t = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(t);
  return t && !isNaN(n) ? n : null;
};

/** Agrupa os itens de texto de uma página em linhas (mesma altura). */
function emLinhas(itens: Item[]): Item[][] {
  const ord = [...itens].sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas: Item[][] = [];
  for (const it of ord) {
    const l = linhas[linhas.length - 1];
    if (l && Math.abs(l[0].y - it.y) <= 3) l.push(it); else linhas.push([it]);
  }
  return linhas.map(l => l.sort((a, b) => a.x - b.x));
}

/** Parte testável: recebe os itens de texto de cada página. */
export function lerFrotaItens(paginas: Item[][]): FrotaSiga {
  const out: FrotaSiga = { unidade: '', emissao: '', veiculos: [], avisos: [] };
  let vinculo = '', tipo = '';
  let inicios: { k: Col; x: number }[] = [];

  for (const pag of paginas) {
    for (const linha of emLinhas(pag.filter(i => i.s.trim()))) {
      const txt = linha.map(i => i.s.trim()).join(' ');
      if (/^Unidade:/i.test(txt)) { out.unidade = txt.replace(/^Unidade:\s*/i, ''); continue; }
      const em = txt.match(/Emiss[ãa]o:\s*(.+)$/i); if (em) { out.emissao = em[1]; continue; }
      const vc = txt.match(/^Ve[íi]culo:\s*(.+)$/i); if (vc) { vinculo = vc[1].trim(); continue; }
      const tp = txt.match(/^Tipo:\s*(.+)$/i); if (tp) { tipo = tp[1].trim(); continue; }

      // cabeçalho: guarda onde começa cada coluna
      if (linha.some(i => /^Placa$/i.test(i.s.trim())) && linha.some(i => /^Marca$/i.test(i.s.trim()))) {
        inicios = [];
        for (const c of COLUNAS) {
          const it = linha.find(i => c.re.test(i.s.trim()));
          if (it) inicios.push({ k: c.k, x: it.x });
        }
        inicios.sort((a, b) => a.x - b.x);
        continue;
      }
      if (!inicios.length || /Total:|P[áa]gina \d+ de|Tribunal de Contas|SIGA - Sistema|^Frota$/i.test(txt)) continue;

      // linha de veículo: cada texto vai para a coluna cujo início fica à esquerda do seu centro
      const cel: Partial<Record<Col, string>> = {};
      for (const it of linha) {
        const centro = it.x + it.w / 2;
        let col: Col = inicios[0].k;
        for (const c of inicios) if (centro >= c.x - 2) col = c.k;
        cel[col] = ((cel[col] || '') + ' ' + it.s.trim()).trim();
      }
      const placa = normalizarPlaca(cel.placa || '');
      if (!placa || placa.length < 6) {
        if (txt.length > 3) out.avisos.push(`Linha ignorada: "${txt}"`);
        continue;
      }
      out.veiculos.push({
        placa,
        marca: (cel.marca || '').replace(/\s+/g, ' '),
        renavam: (cel.renavam || '').replace(/\D/g, ''),
        chassi: (cel.chassi || '').replace(/\s/g, '').toUpperCase(),
        combustivel: combustivelNexum(cel.combustivel || ''),
        ano: (cel.ano || '').match(/\d{4}/)?.[0] || '',
        nf_contrato: cel.nf || '',
        valor_aquisicao: numero(cel.valor || ''),
        data_aquisicao: data(cel.dt_aq || ''),
        data_baixa: data(cel.dt_baixa || ''),
        tipo_siga: tipo,
        tipo_veiculo: tipoNexum(tipo),
        vinculo_siga: vinculo,
        tipo_propriedade: /terceir|locad/i.test(vinculo) ? 'locado' : 'oficial',
      });
    }
  }

  // a mesma placa duas vezes: fica a última ocorrência
  const vistas = new Map<string, VeiculoSiga>();
  for (const v of out.veiculos) {
    if (vistas.has(v.placa)) out.avisos.push(`Placa ${v.placa} aparece mais de uma vez no relatório; foi usada a última.`);
    vistas.set(v.placa, v);
  }
  out.veiculos = [...vistas.values()];
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

/** Lê o PDF "Frota" salvo do SIGA. */
export async function lerFrotaSiga(file: File): Promise<FrotaSiga> {
  const pdfjs = await carregarPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const paginas: Item[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    paginas.push(tc.items.filter((i: any) => i.str !== undefined)
      .map((i: any) => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width })));
  }
  const r = lerFrotaItens(paginas);
  if (!r.veiculos.length) throw new Error('Nenhum veículo encontrado. Confira se é o relatório "Frota" do SIGA em PDF.');
  return r;
}
