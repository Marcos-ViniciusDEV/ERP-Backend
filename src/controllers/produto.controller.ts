/**
 * @module ProdutoController
 * @description Controller para endpoints de Produtos
 *
 * Responsabilidades:
 * - Receber e validar requests
 * - Chamar services apropriados
 * - Formatar respostas
 * - Tratamento de erros
 */

import { Request, Response } from "express";
import { produtoService } from "../services/produto.service";
import type { CreateProdutoInput, UpdateProdutoInput } from "../models/produto.model";

export class ProdutoController {
  /**
   * GET /produtos
   * Lista todos os produtos
   */
  async list(_req: Request, res: Response) {
    try {
      const produtos = await produtoService.list();
      res.json(produtos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar produtos" });
    }
  }

  /**
   * GET /produtos/:id
   * Busca produto por ID
   */
  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const produto = await produtoService.getById(id);
      if (!produto) {
        res.status(404).json({ error: `Produto ${id} não encontrado` });
        return;
      }
      res.json(produto);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar produto" });
    }
  }

  /**
   * POST /produtos
   * Cria novo produto
   */
  async create(req: Request, res: Response) {
    try {
      const data: CreateProdutoInput = req.body;
      const produto = await produtoService.create(data);
      res.status(201).json(produto);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar produto" });
    }
  }

  /**
   * PUT /produtos/:id
   * Atualiza produto existente
   */
  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const data: UpdateProdutoInput = { id, ...req.body };
      await produtoService.update(data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar produto" });
    }
  }

  /**
   * DELETE /produtos/:id
   * Deleta produto
   */
  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await produtoService.delete(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar produto" });
    }
  }

  /**
   * PUT /produtos/:id/precos
   * Atualiza preços do produto
   */
  async updatePrecos(req: Request, res: Response) {
    try {
      const produtoId = parseInt(req.params.id);
      const { precoCusto } = req.body;
      const result = await produtoService.updatePrecos(produtoId, precoCusto);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar preços" });
    }
  }

  /**
   * GET /produtos/estoque-baixo
   * Lista produtos com estoque abaixo do mínimo
   */
  async produtosEstoqueBaixo(_req: Request, res: Response) {
    try {
      const produtos = await produtoService.produtosEstoqueBaixo();
      res.json(produtos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar produtos com estoque baixo" });
    }
  }
}

export const produtoController = new ProdutoController();
