import { Request, Response } from "express";
import { offersService } from "../services/offers.service";

export const offersController = {
  async create(req: Request, res: Response) {
    try {
      const offer = await offersService.create(req.empresaId!, req.body);
      res.status(201).json(offer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const offers = await offersService.getAll(req.empresaId!);
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getActive(req: Request, res: Response) {
    try {
      const offers = await offersService.getActive(req.empresaId!);
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const offer = await offersService.update(req.empresaId!, id, req.body);
      res.json(offer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async toggleAtivo(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await offersService.toggleAtivo(req.empresaId!, id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await offersService.delete(req.empresaId!, Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
