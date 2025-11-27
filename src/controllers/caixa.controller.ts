import { Request, Response } from "express";
import * as caixaService from "../services/caixa.service";

export async function list(_req: Request, res: Response) {
  try {
    const movimentacoes = await caixaService.getAll();
    res.json(movimentacoes);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar movimentações de caixa" });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const data = req.body;
    const result = await caixaService.create(data);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar movimentação de caixa" });
  }
}
