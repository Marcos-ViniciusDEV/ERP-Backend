import { Router } from "express";
import * as reportsController from "../controllers/reports.controller";

export const reportsRouter = Router();

reportsRouter.get("/catalog", reportsController.catalog);
reportsRouter.post("/:reportKey/query", reportsController.query);
reportsRouter.post("/:reportKey/export/xlsx", reportsController.exportXlsx);
reportsRouter.post("/:reportKey/export-jobs", reportsController.createExport);
reportsRouter.get("/export-jobs/:jobId", reportsController.getExport);
reportsRouter.get("/export-jobs/:jobId/download", reportsController.downloadExport);
