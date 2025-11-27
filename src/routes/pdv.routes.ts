import { Router } from "express";
import * as pdvController from "../controllers/pdv.controller";
import { authenticate } from "../middleware/auth.middleware";

export const pdvRouter = Router();

// GET /api/pdv/carga-inicial - Carga matinal do PDV (SEM autenticação)
pdvRouter.get("/carga-inicial", pdvController.cargaInicial);

// POST /api/pdv/sincronizar - Sincronização de vendas e movimentos
pdvRouter.post("/sincronizar", pdvController.sincronizar);

// Todas as outras rotas do PDV requerem autenticação
pdvRouter.use(authenticate);

// GET /api/pdv/ativos - Lista PDVs conectados
pdvRouter.get("/ativos", pdvController.getActivePDVs);

// POST /api/pdv/enviar-carga - Envia carga para PDVs
pdvRouter.post("/enviar-carga", pdvController.enviarCarga);
