import { Request, Response } from "express";
import { getDb } from "../libs/db";
import { receitas, materiais, produtos } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const recipesController = {
  async create(req: Request, res: Response) {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const empresaId = (req as any).empresaId;

      // Verificar se o produto pertence à empresa
      const [produto] = await db.select().from(produtos)
        .where(and(eq(produtos.id, req.body.produtoId), eq(produtos.empresaId, empresaId)))
        .limit(1);
      if (!produto) throw new Error("Produto não encontrado");

      // Verificar se o material pertence à empresa
      const [material] = await db.select().from(materiais)
        .where(and(eq(materiais.id, req.body.materialId), eq(materiais.empresaId, empresaId)))
        .limit(1);
      if (!material) throw new Error("Material não encontrado");

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
      const empresaId = (req as any).empresaId;

      const productId = Number(req.params.productId);

      // Verificar que o produto pertence à empresa
      const [produto] = await db.select().from(produtos)
        .where(and(eq(produtos.id, productId), eq(produtos.empresaId, empresaId)))
        .limit(1);
      if (!produto) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      const productRecipes = await db
        .select({
          id: receitas.id,
          produtoId: receitas.produtoId,
          materialId: receitas.materialId,
          quantidade: receitas.quantidade,
          materialNome: materiais.nome,
          materialUnidade: materiais.unidade,
          custoUnitario: materiais.custoUnitario,
          estoqueDisponivel: materiais.estoque,
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
