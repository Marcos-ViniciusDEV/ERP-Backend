import { Router } from "express";
import * as clientesController from "../controllers/clientes.controller";
import { authenticate } from "../middleware/auth.middleware";

export const clientesRouter = Router();

clientesRouter.use(authenticate);
clientesRouter.get("/", clientesController.list);
clientesRouter.post("/", clientesController.create);
clientesRouter.put("/:id", clientesController.update);
clientesRouter.delete("/:id", clientesController.remove);
