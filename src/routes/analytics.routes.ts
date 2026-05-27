import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth.middleware";

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

analyticsRouter.get("/abc", analyticsController.getABC);
analyticsRouter.get("/goals", analyticsController.getGoalsPerformance);
analyticsRouter.post("/goals", analyticsController.upsertGoal);
analyticsRouter.get("/expense-goals", analyticsController.getExpenseGoalsPerformance);
analyticsRouter.post("/expense-goals", analyticsController.upsertExpenseGoal);
analyticsRouter.get("/stale-products", analyticsController.getStaleProducts);
analyticsRouter.get("/financial-summary", analyticsController.getFinancialSummary);
analyticsRouter.get("/management", analyticsController.getManagementAnalytics);
analyticsRouter.get("/dre", analyticsController.getDre);
analyticsRouter.get("/product-margin", analyticsController.getProductMargins);
analyticsRouter.get("/profit-period", analyticsController.getProfitPeriod);
analyticsRouter.get("/low-margin-products", analyticsController.getLowMarginProducts);
analyticsRouter.get("/operators-risk", analyticsController.getOperatorsRisk);
analyticsRouter.get("/customer-ranking", analyticsController.getCustomerRanking);
analyticsRouter.get("/stock-rupture-forecast", analyticsController.getStockRuptureForecast);
