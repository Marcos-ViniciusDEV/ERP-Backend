/**
 * @module FornecedoresController
 * @description Controller para endpoints de Fornecedores
 */

import { Request, Response } from "express";
import { fornecedorService } from "../services/fornecedor.service";

export class FornecedoresController {
  /**
   * GET /fornecedores
   * Lista todos os fornecedores
   */
  async list(req: Request, res: Response) {
    try {
      const fornecedores = await fornecedorService.getAll();
      res.json(fornecedores);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar fornecedores" });
    }
  }

  /**
   * POST /fornecedores
   * Cria novo fornecedor
   */
  async create(req: Request, res: Response) {
    try {
      const fornecedor = await fornecedorService.create(req.body);
      res.status(201).json(fornecedor);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar fornecedor" });
    }
  }

  /**
   * PUT /fornecedores/:id
   * Atualiza fornecedor
   */
  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const fornecedor = await fornecedorService.update(id, req.body);
      res.json(fornecedor);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar fornecedor" });
    }
  }

  /**
   * DELETE /fornecedores/:id
   * Deleta fornecedor
   */
  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await fornecedorService.delete(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar fornecedor" });
    }
  }
}

export const fornecedoresController = new FornecedoresController();
