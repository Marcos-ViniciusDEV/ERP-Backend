import { getDb } from "../libs/db";
import { contasPagar, contasReceber } from "../../drizzle/schema";

// Contas a Pagar
export async function createContaPagar(data: typeof contasPagar.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(contasPagar).values(data);
}

export async function getAllContasPagar() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contasPagar);
}

// Contas a Receber
export async function createContaReceber(data: typeof contasReceber.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(contasReceber).values(data);
}

export async function getAllContasReceber() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contasReceber);
}
