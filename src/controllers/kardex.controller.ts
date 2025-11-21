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
}

export const kardexController = new KardexController();
