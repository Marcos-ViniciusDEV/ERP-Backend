import { getDb } from "../libs/db";
import { departamentos } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function getAll(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departamentos).where(eq(departamentos.empresaId, empresaId));
}

export async function create(empresaId: number, data: typeof departamentos.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(departamentos).values({ ...data, empresaId });
}

export async function update(empresaId: number, id: number, data: Partial<typeof departamentos.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // @ts-ignore
  return db.update(departamentos).set(data).where(and(eq(departamentos.id, id), eq(departamentos.empresaId, empresaId)));
}

export async function remove(empresaId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // @ts-ignore
  return db.delete(departamentos).where(and(eq(departamentos.id, id), eq(departamentos.empresaId, empresaId)));
}
