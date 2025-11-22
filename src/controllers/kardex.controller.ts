
/**
 * @module KardexController
 * @description Controller para endpoints de Kardex (Movimentação de Estoque)
 */

import { Request, Response } from "express";
import { kardexService } from "../services/kardex.service";
import { CreateKardexInput } from "../models/kardex.model";

export class KardexController {
  /**
   * Lista movimentações por produto
   */
  async listByProduto(req: Request, res: Response) {
    try {
      const produtoId = parseInt(req.params.produtoId);
      const movimentacoes = await kardexService.listByProduto(produtoId);
      res.json(movimentacoes);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar movimentações" });
    }
  }


  /**
   * Lista todas as movimentações
   */
  async listAll(_req: Request, res: Response) {
    try {
      const movimentacoes = await kardexService.getAll();
      res.json(movimentacoes);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar movimentações" });
    }
  }

  /**
   * Cria nova movimentação
   */
  async create(req: Request, res: Response) {
    try {
      const data: CreateKardexInput = req.body;
      const usuarioId = req.user!.id;
      const movimentacao = await kardexService.create(data, usuarioId);
      res.status(201).json(movimentacao);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar movimentação" });
    }
  }

  /**
   * Remove movimentações por documento
   */
  async deleteByDocumento(req: Request, res: Response) {
    try {
      const { documento } = req.params;
      await kardexService.deleteByDocumento(documento);
      return res.status(200).json({ message: "Movimentações deletadas com sucesso" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async deleteBatch(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      await kardexService.deleteBatch(ids);
      return res.status(200).json({ message: "Movimentações deletadas com sucesso" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}

export const kardexController = new KardexController();
