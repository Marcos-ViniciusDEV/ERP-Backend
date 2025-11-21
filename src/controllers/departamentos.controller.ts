/**
 * @module DepartamentosController
 * @description Controller para endpoints de Departamentos
 */

import { Request, Response } from "express";
import { departamentoService } from "../services/departamento.service";

export class DepartamentosController {
  /**
   * GET /departamentos
   * Lista todos os departamentos
   */
  async list(req: Request, res: Response) {
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
  async create(req: Request, res: Response) {
    try {
      const departamento = await departamentoService.create(req.body);
      res.status(201).json(departamento);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar departamento" });
    }
  }
}

export const departamentosController = new DepartamentosController();
