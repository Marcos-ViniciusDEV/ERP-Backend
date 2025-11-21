import { getDb } from "../libs/db";
import { contasPagar, contasReceber } from "../../drizzle/schema";

export class FinanceiroService {
  // Contas a Pagar
  async createContaPagar(data: typeof contasPagar.$inferInsert) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.insert(contasPagar).values(data);
  }

  async getAllContasPagar() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(contasPagar);
  }

  // Contas a Receber
  async createContaReceber(data: typeof contasReceber.$inferInsert) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.insert(contasReceber).values(data);
  }

  async getAllContasReceber() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(contasReceber);
  }
}

export const financeiroService = new FinanceiroService();
