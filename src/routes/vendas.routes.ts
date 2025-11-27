import { Router } from "express";
import * as vendaController from "../controllers/venda.controller";
import { authenticate } from "../middleware/auth.middleware";

export const vendasRouter = Router();

vendasRouter.use(authenticate);
vendasRouter.get("/periodo", vendaController.getByPeriodo);
vendasRouter.get("/", vendaController.list);
vendasRouter.post("/", vendaController.create);
