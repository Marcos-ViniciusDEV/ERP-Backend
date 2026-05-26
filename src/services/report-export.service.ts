import ExcelJS from "exceljs";
import type { ReportColumn, ReportDefinition, ReportRow } from "./reports.service";

type ExportReportInput = {
  report: ReportDefinition;
  rows: ReportRow[];
  columns: ReportColumn[];
  filters: unknown[];
  generatedBy?: string | null;
};

export async function createReportWorkbookBuffer(input: ExportReportInput) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema ERP";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sanitizeWorksheetName(input.report.title), {
    views: [{ state: "frozen", ySplit: 5 }],
  });

  worksheet.addRow([input.report.title]);
  worksheet.addRow([`Gerado em: ${new Date().toLocaleString("pt-BR")}`]);
  worksheet.addRow([`Usuario: ${input.generatedBy || "-"}`]);
  worksheet.addRow([`Filtros: ${formatFilters(input.filters)}`]);
  worksheet.addRow([]);

  const headerRow = worksheet.addRow(input.columns.map((column) => column.label));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };

  for (const row of input.rows) {
    worksheet.addRow(input.columns.map((column) => formatCellValue(row[column.field], column)));
  }

  const totalColumns = input.columns.filter((column) => column.total === "sum");
  if (totalColumns.length > 0) {
    const totalRow = worksheet.addRow(
      input.columns.map((column, index) => {
        if (index === 0) return "Total";
        if (column.total !== "sum") return "";
        return input.rows.reduce((sum, row) => sum + Number(row[column.field] ?? 0), 0);
      })
    );
    totalRow.font = { bold: true };
  }

  worksheet.autoFilter = {
    from: { row: 6, column: 1 },
    to: { row: 6, column: input.columns.length },
  };

  input.columns.forEach((column, index) => {
    const excelColumn = worksheet.getColumn(index + 1);
    excelColumn.width = Math.min(Math.max(column.label.length + 4, 14), 45);

    if (column.type === "currency") {
      excelColumn.numFmt = '"R$" #,##0.00';
    }

    if (column.type === "date") {
      excelColumn.numFmt = "dd/mm/yyyy";
    }

    if (column.type === "datetime") {
      excelColumn.numFmt = "dd/mm/yyyy hh:mm";
    }
  });

  return workbook.xlsx.writeBuffer();
}

export function buildReportFilename(report: ReportDefinition) {
  const timestamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  return `${report.key}_${timestamp}.xlsx`;
}

function formatCellValue(value: unknown, column: ReportColumn) {
  if (value === null || value === undefined) return "";
  if (column.type === "currency") return Number(value) / 100;
  if (column.type === "boolean") return value ? "Sim" : "Nao";
  if (column.type === "date" || column.type === "datetime") return value instanceof Date ? value : new Date(String(value));
  return value as string | number;
}

function sanitizeWorksheetName(name: string) {
  return name.replace(/[\\/*?:[\]]/g, "").slice(0, 31) || "Relatorio";
}

function formatFilters(filters: unknown[]) {
  if (!filters.length) return "Nenhum";
  return JSON.stringify(filters);
}
