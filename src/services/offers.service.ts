import { eq, and, lte, gte, desc } from "drizzle-orm";
import { getDb } from "../libs/db";
import { offers, type InsertOffer } from "../../drizzle/schema";

export const offersService = {
  async create(data: InsertOffer) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    if (data.dataInicio >= data.dataFim) {
      throw new Error("A data de início deve ser anterior à data de fim.");
    }

    const [result] = await db.insert(offers).values(data).$returningId();
    const [offer] = await db.select().from(offers).where(eq(offers.id, result.id));
    return offer;
  },

  async getAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(offers).orderBy(desc(offers.createdAt));
  },

  async getActive() {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();
    return db.select().from(offers).where(
      and(
        eq(offers.ativo, true),
        lte(offers.dataInicio, now),
        gte(offers.dataFim, now)
      )
    );
  },

  async delete(id: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(offers).where(eq(offers.id, id));
  }
};
