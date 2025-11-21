import { Router } from "express";
import { kardexController } from "../controllers/kardex.controller";
import { authenticate } from "../middleware/auth.middleware";

export const kardexRouter = Router();

kardexRouter.use(authenticate);
kardexRouter.get("/produto/:produtoId", kardexController.listByProduto);
kardexRouter.post("/", kardexController.create);
