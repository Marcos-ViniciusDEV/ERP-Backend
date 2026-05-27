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
    const pedidos = await pedidoCompraService.getAll(_req.empresaId!);
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
    const pedido = await pedidoCompraService.create(req.empresaId!, {
      ...req.body,
      usuarioId: req.user!.id,
    });
    res.status(201).json(pedido);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar pedido de compra" });
  }
}

/**
 * GET /pedidos-compra/sugestoes
 * Sugere compras por estoque minimo e giro
 */
export async function sugestoes(req: Request, res: Response) {
  try {
    const resultado = await pedidoCompraService.getSugestoesCompra(req.empresaId!, {
      dias: req.query.dias ? Number(req.query.dias) : undefined,
      leadTimeDias: req.query.leadTimeDias ? Number(req.query.leadTimeDias) : undefined,
    });
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar sugestoes de compra" });
  }
}

/**
 * GET /pedidos-compra/curva-abc
 * Classifica produtos vendidos pela Curva ABC aplicada a compras
 */
export async function curvaAbc(req: Request, res: Response) {
  try {
    const resultado = await pedidoCompraService.getCurvaAbcCompras(
      req.empresaId!,
      req.query.dias ? Number(req.query.dias) : undefined
    );
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: "Erro ao calcular Curva ABC de compras" });
  }
}

/**
 * POST /pedidos-compra/cotacao
 * Compara cotacoes de multiplos fornecedores
 */
export async function cotacao(req: Request, res: Response) {
  try {
    const resultado = await pedidoCompraService.compararCotacoes(req.empresaId!, req.body);
    res.json(resultado);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao comparar cotacoes" });
  }
}

/**
 * POST /pedidos-compra/automatico
 * Gera pedido automatico baseado no giro de estoque
 */
export async function automatico(req: Request, res: Response) {
  try {
    const pedido = await pedidoCompraService.gerarPedidoAutomatico(
      req.empresaId!,
      req.user!.id,
      req.body
    );
    res.status(201).json(pedido);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao gerar pedido automatico" });
  }
}
