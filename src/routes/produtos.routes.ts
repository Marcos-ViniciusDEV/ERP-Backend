import { Router } from "express";
import { produtoController } from "../controllers/produto.controller";
import { authenticate } from "../middleware/auth.middleware";

export const produtosRouter = Router();

produtosRouter.use(authenticate);
produtosRouter.get("/", produtoController.list);
produtosRouter.post("/", produtoController.create);
produtosRouter.put("/:id", produtoController.update);
produtosRouter.put("/:id/precos", produtoController.updatePrecos);
produtosRouter.delete("/:id", produtoController.delete);
