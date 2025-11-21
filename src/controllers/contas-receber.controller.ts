/**
 * @module ContasReceberController
 * @description Controller para endpoints de Contas a Receber
 */

import { Request, Response } from "express";
import { financeiroService } from "../services/financeiro.service";

export class ContasReceberController {
  /**
   * GET /contas-receber
   * Lista todas as contas a receber
   */
  async list(req: Request, res: Response) {
    try {
      const contas = await financeiroService.getAllContasReceber();
      res.json(contas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar contas a receber" });
    }
  }

  /**
   * POST /contas-receber
   * Cria nova conta a receber
   */
  async create(req: Request, res: Response) {
    try {
      const conta = await financeiroService.createContaReceber({
        ...req.body,
        usuarioId: req.user!.id,
      });
      res.status(201).json(conta);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar conta a receber" });
    }
  }
}

export const contasReceberController = new ContasReceberController();
