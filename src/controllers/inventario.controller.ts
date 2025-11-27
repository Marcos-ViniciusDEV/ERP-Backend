import { Request, Response } from "express";
import * as inventarioService from "../services/inventario.service";

export async function list(_req: Request, res: Response) {
  try {
    const inventarios = await inventarioService.getAll();
    res.json(inventarios);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar inventários" });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const data = req.body;
    const result = await inventarioService.create(data);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar inventário" });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const inventario = await inventarioService.getById(Number(id));
    if (!inventario) {
      return res.status(404).json({ error: "Inventário não encontrado" });
    }
    const itens = await inventarioService.getItens(Number(id));
    res.json({ ...inventario, itens });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar inventário" });
  }
}

export async function addItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;
    const result = await inventarioService.addItem({ ...data, inventarioId: Number(id) });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao adicionar item ao inventário" });
  }
}
