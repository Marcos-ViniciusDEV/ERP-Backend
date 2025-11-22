import { eq, desc, inArray } from "drizzle-orm";
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

    // Se for entrada de NFe, definir status como PENDENTE_CONFERENCIA
    const statusConferencia = data.tipo === "ENTRADA_NFE" ? "PENDENTE_CONFERENCIA" : undefined;

    // Inserir movimentação no Kardex
    const [result] = await db.insert(movimentacoesEstoque).values({
      ...data,
      usuarioId,
      statusConferencia,
    });

    // Atualizar estoque do produto SOMENTE se NÃO for PENDENTE_CONFERENCIA
    // Quando for PENDENTE_CONFERENCIA, o estoque será atualizado após a conferência
    if (statusConferencia !== "PENDENTE_CONFERENCIA" && data.saldoAtual !== undefined && data.produtoId) {
      await db.update(produtos).set({ estoque: data.saldoAtual }).where(eq(produtos.id, data.produtoId));
    }

    // Se for ENTRADA_NFE, atualizar data e quantidade da última compra no produto
    // Isso é feito independentemente do status da conferência, pois a compra já ocorreu
    if (data.tipo === "ENTRADA_NFE" && data.produtoId) {
      await db
        .update(produtos)
        .set({
          dataUltimaCompra: new Date(),
          quantidadeUltimaCompra: data.quantidade,
        })
        .where(eq(produtos.id, data.produtoId));
    }

    return result;
  }

  async deleteByDocumento(documento: string) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Buscar movimentações para verificar se precisa reverter estoque
    const movs = await db
      .select()
      .from(movimentacoesEstoque)
      .where(eq(movimentacoesEstoque.documentoReferencia, documento));

    for (const mov of movs) {
      // Se o status NÃO for PENDENTE_CONFERENCIA, significa que o estoque foi atualizado
      // Então precisamos reverter (subtrair a quantidade da entrada)
      if (mov.statusConferencia !== "PENDENTE_CONFERENCIA" && mov.tipo === "ENTRADA_NFE") {
        const [produto] = await db.select().from(produtos).where(eq(produtos.id, mov.produtoId));

        if (produto) {
          await db
            .update(produtos)
            .set({ estoque: produto.estoque - mov.quantidade })
            .where(eq(produtos.id, mov.produtoId));
        }
      }
    }

    // Deletar as movimentações
    await db
      .delete(movimentacoesEstoque)
      .where(eq(movimentacoesEstoque.documentoReferencia, documento));

    return { success: true };
  }

  async deleteBatch(ids: number[]) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Buscar movimentações para verificar se precisa reverter estoque
    const movs = await db
      .select()
      .from(movimentacoesEstoque)
      .where(inArray(movimentacoesEstoque.id, ids));

    for (const mov of movs) {
      // Se o status NÃO for PENDENTE_CONFERENCIA, significa que o estoque foi atualizado
      // Então precisamos reverter (subtrair a quantidade da entrada)
      if (mov.statusConferencia !== "PENDENTE_CONFERENCIA" && mov.tipo === "ENTRADA_NFE") {
        const [produto] = await db.select().from(produtos).where(eq(produtos.id, mov.produtoId));

        if (produto) {
          await db
            .update(produtos)
            .set({ estoque: produto.estoque - mov.quantidade })
            .where(eq(produtos.id, mov.produtoId));
        }
      }
    }

    // Deletar as movimentações
    await db
      .delete(movimentacoesEstoque)
      .where(inArray(movimentacoesEstoque.id, ids));

    return { success: true };
  }
}

export const kardexService = new KardexService();
