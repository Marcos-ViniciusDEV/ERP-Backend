import { Request, Response } from "express";
import { productionService } from "../services/production.service";

export const productionController = {
  async register(req: Request, res: Response) {
    try {
      const empresaId = (req as any).empresaId;
      const { produtoId, quantidade, observacao } = req.body;

      if (!produtoId || !quantidade || quantidade <= 0) {
        return res.status(400).json({ error: "produtoId e quantidade são obrigatórios" });
      }

      const result = await productionService.registerProduction(empresaId, {
        produtoId,
        quantidade,
        observacao,
        usuarioId: (req as any).userId || null,
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async preview(req: Request, res: Response) {
    try {
      const empresaId = (req as any).empresaId;
      const produtoId = Number(req.params.produtoId);
      const quantidade = Number(req.query.quantidade || 1);

      if (!produtoId || quantidade <= 0) {
        return res.status(400).json({ error: "produtoId e quantidade são obrigatórios" });
      }

      const result = await productionService.preview(empresaId, produtoId, quantidade);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const empresaId = (req as any).empresaId;
      const result = await productionService.list(empresaId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
