import { getDb } from "../libs/db";
import { pedidosCompra } from "../../drizzle/schema";

export async function create(data: typeof pedidosCompra.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(pedidosCompra).values(data);
}

export async function getAll() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pedidosCompra);
}
