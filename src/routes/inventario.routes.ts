import { Router } from "express";
import { inventarioController } from "../controllers/inventario.controller";
import { authenticate } from "../middleware/auth.middleware";

export const inventarioRouter = Router();

inventarioRouter.use(authenticate);
inventarioRouter.get("/", inventarioController.list);
inventarioRouter.post("/", inventarioController.create);
inventarioRouter.get("/:id", inventarioController.getById);
inventarioRouter.post("/:id/itens", inventarioController.addItem);
