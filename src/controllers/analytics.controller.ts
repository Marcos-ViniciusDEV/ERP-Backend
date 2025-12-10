import { Request, Response } from "express";
import * as analyticsService from "../services/analytics.service";
import { z } from "zod";

export async function getABC(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const result = await analyticsService.calculateABC(
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

export async function upsertGoal(req: Request, res: Response) {
  try {
    const input = upsertGoalSchema.parse(req.body);
    const result = await analyticsService.upsertSalesGoal(
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

    const result = await analyticsService.getSalesPerformance(month, year);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
