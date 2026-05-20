import { Router } from "express";
import * as pdvController from "../controllers/pdv.controller";

export const pdvRouter = Router();

// GET /api/pdv/carga-inicial - Carga matinal do PDV (SEM autenticação)
pdvRouter.get("/carga-inicial", pdvController.cargaInicial);

// POST /api/pdv/sincronizar - Sincronização de vendas e movimentos
pdvRouter.post("/sincronizar", pdvController.sincronizar);

// Todas as rotas do PDV são agora protegidas globalmente pelo index.ts (authenticate e requireTenant)

// GET /api/pdv/ativos - Lista PDVs conectados
pdvRouter.get("/ativos", pdvController.getActivePDVs);

// POST /api/pdv/enviar-carga - Envia carga para PDVs
pdvRouter.post("/enviar-carga", pdvController.enviarCarga);

// GET /api/pdv/movimentos - Relatório de Sangrias/Movimentos
pdvRouter.get("/movimentos", pdvController.listMovements);
