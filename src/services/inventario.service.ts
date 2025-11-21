import { eq } from "drizzle-orm";
import { getDb } from "../libs/db";
import { inventarios, inventariosItens } from "../../drizzle/schema";

export class InventarioService {
  async create(data: typeof inventarios.$inferInsert) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.insert(inventarios).values(data);
  }

  async getAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(inventarios);
  }

  async getById(id: number) {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(inventarios).where(eq(inventarios.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  async addItem(data: typeof inventariosItens.$inferInsert) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.insert(inventariosItens).values(data);
  }

  async getItens(inventarioId: number) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(inventariosItens).where(eq(inventariosItens.inventarioId, inventarioId));
  }
}

export const inventarioService = new InventarioService();
