import { Router } from "express";
import * as departamentosController from "../controllers/departamentos.controller";
import { authenticate } from "../middleware/auth.middleware";

export const departamentosRouter = Router();

departamentosRouter.use(authenticate);
departamentosRouter.get("/", departamentosController.list);
departamentosRouter.post("/", departamentosController.create);
departamentosRouter.put("/:id", departamentosController.update);
departamentosRouter.delete("/:id", departamentosController.remove);
