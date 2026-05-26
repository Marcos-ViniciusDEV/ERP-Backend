import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { nanoid } from "nanoid";
import { createReportWorkbookBuffer } from "./report-export.service";
import { getVisibleColumns, queryAllReportRows } from "./reports.service";
import type { ReportExportInput } from "../zod/report.schema";

export type ExportJobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED" | "EXPIRED";

export type ExportJob = {
  id: string;
  empresaId: number;
  userId: number | null;
  reportKey: string;
  status: ExportJobStatus;
  progress: number;
  totalRows: number;
  processedRows: number;
  filePath?: string;
  fileName?: string;
  errorMessage?: string;
  createdAt: string;
  finishedAt?: string;
  expiresAt: string;
};

const jobs = new Map<string, ExportJob>();
const exportDir = path.join(os.tmpdir(), "sistema-erp-report-exports");

export function createExportJob(empresaId: number, userId: number | null, reportKey: string, input: ReportExportInput, generatedBy?: string | null) {
  const id = nanoid();
  const now = new Date();
  const job: ExportJob = {
    id,
    empresaId,
    userId,
    reportKey,
    status: "PENDING",
    progress: 0,
    totalRows: 0,
    processedRows: 0,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };

  jobs.set(id, job);
  void processExportJob(id, input, generatedBy);
  return job;
}

export function getExportJob(id: string, empresaId: number) {
  const job = jobs.get(id);
  if (!job || job.empresaId !== empresaId) return undefined;

  if (new Date(job.expiresAt).getTime() < Date.now()) {
    job.status = "EXPIRED";
  }

  return job;
}

async function processExportJob(id: string, input: ReportExportInput, generatedBy?: string | null) {
  const job = jobs.get(id);
  if (!job) return;

  try {
    job.status = "RUNNING";
    job.progress = 10;

    const result = await queryAllReportRows(job.empresaId, job.reportKey, input, input.maxRows);
    job.totalRows = result.totalRows;
    job.processedRows = result.rows.length;
    job.progress = 70;

    const columns = getVisibleColumns(result.report, input.columns);
    const buffer = await createReportWorkbookBuffer({
      report: result.report,
      rows: result.rows,
      columns,
      filters: input.filters,
      generatedBy,
    });

    await fs.mkdir(exportDir, { recursive: true });
    const fileName = `${result.report.key}_${new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16)}.xlsx`;
    const filePath = path.join(exportDir, `${id}_${fileName}`);
    await fs.writeFile(filePath, Buffer.from(buffer));

    job.fileName = fileName;
    job.filePath = filePath;
    job.status = "DONE";
    job.progress = 100;
    job.finishedAt = new Date().toISOString();
  } catch (error: any) {
    job.status = "FAILED";
    job.progress = 100;
    job.errorMessage = error.message || "Erro ao gerar exportacao";
    job.finishedAt = new Date().toISOString();
  }
}
