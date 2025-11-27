import { Router } from "express";
import * as contasReceberController from "../controllers/contas-receber.controller";
import { authenticate } from "../middleware/auth.middleware";

export const contasReceberRouter = Router();

contasReceberRouter.use(authenticate);
contasReceberRouter.get("/", contasReceberController.list);
contasReceberRouter.post("/", contasReceberController.create);
