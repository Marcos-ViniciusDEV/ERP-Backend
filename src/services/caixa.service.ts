
import { getDb } from "../libs/db";
import { movimentacoesCaixa } from "../../drizzle/schema";

export async function create(data: typeof movimentacoesCaixa.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(movimentacoesCaixa).values(data);
}

export async function getAll() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(movimentacoesCaixa);
}
