import { Request, Response } from "express";
import { productionService } from "../services/production.service";

export const productionController = {
  async register(req: Request, res: Response) {
    try {
      const production = await productionService.registerProduction(req.body);
      res.status(201).json(production);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
};
