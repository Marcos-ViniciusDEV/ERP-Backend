/**
 * @module VendaController
 * @description Controller para endpoints de Vendas
 */

import { Request, Response } from "express";
import { vendaService } from "../services/venda.service";
import type { CreateVendaInput } from "../models/venda.model";

export class VendaController {
  /**
   * GET /vendas
   * Lista todas as vendas
   */
  async list(_req: Request, res: Response) {
    try {
      const vendas = await vendaService.list();
      res.json(vendas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar vendas" });
    }
  }

  /**
   * POST /vendas
   * Cria nova venda
   */
  async create(req: Request, res: Response) {
    try {
      const data: CreateVendaInput = req.body;
      const usuarioId = req.user!.id;
      const venda = await vendaService.create(data, usuarioId);
      res.status(201).json(venda);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar venda" });
    }
  }

  /**
   * GET /vendas/periodo
   * Busca vendas por período
   */
  async getByPeriodo(req: Request, res: Response) {
    try {
      const { dataInicio, dataFim } = req.query;
      
      console.log("[VendaController] Searching period:", { dataInicio, dataFim });

      const vendas = await vendaService.getByPeriodo(dataInicio as string, dataFim as string);
      res.json(vendas);
    } catch (error) {
      console.error("[VendaController] Error searching sales:", error);
      res.status(500).json({ error: "Erro ao buscar vendas por período" });
    }
  }

  /**
   * GET /vendas/hoje
   * Total de vendas do dia
   */
  async totalVendasHoje(_req: Request, res: Response) {
    try {
      const total = await vendaService.totalVendasHoje();
      res.json(total);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar total de vendas de hoje" });
    }
  }
}

export const vendaController = new VendaController();
