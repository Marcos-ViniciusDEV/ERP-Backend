
import { getDb } from "../libs/db";
import { movimentacoesCaixa } from "../../drizzle/schema";

export class CaixaService {
  async create(data: typeof movimentacoesCaixa.$inferInsert) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.insert(movimentacoesCaixa).values(data);
  }

  async getAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(movimentacoesCaixa);
  }
}

export const caixaService = new CaixaService();
