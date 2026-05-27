import { Router } from "express";
import * as pedidosCompraController from "../controllers/pedidos-compra.controller";
import { authenticate } from "../middleware/auth.middleware";

export const pedidosCompraRouter = Router();

pedidosCompraRouter.use(authenticate);
pedidosCompraRouter.get("/sugestoes", pedidosCompraController.sugestoes);
pedidosCompraRouter.get("/curva-abc", pedidosCompraController.curvaAbc);
pedidosCompraRouter.post("/cotacao", pedidosCompraController.cotacao);
pedidosCompraRouter.post("/automatico", pedidosCompraController.automatico);
pedidosCompraRouter.get("/", pedidosCompraController.list);
pedidosCompraRouter.post("/", pedidosCompraController.create);
