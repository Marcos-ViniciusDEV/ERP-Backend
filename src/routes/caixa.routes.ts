import { Router } from "express";
import { caixaController } from "../controllers/caixa.controller";
import { authenticate } from "../middleware/auth.middleware";

export const caixaRouter = Router();

caixaRouter.use(authenticate);
caixaRouter.get("/", caixaController.list);
caixaRouter.post("/", caixaController.create);
