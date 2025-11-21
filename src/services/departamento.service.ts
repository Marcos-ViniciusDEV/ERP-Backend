import { getDb } from "../libs/db";
import { departamentos } from "../../drizzle/schema";

export class DepartamentoService {
  async getAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(departamentos);
  }

  async create(data: typeof departamentos.$inferInsert) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.insert(departamentos).values(data);
  }
}

export const departamentoService = new DepartamentoService();
