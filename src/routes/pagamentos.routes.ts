import { Router } from "express";
import * as pagamentosController from "../controllers/pagamentos.controller";

export const pagamentosRouter = Router();

pagamentosRouter.get("/config", pagamentosController.getConfig);
pagamentosRouter.put("/config", pagamentosController.updateConfig);
pagamentosRouter.get("/provedores", pagamentosController.listProviders);

pagamentosRouter.get("/formas", pagamentosController.listForms);
pagamentosRouter.post("/formas", pagamentosController.createForm);
pagamentosRouter.put("/formas/:id", pagamentosController.updateForm);

pagamentosRouter.get("/adquirentes", pagamentosController.listAcquirers);
pagamentosRouter.post("/adquirentes", pagamentosController.createAcquirer);
pagamentosRouter.put("/adquirentes/:id", pagamentosController.updateAcquirer);

pagamentosRouter.get("/credenciais", pagamentosController.listCredentials);
pagamentosRouter.post("/credenciais", pagamentosController.upsertCredential);
pagamentosRouter.post("/testar-conexao", pagamentosController.testConnection);

pagamentosRouter.get("/taxas", pagamentosController.listRates);
pagamentosRouter.post("/taxas", pagamentosController.createRate);
pagamentosRouter.put("/taxas/:id", pagamentosController.updateRate);
pagamentosRouter.get("/taxas/historico", pagamentosController.listRateHistory);
pagamentosRouter.post("/taxas/sincronizar-api", pagamentosController.syncRatesFromApi);
pagamentosRouter.post("/taxas/aplicar-api", pagamentosController.applyRatesFromApi);

pagamentosRouter.get("/terminais", pagamentosController.listTerminals);
pagamentosRouter.post("/terminais", pagamentosController.createTerminal);
pagamentosRouter.put("/terminais/:id", pagamentosController.updateTerminal);

pagamentosRouter.post("/enviar-carga-pdv", pagamentosController.sendPdvLoad);
