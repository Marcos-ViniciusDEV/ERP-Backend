import { Router } from "express";
import { kardexController } from "../controllers/kardex.controller";
import { authenticate } from "../middleware/auth.middleware";

export const kardexRouter = Router();

kardexRouter.use(authenticate);
kardexRouter.get("/produto/:produtoId", kardexController.listByProduto);
kardexRouter.get("/", kardexController.listAll);
kardexRouter.post("/", kardexController.create);
kardexRouter.delete("/documento/:documento", kardexController.deleteByDocumento);
kardexRouter.post("/delete-batch", kardexController.deleteBatch);
