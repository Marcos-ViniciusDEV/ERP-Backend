import { Router } from "express";
import { pedidosCompraController } from "../controllers/pedidos-compra.controller";
import { authenticate } from "../middleware/auth.middleware";

export const pedidosCompraRouter = Router();

pedidosCompraRouter.use(authenticate);
pedidosCompraRouter.get("/", pedidosCompraController.list);
pedidosCompraRouter.post("/", pedidosCompraController.create);
