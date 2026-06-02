import { Request, Response } from "express";
import * as analyticsService from "../services/analytics.service";
import { z } from "zod";

export async function getABC(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const empresaId = req.empresaId!;
    const result = await analyticsService.calculateABC(
      empresaId,
      startDate as string,
      endDate as string
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

const upsertGoalSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2000),
  targetAmount: z.number().positive(),
  sellerId: z.number().optional()
});

const upsertExpenseGoalSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2000),
  targetAmount: z.number().positive(),
});

export async function upsertGoal(req: Request, res: Response) {
  try {
    const input = upsertGoalSchema.parse(req.body);
    const empresaId = req.empresaId!;
    const result = await analyticsService.upsertSalesGoal(
      empresaId,
      input.month,
      input.year,
      input.targetAmount,
      input.sellerId
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getGoalsPerformance(req: Request, res: Response) {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const empresaId = req.empresaId!;
    const result = await analyticsService.getSalesPerformance(empresaId, month, year);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function upsertExpenseGoal(req: Request, res: Response) {
  try {
    const input = upsertExpenseGoalSchema.parse(req.body);
    const empresaId = req.empresaId!;
    const result = await analyticsService.upsertExpenseGoal(
      empresaId,
      input.month,
      input.year,
      input.targetAmount
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getExpenseGoalsPerformance(req: Request, res: Response) {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const empresaId = req.empresaId!;
    const result = await analyticsService.getExpensePerformance(empresaId, month, year);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getStaleProducts(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId!;
    const daysThreshold = Number(req.query.daysThreshold) || 30;
    const result = await analyticsService.getStaleProducts(empresaId, daysThreshold);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getFinancialSummary(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId!;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const result = await analyticsService.getFinancialSummary(empresaId, startDate, endDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  pdvId: z.string().optional(),
  formaPagamento: z.string().optional(),
  produtoId: z.coerce.number().optional(),
  departamentoId: z.coerce.number().optional(),
  operadorId: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  marginThreshold: z.coerce.number().optional(),
  days: z.coerce.number().optional(),
  leadTimeDays: z.coerce.number().optional(),
});

const parseAnalyticsQuery = (req: Request) => analyticsQuerySchema.parse(req.query);

export async function getDre(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId!;
    const result = await analyticsService.getDre(empresaId, parseAnalyticsQuery(req));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getProductMargins(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId!;
    const result = await analyticsService.getProductMargins(empresaId, parseAnalyticsQuery(req));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getProfitPeriod(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId!;
    const result = await analyticsService.getProfitByPeriod(empresaId, parseAnalyticsQuery(req));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getLowMarginProducts(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId!;
    const result = await analyticsService.getLowMarginProducts(empresaId, parseAnalyticsQuery(req));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getOperatorsRisk(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId!;
    const result = await analyticsService.getOperatorsRisk(empresaId, parseAnalyticsQuery(req));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getCustomerRanking(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId!;
    const result = await analyticsService.getCustomerRanking(empresaId, parseAnalyticsQuery(req));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getStockRuptureForecast(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId!;
    const result = await analyticsService.getStockRuptureForecast(empresaId, parseAnalyticsQuery(req));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getManagementAnalytics(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId!;
    const result = await analyticsService.getManagementAnalytics(empresaId, parseAnalyticsQuery(req));
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

