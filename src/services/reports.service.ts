import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { departamentos, produtos } from "../../drizzle/schema";
import { getDb } from "../libs/db";
import type { ReportFilterInput, ReportQueryInput } from "../zod/report.schema";

export type ReportColumnType = "text" | "number" | "currency" | "date" | "datetime" | "boolean";

export type ReportColumn = {
  field: string;
  label: string;
  type: ReportColumnType;
  defaultVisible?: boolean;
  total?: "sum" | "count";
};

export type ReportFilterDefinition = {
  field: string;
  label: string;
  type: "text" | "select" | "number" | "date" | "boolean";
  operators: string[];
};

export type ReportDefinition = {
  key: string;
  title: string;
  description: string;
  defaultSort: { field: string; direction: "asc" | "desc" }[];
  filters: ReportFilterDefinition[];
  columns: ReportColumn[];
};

export type ReportRow = Record<string, unknown>;

export type ReportQueryResult = {
  report: ReportDefinition;
  rows: ReportRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  totals: Record<string, number>;
};

const reportsCatalog: ReportDefinition[] = [
  {
    key: "relacao-produtos",
    title: "Relacao de Produtos",
    description: "Listagem geral de produtos cadastrados com filtros e exportacao Excel.",
    defaultSort: [{ field: "codigo", direction: "asc" }],
    filters: [
      { field: "search", label: "Buscar", type: "text", operators: ["contains"] },
      { field: "marca", label: "Marca", type: "text", operators: ["contains", "equals"] },
      { field: "departamentoId", label: "Departamento", type: "number", operators: ["equals"] },
      { field: "ativo", label: "Ativo", type: "boolean", operators: ["equals"] },
    ],
    columns: [
      { field: "codigo", label: "Codigo", type: "text", defaultVisible: true },
      { field: "codigoBarras", label: "Codigo de Barras", type: "text" },
      { field: "descricao", label: "Descricao", type: "text", defaultVisible: true },
      { field: "marca", label: "Marca", type: "text", defaultVisible: true },
      { field: "departamentoNome", label: "Departamento", type: "text", defaultVisible: true },
      { field: "unidade", label: "Unidade", type: "text", defaultVisible: true },
      { field: "precoVenda", label: "Preco Venda", type: "currency", defaultVisible: true, total: "sum" },
      { field: "precoCusto", label: "Preco Custo", type: "currency" },
      { field: "estoque", label: "Estoque", type: "number", defaultVisible: true, total: "sum" },
      { field: "estoqueMinimo", label: "Estoque Minimo", type: "number" },
      { field: "ativo", label: "Ativo", type: "boolean", defaultVisible: true },
      { field: "createdAt", label: "Criado em", type: "datetime" },
      { field: "updatedAt", label: "Atualizado em", type: "datetime" },
    ],
  },
];

const productSortableFields = {
  codigo: produtos.codigo,
  descricao: produtos.descricao,
  marca: produtos.marca,
  unidade: produtos.unidade,
  precoVenda: produtos.precoVenda,
  precoCusto: produtos.precoCusto,
  estoque: produtos.estoque,
  estoqueMinimo: produtos.estoqueMinimo,
  ativo: produtos.ativo,
  createdAt: produtos.createdAt,
  updatedAt: produtos.updatedAt,
  departamentoNome: departamentos.nome,
} as const;

export function getReportsCatalog() {
  return reportsCatalog;
}

export function getReportDefinition(reportKey: string) {
  return reportsCatalog.find((report) => report.key === reportKey);
}

export function getVisibleColumns(report: ReportDefinition, requestedColumns: string[]) {
  if (requestedColumns.length === 0) {
    return report.columns.filter((column) => column.defaultVisible);
  }

  const allowed = new Set(report.columns.map((column) => column.field));
  return requestedColumns.filter((field) => allowed.has(field)).map((field) => report.columns.find((column) => column.field === field)!);
}

export async function queryReport(empresaId: number, reportKey: string, input: ReportQueryInput): Promise<ReportQueryResult> {
  const report = getReportDefinition(reportKey);
  if (!report) {
    throw new Error(`Relatorio '${reportKey}' nao encontrado`);
  }

  if (reportKey === "relacao-produtos") {
    return queryProductsReport(empresaId, report, input);
  }

  throw new Error(`Relatorio '${reportKey}' ainda nao implementado`);
}

export async function queryAllReportRows(
  empresaId: number,
  reportKey: string,
  input: Omit<ReportQueryInput, "page" | "pageSize">,
  maxRows = 50000
) {
  const pageSize = Math.min(500, maxRows);
  const allRows: ReportRow[] = [];
  let page = 1;
  let totalRows = 0;

  while (allRows.length < maxRows) {
    const result = await queryReport(empresaId, reportKey, { ...input, page, pageSize });
    totalRows = result.totalRows;
    allRows.push(...result.rows);

    if (page >= result.totalPages || result.rows.length === 0) break;
    page += 1;
  }

  return {
    report: getReportDefinition(reportKey)!,
    rows: allRows,
    totalRows,
    truncated: totalRows > allRows.length,
  };
}

async function queryProductsReport(empresaId: number, report: ReportDefinition, input: ReportQueryInput): Promise<ReportQueryResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const whereClause = buildProductsWhereClause(empresaId, input.filters);
  const orderBy = buildProductsOrderBy(input.sort.length > 0 ? input.sort : report.defaultSort);
  const offset = (input.page - 1) * input.pageSize;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(produtos)
    .leftJoin(departamentos, eq(produtos.departamentoId, departamentos.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: produtos.id,
      codigo: produtos.codigo,
      codigoBarras: produtos.codigoBarras,
      descricao: produtos.descricao,
      marca: produtos.marca,
      departamentoNome: departamentos.nome,
      unidade: produtos.unidade,
      precoVenda: produtos.precoVenda,
      precoCusto: produtos.precoCusto,
      estoque: produtos.estoque,
      estoqueMinimo: produtos.estoqueMinimo,
      ativo: produtos.ativo,
      createdAt: produtos.createdAt,
      updatedAt: produtos.updatedAt,
    })
    .from(produtos)
    .leftJoin(departamentos, eq(produtos.departamentoId, departamentos.id))
    .where(whereClause)
    .orderBy(...orderBy)
    .limit(input.pageSize)
    .offset(offset);

  const totals = calculateTotals(report, rows);
  const totalRows = countResult?.count ?? 0;

  return {
    report,
    rows,
    page: input.page,
    pageSize: input.pageSize,
    totalRows,
    totalPages: Math.max(1, Math.ceil(totalRows / input.pageSize)),
    totals,
  };
}

function buildProductsWhereClause(empresaId: number, filters: ReportFilterInput[]) {
  const conditions: any[] = [eq(produtos.empresaId, empresaId)];

  for (const filter of filters) {
    const value = normalizeFilterValue(filter.value);
    if (value === undefined || value === null || value === "") continue;

    if (filter.field === "search") {
      const term = `%${escapeLike(String(value))}%`;
      conditions.push(or(like(produtos.codigo, term), like(produtos.descricao, term), like(produtos.marca, term)));
    }

    if (filter.field === "marca") {
      if (filter.operator === "equals") conditions.push(eq(produtos.marca, String(value)));
      if (filter.operator === "contains") conditions.push(like(produtos.marca, `%${escapeLike(String(value))}%`));
    }

    if (filter.field === "departamentoId" && filter.operator === "equals") {
      const departamentoId = Number(value);
      if (Number.isFinite(departamentoId)) conditions.push(eq(produtos.departamentoId, departamentoId));
    }

    if (filter.field === "ativo" && filter.operator === "equals") {
      conditions.push(eq(produtos.ativo, Boolean(value)));
    }
  }

  return and(...conditions);
}

function buildProductsOrderBy(sort: { field: string; direction: "asc" | "desc" }[]) {
  const orderBy = sort
    .map((item) => {
      const column = productSortableFields[item.field as keyof typeof productSortableFields];
      if (!column) return undefined;
      return item.direction === "desc" ? desc(column) : asc(column);
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  return orderBy.length > 0 ? orderBy : [asc(produtos.codigo)];
}

function calculateTotals(report: ReportDefinition, rows: ReportRow[]) {
  const totals: Record<string, number> = {};

  for (const column of report.columns) {
    if (column.total !== "sum") continue;
    totals[column.field] = rows.reduce((sum, row) => sum + Number(row[column.field] ?? 0), 0);
  }

  return totals;
}

function normalizeFilterValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0 ? value : undefined;
  return value;
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}
