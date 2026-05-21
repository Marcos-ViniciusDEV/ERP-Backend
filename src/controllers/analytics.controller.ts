import { Request, Response } from "express";
import * as analyticsService from "../services/analytics.service";
import { z } from "zod";

export async function getABC(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const empresaId = req.user?.empresaId || 1;
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
    const empresaId = req.user?.empresaId || 1;
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

    const empresaId = req.user?.empresaId || 1;
    const result = await analyticsService.getSalesPerformance(empresaId, month, year);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function upsertExpenseGoal(req: Request, res: Response) {
  try {
    const input = upsertExpenseGoalSchema.parse(req.body);
    const empresaId = req.user?.empresaId || 1;
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

    const empresaId = req.user?.empresaId || 1;
    const result = await analyticsService.getExpensePerformance(empresaId, month, year);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getStaleProducts(req: Request, res: Response) {
  try {
    const empresaId = req.user?.empresaId || 1;
    const daysThreshold = Number(req.query.daysThreshold) || 30;
    const result = await analyticsService.getStaleProducts(empresaId, daysThreshold);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getFinancialSummary(req: Request, res: Response) {
  try {
    const empresaId = req.user?.empresaId || 1;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const result = await analyticsService.getFinancialSummary(empresaId, startDate, endDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

