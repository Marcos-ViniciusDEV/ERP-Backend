import { Router } from "express";
import { saasController } from "../controllers/saas.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireSuperAdmin } from "../middleware/tenant.middleware";

export const saasRouter = Router();

saasRouter.use(authenticate, requireSuperAdmin);

saasRouter.get("/dashboard", saasController.dashboard);
saasRouter.get("/fiscal/provider", saasController.listFiscalProviderCredentials);
saasRouter.post("/fiscal/provider", saasController.upsertFiscalProviderCredential);

saasRouter.get("/empresas", saasController.listEmpresas);
saasRouter.get("/empresas/:id", saasController.getEmpresa);
saasRouter.post("/empresas", saasController.createEmpresa);
saasRouter.put("/empresas/:id", saasController.updateEmpresa);
saasRouter.patch("/empresas/:id/bloquear", saasController.bloquearEmpresa);
saasRouter.patch("/empresas/:id/desbloquear", saasController.desbloquearEmpresa);

saasRouter.get("/planos", saasController.listPlanos);
saasRouter.post("/planos", saasController.createPlano);
saasRouter.put("/planos/:id", saasController.updatePlano);
saasRouter.delete("/planos/:id", saasController.deletePlano);

saasRouter.get("/assinaturas", saasController.listAssinaturas);
saasRouter.post("/assinaturas", saasController.createAssinatura);
saasRouter.patch("/assinaturas/:id", saasController.updateAssinatura);

saasRouter.get("/pdvs", saasController.listPdvs);
saasRouter.patch("/pdvs/:id", saasController.updatePdv);

saasRouter.get("/licencas", saasController.listLicencas);
saasRouter.post("/licencas", saasController.createLicenca);
saasRouter.patch("/licencas/:id/revogar", saasController.revogarLicenca);

saasRouter.get("/support/tickets", saasController.listSupportTickets);
saasRouter.patch("/support/tickets/:id", saasController.updateSupportTicket);
saasRouter.get("/support/tutorials", saasController.listSupportTutorials);
saasRouter.post("/support/tutorials", saasController.createSupportTutorial);
saasRouter.patch("/support/tutorials/:id", saasController.updateSupportTutorial);
saasRouter.delete("/support/tutorials/:id", saasController.deleteSupportTutorial);
