import { Router } from "express";
import * as fornecedoresController from "../controllers/fornecedores.controller";
import { authenticate } from "../middleware/auth.middleware";

export const fornecedoresRouter = Router();

fornecedoresRouter.use(authenticate);
fornecedoresRouter.get("/", fornecedoresController.list);
fornecedoresRouter.post("/", fornecedoresController.create);
fornecedoresRouter.put("/:id", fornecedoresController.update);
fornecedoresRouter.delete("/:id", fornecedoresController.deleteFornecedor);
