/**
 * @module ContasPagarController
 * @description Controller para endpoints de Contas a Pagar
 */

import { Request, Response } from "express";
import { financeiroService } from "../services/financeiro.service";

export class ContasPagarController {
  /**
   * GET /contas-pagar
   * Lista todas as contas a pagar
   */
  async list(req: Request, res: Response) {
    try {
      const contas = await financeiroService.getAllContasPagar();
      res.json(contas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar contas a pagar" });
    }
  }

  /**
   * POST /contas-pagar
   * Cria nova conta a pagar
   */
  async create(req: Request, res: Response) {
    try {
      const conta = await financeiroService.createContaPagar({
        ...req.body,
        usuarioId: req.user!.id,
      });
      res.status(201).json(conta);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar conta a pagar" });
    }
  }
}

export const contasPagarController = new ContasPagarController();
