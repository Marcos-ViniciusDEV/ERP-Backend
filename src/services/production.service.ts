import { eq, sql } from "drizzle-orm";
import { getDb } from "../libs/db";
import { producao, receitas, materiais, type InsertProducao } from "../../drizzle/schema";

export const productionService = {
  async registerProduction(data: InsertProducao) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db.transaction(async (tx) => {
      // 1. Registrar produção
      const [result] = await tx.insert(producao).values(data).$returningId();
      const [productionRecord] = await tx.select().from(producao).where(eq(producao.id, result.id));

      // 2. Buscar receita do produto
      const productRecipes = await tx
        .select()
        .from(receitas)
        .where(eq(receitas.produtoId, data.produtoId));

      // 3. Baixar estoque dos materiais
      for (const recipe of productRecipes) {
        const amountToDeduct = recipe.quantidade * data.quantidade;
        
        await tx
          .update(materiais)
          .set({ 
            estoque: sql`${materiais.estoque} - ${amountToDeduct}` 
          })
          .where(eq(materiais.id, recipe.materialId));
      }

      return productionRecord;
    });
  }
};
