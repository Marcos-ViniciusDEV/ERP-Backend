import { Request, Response } from "express";
import { getDb } from "../libs/db";
import { materiais } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const materialsController = {
  async create(req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const empresaId = (req as any).empresaId;

      const [result] = await db.insert(materiais).values({
        ...req.body,
        empresaId,
      }).$returningId();
      const [material] = await db.select().from(materiais).where(eq(materiais.id, result.id));
      res.status(201).json(material);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const empresaId = (req as any).empresaId;

      const allMaterials = await db
        .select()
        .from(materiais)
        .where(eq(materiais.empresaId, empresaId))
        .orderBy(desc(materiais.createdAt));
      res.json(allMaterials);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const empresaId = (req as any).empresaId;
      const id = Number(req.params.id);

      await db.update(materiais).set(req.body).where(
        and(eq(materiais.id, id), eq(materiais.empresaId, empresaId))
      );
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
      const empresaId = (req as any).empresaId;

      await db.delete(materiais).where(
        and(eq(materiais.id, Number(req.params.id)), eq(materiais.empresaId, empresaId))
      );
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
