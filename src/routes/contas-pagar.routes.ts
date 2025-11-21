import { Router } from "express";
import { contasPagarController } from "../controllers/contas-pagar.controller";
import { authenticate } from "../middleware/auth.middleware";

export const contasPagarRouter = Router();

contasPagarRouter.use(authenticate);
contasPagarRouter.get("/", contasPagarController.list);
contasPagarRouter.post("/", contasPagarController.create);
