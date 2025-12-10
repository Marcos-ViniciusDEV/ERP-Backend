/**
 * @module VendaController
 * @description Controller para endpoints de Vendas
 */

import { Request, Response } from "express";
import * as vendaService from "../services/venda.service";
import type { CreateVendaInput } from "../models/venda.model";

/**
 * GET /vendas
 * Lista todas as vendas
 */
export async function list(req: Request, res: Response) {
  try {
    const { dataInicio, dataFim, codigoBarras, departamentoId } = req.query;
    
    const filters = {
      dataInicio: dataInicio as string,
      dataFim: dataFim as string,
      codigoBarras: codigoBarras as string,
      departamentoId: departamentoId ? Number(departamentoId) : undefined,
    };

    const vendas = await vendaService.list(filters);
    res.json(vendas);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar vendas" });
  }
}

/**
 * POST /vendas
 * Cria nova venda
 */
export async function create(req: Request, res: Response) {
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
export async function getByPeriodo(req: Request, res: Response) {
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
export async function totalVendasHoje(_req: Request, res: Response) {
  try {
    const total = await vendaService.totalVendasHoje();
    res.json(total);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar total de vendas de hoje" });
  }
}

/**
 * GET /vendas/:id
 * Busca venda por ID ou Número
 */
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const venda = await vendaService.getById(id);
    
    if (!venda) {
      return res.status(404).json({ error: "Venda não encontrada" });
    }
    
    res.json(venda);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar venda" });
  }
}
