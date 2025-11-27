import { eq } from "drizzle-orm";
import { getDb } from "../libs/db";
import { fornecedores } from "../../drizzle/schema";

export async function getAll() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fornecedores);
}

export async function create(data: typeof fornecedores.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(fornecedores).values(data);
}

export async function update(id: number, data: Partial<typeof fornecedores.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(fornecedores).set(data).where(eq(fornecedores.id, id));
  return { success: true };
}

export async function deleteFornecedor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(fornecedores).where(eq(fornecedores.id, id));
  return { success: true };
}
