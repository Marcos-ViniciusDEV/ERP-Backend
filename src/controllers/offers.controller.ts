import { Request, Response } from "express";
import { offersService } from "../services/offers.service";

export const offersController = {
  async create(req: Request, res: Response) {
    try {
      const offer = await offersService.create(req.body);
      res.status(201).json(offer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const offers = await offersService.getAll();
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await offersService.delete(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
