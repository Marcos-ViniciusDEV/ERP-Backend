import { Request, Response } from "express";
import * as clientesModule from "../services/clientes.service";
import { ZodError } from "zod";

import { createClienteSchema, updateClienteSchema } from "../zod";

export const list = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const result = await clientesModule.list(search);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const data = createClienteSchema.parse(req.body);
    const result = await clientesModule.create(data);
    res.json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: (error as any).errors });
      return;
    }
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateClienteSchema.parse(req.body);
    const result = await clientesModule.update(id, data);
    res.json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: (error as any).errors });
      return;
    }
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await clientesModule.remove(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
