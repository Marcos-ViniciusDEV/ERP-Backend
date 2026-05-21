import { Router } from "express";
import * as employeesController from "../controllers/employees.controller";
import { authenticate } from "../middleware/auth.middleware";

export const employeesRouter = Router();

employeesRouter.use(authenticate);
employeesRouter.get("/", employeesController.list);
employeesRouter.post("/", employeesController.create);
employeesRouter.put("/:id", employeesController.update);
employeesRouter.delete("/:id", employeesController.remove);
