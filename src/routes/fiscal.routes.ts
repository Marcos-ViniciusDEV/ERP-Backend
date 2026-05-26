import { Router } from "express";
import * as fiscalController from "../controllers/fiscal.controller";

export const fiscalRouter = Router();

fiscalRouter.get("/config", fiscalController.getConfig);
fiscalRouter.put("/config", fiscalController.updateConfig);
fiscalRouter.get("/documentos", fiscalController.listDocuments);
fiscalRouter.post("/preflight", fiscalController.preflight);
fiscalRouter.post("/documentos/preparar", fiscalController.prepare);
fiscalRouter.post("/documentos/:id/cancelar", fiscalController.cancel);
fiscalRouter.get("/contador/resumo", fiscalController.summary);
