import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth.middleware";

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

analyticsRouter.get("/abc", analyticsController.getABC);
analyticsRouter.get("/goals", analyticsController.getGoalsPerformance);
analyticsRouter.post("/goals", analyticsController.upsertGoal);
