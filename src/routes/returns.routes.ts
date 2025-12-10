import { Router } from "express";
import * as returnsController from "../controllers/returns.controller";
import { authenticate } from "../middleware/auth.middleware";

export const returnsRouter = Router();

returnsRouter.use(authenticate);

returnsRouter.post("/", returnsController.createReturn);
returnsRouter.get("/", returnsController.listReturns);
returnsRouter.get("/:id", returnsController.getReturnById);
