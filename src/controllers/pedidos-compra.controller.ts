/**
 * @module PedidosCompraController
 * @description Controller para endpoints de Pedidos de Compra
 */

import { Request, Response } from "express";
import { getAllPedidosCompra, createPedidoCompra } from "../legacy_db";

export class PedidosCompraController {
  /**
   * GET /pedidos-compra
   * Lista todos os pedidos de compra
   */
  async list(req: Request, res: Response) {
    try {
      const pedidos = await getAllPedidosCompra();
      res.json(pedidos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar pedidos de compra" });
    }
  }

  /**
   * POST /pedidos-compra
   * Cria novo pedido de compra
   */
  async create(req: Request, res: Response) {
    try {
      const pedido = await createPedidoCompra({
        ...req.body,
        usuarioId: req.user!.id,
      });
      res.status(201).json(pedido);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar pedido de compra" });
    }
  }
}

export const pedidosCompraController = new PedidosCompraController();
