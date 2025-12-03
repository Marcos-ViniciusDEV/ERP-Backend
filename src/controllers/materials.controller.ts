import { Request, Response } from "express";
import { getDb } from "../libs/db";
import { materiais } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const materialsController = {
  async create(req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(materiais).values(req.body).$returningId();
      const [material] = await db.select().from(materiais).where(eq(materiais.id, result.id));
      res.status(201).json(material);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getAll(_req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allMaterials = await db.select().from(materiais).orderBy(desc(materiais.createdAt));
      res.json(allMaterials);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const id = Number(req.params.id);
      await db.update(materiais).set(req.body).where(eq(materiais.id, id));
      const [updated] = await db.select().from(materiais).where(eq(materiais.id, id));
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(materiais).where(eq(materiais.id, Number(req.params.id)));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
