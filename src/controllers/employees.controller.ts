import { Request, Response } from "express";
import * as employeesService from "../services/employees.service";
import { ZodError } from "zod";
import { createEmployeeSchema, updateEmployeeSchema } from "../zod";

export const list = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const result = await employeesService.list(req.empresaId!, search);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const data = createEmployeeSchema.parse(req.body);
    const result = await employeesService.create(req.empresaId!, data);
    res.json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateEmployeeSchema.parse(req.body);
    const result = await employeesService.update(req.empresaId!, id, data);
    res.json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await employeesService.remove(req.empresaId!, id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
