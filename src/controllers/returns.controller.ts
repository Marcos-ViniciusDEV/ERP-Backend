import { Request, Response } from "express";
import * as returnsService from "../services/returns.service";
import { z } from "zod";

const createReturnSchema = z.object({
  originalSaleId: z.number(),
  reason: z.string(),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number().positive(),
    condition: z.enum(["GOOD", "DAMAGED"])
  })).min(1)
});

export async function createReturn(req: Request, res: Response) {
  try {
    const input = createReturnSchema.parse(req.body);
    
    // @ts-ignore
    const operatorId = req.user?.id;
    if (!operatorId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const result = await returnsService.createReturn({
      ...input,
      operatorId
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error creating return:", error);
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function listReturns(_req: Request, res: Response) {
  try {
    const result = await returnsService.listReturns();
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error listing returns:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getReturnById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const result = await returnsService.getReturnById(id);
    
    if (!result) {
      return res.status(404).json({ success: false, error: "Return not found" });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error getting return:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
