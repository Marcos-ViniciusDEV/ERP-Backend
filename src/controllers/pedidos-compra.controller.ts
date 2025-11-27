/**
 * @module PedidosCompraController
 * @description Controller para endpoints de Pedidos de Compra
 */

import { Request, Response } from "express";
import * as pedidoCompraService from "../services/pedido-compra.service";

/**
 * GET /pedidos-compra
 * Lista todos os pedidos de compra
 */
export async function list(_req: Request, res: Response) {
  try {
    const pedidos = await pedidoCompraService.getAll();
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar pedidos de compra" });
  }
}

/**
 * POST /pedidos-compra
 * Cria novo pedido de compra
 */
export async function create(req: Request, res: Response) {
  try {
    const pedido = await pedidoCompraService.create({
      ...req.body,
      usuarioId: req.user!.id,
    });
    res.status(201).json(pedido);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar pedido de compra" });
  }
}
