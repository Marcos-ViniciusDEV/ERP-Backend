import { eq } from "drizzle-orm";
import { getDb } from "../libs/db";
import { fornecedores } from "../../drizzle/schema";

export class FornecedorService {
  async getAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(fornecedores);
  }

  async create(data: typeof fornecedores.$inferInsert) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.insert(fornecedores).values(data);
  }

  async update(id: number, data: Partial<typeof fornecedores.$inferInsert>) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(fornecedores).set(data).where(eq(fornecedores.id, id));
    return { success: true };
  }

  async delete(id: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(fornecedores).where(eq(fornecedores.id, id));
    return { success: true };
  }
}

export const fornecedorService = new FornecedorService();
