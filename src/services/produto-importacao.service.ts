import ExcelJS from "exceljs";
import { z } from "zod";
import * as produtoService from "./produto.service";

const SUPPORTED_COLUMNS = [
  "codigo",
  "descricao",
  "preco_custo",
  "preco_venda",
  "estoque",
  "estoque_minimo",
  "unidade",
  "codigo_barras",
  "marca",
  "ncm",
  "cest",
  "origem",
  "cst_icms",
  "csosn_icms",
  "cfop_venda",
  "aliquota_icms",
  "aliquota_pis",
  "aliquota_cofins",
  "pis_cst",
  "cofins_cst",
] as const;

type SupportedColumn = typeof SUPPORTED_COLUMNS[number];
type RawRow = Record<string, unknown>;

const headerAliases: Record<string, SupportedColumn> = {
  codigo: "codigo",
  cod: "codigo",
  sku: "codigo",
  descricao: "descricao",
  produto: "descricao",
  nome: "descricao",
  preco_custo: "preco_custo",
  precocusto: "preco_custo",
  custo: "preco_custo",
  preco_venda: "preco_venda",
  precovenda: "preco_venda",
  venda: "preco_venda",
  estoque: "estoque",
  estoque_minimo: "estoque_minimo",
  estoqueminimo: "estoque_minimo",
  unidade: "unidade",
  codigo_barras: "codigo_barras",
  codigobarras: "codigo_barras",
  ean: "codigo_barras",
  marca: "marca",
  ncm: "ncm",
  cest: "cest",
  origem: "origem",
  cst_icms: "cst_icms",
  csticms: "cst_icms",
  csosn_icms: "csosn_icms",
  csosnicms: "csosn_icms",
  cfop_venda: "cfop_venda",
  cfop: "cfop_venda",
  aliquota_icms: "aliquota_icms",
  aliquotaicms: "aliquota_icms",
  aliquota_pis: "aliquota_pis",
  aliquotapis: "aliquota_pis",
  aliquota_cofins: "aliquota_cofins",
  aliquotacofins: "aliquota_cofins",
  pis_cst: "pis_cst",
  piscst: "pis_cst",
  cofins_cst: "cofins_cst",
  cofinscst: "cofins_cst",
};

const importProdutoSchema = z.object({
  codigo: z.string().min(1, "codigo obrigatorio"),
  descricao: z.string().min(1, "descricao obrigatoria"),
  precoCusto: z.number().int().min(0, "preco_custo invalido"),
  precoVenda: z.number().int().min(0, "preco_venda invalido"),
  estoque: z.number().int().default(0),
  estoqueMinimo: z.number().int().default(0),
  unidade: z.string().min(1).default("UN"),
  codigoBarras: z.string().optional(),
  marca: z.string().optional(),
  ncm: z.string().length(8, "ncm deve conter 8 digitos").optional(),
  cest: z.string().length(7, "cest deve conter 7 digitos").optional(),
  origem: z.number().int().min(0).max(8).optional(),
  cstIcms: z.string().max(4).optional(),
  csosnIcms: z.string().max(4).optional(),
  cfopPadraoVenda: z.string().length(4, "cfop_venda deve conter 4 digitos").optional(),
  aliquotaIcms: z.number().int().min(0).optional(),
  aliquotaPis: z.number().int().min(0).optional(),
  aliquotaCofins: z.number().int().min(0).optional(),
  pisCst: z.string().max(2).optional(),
  cofinsCst: z.string().max(2).optional(),
});

export type ProdutoImportInput = z.infer<typeof importProdutoSchema>;

export interface ProdutoImportError {
  linha: number;
  codigo?: string;
  mensagem: string;
}

export interface ProdutoImportResult {
  totalLinhas: number;
  importados: number;
  atualizados: number;
  ignorados: number;
  erros: ProdutoImportError[];
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function optionalText(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function integer(value: unknown, fallback = 0): number {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const parsed = Number(text.replace(",", "."));
  if (!Number.isInteger(parsed)) throw new Error(`valor inteiro invalido: ${text}`);
  return parsed;
}

function decimalToCents(value: unknown): number {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const normalized = text
    .replace(/\s/g, "")
    .replace(/^R\$/i, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`valor monetario invalido: ${text}`);
  return Math.round(parsed * 100);
}

function decimalPercentage(value: unknown): number | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const parsed = Number(text.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`aliquota invalida: ${text}`);
  return Math.round(parsed * 100);
}

function normalizedRow(rawRow: RawRow): ProdutoImportInput {
  const raw: Partial<Record<SupportedColumn, unknown>> = {};
  for (const [header, value] of Object.entries(rawRow)) {
    const column = headerAliases[normalizeHeader(header)];
    if (column) raw[column] = value;
  }

  return importProdutoSchema.parse({
    codigo: optionalText(raw.codigo) || "",
    descricao: optionalText(raw.descricao) || "",
    precoCusto: decimalToCents(raw.preco_custo),
    precoVenda: decimalToCents(raw.preco_venda),
    estoque: integer(raw.estoque),
    estoqueMinimo: integer(raw.estoque_minimo),
    unidade: optionalText(raw.unidade) || "UN",
    codigoBarras: optionalText(raw.codigo_barras),
    marca: optionalText(raw.marca),
    ncm: optionalText(raw.ncm),
    cest: optionalText(raw.cest),
    origem: optionalText(raw.origem) ? integer(raw.origem) : undefined,
    cstIcms: optionalText(raw.cst_icms),
    csosnIcms: optionalText(raw.csosn_icms),
    cfopPadraoVenda: optionalText(raw.cfop_venda),
    aliquotaIcms: decimalPercentage(raw.aliquota_icms),
    aliquotaPis: decimalPercentage(raw.aliquota_pis),
    aliquotaCofins: decimalPercentage(raw.aliquota_cofins),
    pisCst: optionalText(raw.pis_cst),
    cofinsCst: optionalText(raw.cofins_cst),
  });
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

export function parseCsv(buffer: Buffer): RawRow[] {
  const lines = buffer
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) return [];
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

async function parseXlsx(buffer: Buffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) return [];

  const headers = worksheet.getRow(1).values as unknown[];
  const rows: RawRow[] = [];
  for (let index = 2; index <= worksheet.rowCount; index += 1) {
    const values = worksheet.getRow(index).values as unknown[];
    const row = Object.fromEntries(headers.slice(1).map((header, columnIndex) => [String(header ?? ""), values[columnIndex + 1] ?? ""]));
    if (Object.values(row).some((value) => String(value ?? "").trim())) rows.push(row);
  }
  return rows;
}

export async function parseProdutoImportFile(buffer: Buffer, filename: string): Promise<RawRow[]> {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "csv") return parseCsv(buffer);
  if (extension === "xlsx") return parseXlsx(buffer);
  throw new Error("Formato invalido. Envie um arquivo CSV ou XLSX.");
}

export function normalizeProdutoImportRow(row: RawRow): ProdutoImportInput {
  return normalizedRow(row);
}

export async function importProdutos(empresaId: number, buffer: Buffer, filename: string): Promise<ProdutoImportResult> {
  const rows = await parseProdutoImportFile(buffer, filename);
  const result: ProdutoImportResult = {
    totalLinhas: rows.length,
    importados: 0,
    atualizados: 0,
    ignorados: 0,
    erros: [],
  };
  const codes = new Set<string>();

  for (const [index, rawRow] of rows.entries()) {
    const linha = index + 2;
    try {
      const data = normalizedRow(rawRow);
      if (codes.has(data.codigo)) throw new Error("codigo duplicado dentro da planilha");
      codes.add(data.codigo);

      const existing = await produtoService.getByCodigo(empresaId, data.codigo);
      if (existing) {
        await produtoService.update(empresaId, { id: existing.id, ...data });
        result.atualizados += 1;
      } else {
        await produtoService.create(empresaId, data);
        result.importados += 1;
      }
    } catch (error) {
      const mensagem = error instanceof z.ZodError
        ? error.issues.map((issue) => issue.message).join("; ")
        : error instanceof Error ? error.message : "erro desconhecido";
      result.erros.push({ linha, codigo: optionalText(rawRow.codigo), mensagem });
    }
  }

  result.ignorados = result.erros.length;
  return result;
}

export function createProdutoImportTemplateCsv(): string {
  const example = [
    "001",
    "Produto exemplo",
    "10,50",
    "15,90",
    "100",
    "10",
    "UN",
    "7890000000000",
    "Marca exemplo",
    "12345678",
    "",
    "0",
    "",
    "102",
    "5102",
    "0",
    "0",
    "0",
    "49",
    "49",
  ];
  return `\uFEFF${SUPPORTED_COLUMNS.join(";")}\n${example.join(";")}\n`;
}
