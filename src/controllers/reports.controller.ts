import { Request, Response } from "express";
import { promises as fs } from "fs";
import { buildReportFilename, createReportWorkbookBuffer } from "../services/report-export.service";
import { createExportJob, getExportJob } from "../services/report-export-jobs.service";
import { getReportsCatalog, getVisibleColumns, queryAllReportRows, queryReport } from "../services/reports.service";
import { reportExportSchema, reportQuerySchema } from "../zod/report.schema";

export async function catalog(_req: Request, res: Response) {
  res.json({ success: true, data: getReportsCatalog() });
}

export async function query(req: Request, res: Response) {
  try {
    const input = reportQuerySchema.parse(req.body ?? {});
    const result = await queryReport(req.empresaId!, req.params.reportKey, input);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function exportXlsx(req: Request, res: Response) {
  try {
    const input = reportExportSchema.parse(req.body ?? {});
    const result = await queryAllReportRows(req.empresaId!, req.params.reportKey, input, input.maxRows);
    const columns = getVisibleColumns(result.report, input.columns);
    const buffer = await createReportWorkbookBuffer({
      report: result.report,
      rows: result.rows,
      columns,
      filters: input.filters,
      generatedBy: req.user?.name || req.user?.email,
    });
    const filename = buildReportFilename(result.report);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function createExport(req: Request, res: Response) {
  try {
    const input = reportExportSchema.parse(req.body ?? {});
    const job = createExportJob(req.empresaId!, req.user?.id ?? null, req.params.reportKey, input, req.user?.name || req.user?.email);
    res.status(202).json({ success: true, data: job });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getExport(req: Request, res: Response) {
  const job = getExportJob(req.params.jobId, req.empresaId!);
  if (!job) {
    res.status(404).json({ success: false, error: "Exportacao nao encontrada" });
    return;
  }

  const { filePath: _filePath, ...publicJob } = job;
  res.json({ success: true, data: publicJob });
}

export async function downloadExport(req: Request, res: Response) {
  try {
    const job = getExportJob(req.params.jobId, req.empresaId!);
    if (!job || job.status !== "DONE" || !job.filePath || !job.fileName) {
      res.status(404).json({ success: false, error: "Arquivo de exportacao nao encontrado" });
      return;
    }

    await fs.access(job.filePath);
    res.download(job.filePath, job.fileName);
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message || "Arquivo de exportacao nao encontrado" });
  }
}
