import { eq, desc } from "drizzle-orm";
import { getDb } from "../libs/db";
import { movimentacoesEstoque, produtos } from "../../drizzle/schema";
import { CreateKardexInput } from "../models/kardex.model";

export class KardexService {
  async listByProduto(produtoId: number) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(movimentacoesEstoque).where(eq(movimentacoesEstoque.produtoId, produtoId));
  }

  async getAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(movimentacoesEstoque).orderBy(desc(movimentacoesEstoque.createdAt));
  }

  async create(data: CreateKardexInput, usuarioId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Inserir movimentação no Kardex
    const [result] = await db.insert(movimentacoesEstoque).values({
      ...data,
      usuarioId,
    });

    // Atualizar estoque do produto com o saldoAtual
    if (data.saldoAtual !== undefined && data.produtoId) {
      await db.update(produtos).set({ estoque: data.saldoAtual }).where(eq(produtos.id, data.produtoId));
    }

    return result;
  }
}

export const kardexService = new KardexService();
