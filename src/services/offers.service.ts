import { eq, and, lte, gte, desc } from "drizzle-orm";
import { getDb } from "../libs/db";
import { offers, type InsertOffer } from "../../drizzle/schema";

export const offersService = {
  async create(empresaId: number, data: InsertOffer) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    if (data.dataInicio >= data.dataFim) {
      throw new Error("A data de início deve ser anterior à data de fim.");
    }

    const [result] = await db.insert(offers).values({ ...data, empresaId }).$returningId();
    const [offer] = await db.select().from(offers).where(and(eq(offers.id, result.id), eq(offers.empresaId, empresaId)));
    return offer;
  },

  async getAll(empresaId: number) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(offers).where(eq(offers.empresaId, empresaId)).orderBy(desc(offers.createdAt));
  },

  async getActive(empresaId: number) {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();
    return db.select().from(offers).where(
      and(
        eq(offers.empresaId, empresaId),
        eq(offers.ativo, true),
        lte(offers.dataInicio, now),
        gte(offers.dataFim, now)
      )
    );
  },

  async delete(empresaId: number, id: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(offers).where(and(eq(offers.id, id), eq(offers.empresaId, empresaId)));
  }
};
