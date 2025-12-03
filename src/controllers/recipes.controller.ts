import { Request, Response } from "express";
import { getDb } from "../libs/db";
import { receitas, materiais } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const recipesController = {
  async create(req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(receitas).values(req.body).$returningId();
      const [recipe] = await db.select().from(receitas).where(eq(receitas.id, result.id));
      res.status(201).json(recipe);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getByProduct(req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const productId = Number(req.params.productId);
      const productRecipes = await db
        .select({
          id: receitas.id,
          produtoId: receitas.produtoId,
          materialId: receitas.materialId,
          quantidade: receitas.quantidade,
          materialNome: materiais.nome,
          materialUnidade: materiais.unidade,
        })
        .from(receitas)
        .innerJoin(materiais, eq(receitas.materialId, materiais.id))
        .where(eq(receitas.produtoId, productId));
      
      res.json(productRecipes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(receitas).where(eq(receitas.id, Number(req.params.id)));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
