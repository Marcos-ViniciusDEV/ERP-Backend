import { eq, and } from "drizzle-orm";
import { getDb } from "../libs/db";
import { fornecedores } from "../../drizzle/schema";

export async function getAll(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fornecedores).where(eq(fornecedores.empresaId, empresaId));
}

export async function create(empresaId: number, data: typeof fornecedores.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(fornecedores).values({ ...data, empresaId });
}

export async function update(empresaId: number, id: number, data: Partial<typeof fornecedores.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(fornecedores).set(data).where(and(eq(fornecedores.id, id), eq(fornecedores.empresaId, empresaId)));
  return { success: true };
}

export async function deleteFornecedor(empresaId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(fornecedores).where(and(eq(fornecedores.id, id), eq(fornecedores.empresaId, empresaId)));
  return { success: true };
}
