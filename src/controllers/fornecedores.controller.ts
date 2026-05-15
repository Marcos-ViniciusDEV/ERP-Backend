/**
 * @module FornecedoresController
 * @description Controller para endpoints de Fornecedores
 */

import { Request, Response } from "express";
import * as fornecedorService from "../services/fornecedor.service";

/**
 * GET /fornecedores
 * Lista todos os fornecedores
 */
export async function list(req: Request, res: Response) {
  try {
    const fornecedores = await fornecedorService.getAll(req.empresaId!);
    res.json(fornecedores);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar fornecedores" });
  }
}

/**
 * POST /fornecedores
 * Cria novo fornecedor
 */
export async function create(req: Request, res: Response) {
  try {
    const fornecedor = await fornecedorService.create(req.empresaId!, req.body);
    res.status(201).json(fornecedor);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar fornecedor" });
  }
}

/**
 * PUT /fornecedores/:id
 * Atualiza fornecedor
 */
export async function update(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const fornecedor = await fornecedorService.update(req.empresaId!, id, req.body);
    res.json(fornecedor);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar fornecedor" });
  }
}

/**
 * DELETE /fornecedores/:id
 * Deleta fornecedor
 */
export async function deleteFornecedor(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await fornecedorService.deleteFornecedor(req.empresaId!, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao deletar fornecedor" });
  }
}
