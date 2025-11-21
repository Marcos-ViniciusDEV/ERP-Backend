import { getDb } from "../libs/db";
import { pedidosCompra } from "../../drizzle/schema";

export class PedidoCompraService {
  async create(data: typeof pedidosCompra.$inferInsert) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.insert(pedidosCompra).values(data);
  }

  async getAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(pedidosCompra);
  }
}

export const pedidoCompraService = new PedidoCompraService();
