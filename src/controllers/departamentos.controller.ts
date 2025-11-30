/**
 * @module DepartamentosController
 * @description Controller para endpoints de Departamentos
 */

import { Request, Response } from "express";
import * as departamentoService from "../services/departamento.service";

/**
 * GET /departamentos
 * Lista todos os departamentos
 */
export async function list(_req: Request, res: Response) {
  try {
    const departamentos = await departamentoService.getAll();
    res.json(departamentos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar departamentos" });
  }
}

/**
 * POST /departamentos
 * Cria novo departamento
 */
export async function create(req: Request, res: Response) {
  try {
    const departamento = await departamentoService.create(req.body);
    res.status(201).json(departamento);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar departamento" });
  }
}

/**
 * PUT /departamentos/:id
 * Atualiza departamento
 */
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await departamentoService.update(Number(id), req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar departamento" });
  }
}

/**
 * DELETE /departamentos/:id
 * Remove departamento
 */
export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await departamentoService.remove(Number(id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover departamento" });
  }
}
