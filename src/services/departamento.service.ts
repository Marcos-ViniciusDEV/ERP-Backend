import { getDb } from "../libs/db";
import { departamentos } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function getAll() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departamentos);
}

export async function create(data: typeof departamentos.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(departamentos).values(data);
}

export async function update(id: number, data: Partial<typeof departamentos.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // @ts-ignore
  return db.update(departamentos).set(data).where(eq(departamentos.id, id));
}

export async function remove(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // @ts-ignore
  return db.delete(departamentos).where(eq(departamentos.id, id));
}
