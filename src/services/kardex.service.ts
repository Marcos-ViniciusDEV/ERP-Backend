import { eq, desc, inArray, and } from "drizzle-orm";
import { getDb } from "../libs/db";
import { movimentacoesEstoque, produtos, users } from "../../drizzle/schema";
import { CreateKardexInput } from "../models/kardex.model";

export async function listByProduto(empresaId: number, produtoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: movimentacoesEstoque.id,
      produtoId: movimentacoesEstoque.produtoId,
      tipo: movimentacoesEstoque.tipo,
      quantidade: movimentacoesEstoque.quantidade,
      saldoAnterior: movimentacoesEstoque.saldoAnterior,
      saldoAtual: movimentacoesEstoque.saldoAtual,
      custoUnitario: movimentacoesEstoque.custoUnitario,
      documentoReferencia: movimentacoesEstoque.documentoReferencia,
      fornecedor: movimentacoesEstoque.fornecedor,
      numeroTransacao: movimentacoesEstoque.numeroTransacao,
      observacao: movimentacoesEstoque.observacao,
      statusConferencia: movimentacoesEstoque.statusConferencia,
      usuarioId: movimentacoesEstoque.usuarioId,
      createdAt: movimentacoesEstoque.createdAt,
      usuarioNome: users.name,
    })
    .from(movimentacoesEstoque)
    .leftJoin(users, eq(movimentacoesEstoque.usuarioId, users.id))
    .where(and(eq(movimentacoesEstoque.produtoId, produtoId), eq(movimentacoesEstoque.empresaId, empresaId)))
    .orderBy(desc(movimentacoesEstoque.createdAt));
}

export async function getAll(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(movimentacoesEstoque).where(eq(movimentacoesEstoque.empresaId, empresaId)).orderBy(desc(movimentacoesEstoque.createdAt));
}

export async function create(empresaId: number, data: CreateKardexInput, usuarioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Se for entrada de NFe, definir status como PENDENTE_CONFERENCIA
  const statusConferencia = data.tipo === "ENTRADA_NFE" ? "PENDENTE_CONFERENCIA" : undefined;

  // Inserir movimentação no Kardex
  const [result] = await db.insert(movimentacoesEstoque).values({
    ...data,
    empresaId,
    usuarioId,
    statusConferencia,
  });

  // Atualizar estoque do produto SOMENTE se NÃO for PENDENTE_CONFERENCIA
  // Quando for PENDENTE_CONFERENCIA, o estoque será atualizado após a conferência
  if (statusConferencia !== "PENDENTE_CONFERENCIA" && data.saldoAtual !== undefined && data.produtoId) {
    await db.update(produtos).set({ estoque: data.saldoAtual }).where(and(eq(produtos.id, data.produtoId), eq(produtos.empresaId, empresaId)));
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
      .where(and(eq(produtos.id, data.produtoId), eq(produtos.empresaId, empresaId)));
  }

  return result;
}

export async function deleteByDocumento(empresaId: number, documento: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar movimentações para verificar se precisa reverter estoque
  const movs = await db
    .select()
    .from(movimentacoesEstoque)
    .where(and(eq(movimentacoesEstoque.documentoReferencia, documento), eq(movimentacoesEstoque.empresaId, empresaId)));

  for (const mov of movs) {
    // Se o status NÃO for PENDENTE_CONFERENCIA, significa que o estoque foi atualizado
    // Então precisamos reverter (subtrair a quantidade da entrada)
    if (mov.statusConferencia !== "PENDENTE_CONFERENCIA" && mov.tipo === "ENTRADA_NFE") {
      const [produto] = await db.select().from(produtos).where(and(eq(produtos.id, mov.produtoId), eq(produtos.empresaId, empresaId)));

      if (produto) {
        await db
          .update(produtos)
          .set({ estoque: produto.estoque - mov.quantidade })
          .where(and(eq(produtos.id, mov.produtoId), eq(produtos.empresaId, empresaId)));
      }
    }
  }

  await db
    .delete(movimentacoesEstoque)
    .where(and(eq(movimentacoesEstoque.documentoReferencia, documento), eq(movimentacoesEstoque.empresaId, empresaId)));

  return { success: true };
}

export async function deleteBatch(empresaId: number, ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar movimentações para verificar se precisa reverter estoque
  const movs = await db
    .select()
    .from(movimentacoesEstoque)
    .where(and(inArray(movimentacoesEstoque.id, ids), eq(movimentacoesEstoque.empresaId, empresaId)));

  for (const mov of movs) {
    // Se o status NÃO for PENDENTE_CONFERENCIA, significa que o estoque foi atualizado
    // Então precisamos reverter (subtrair a quantidade da entrada)
    if (mov.statusConferencia !== "PENDENTE_CONFERENCIA" && mov.tipo === "ENTRADA_NFE") {
      const [produto] = await db.select().from(produtos).where(and(eq(produtos.id, mov.produtoId), eq(produtos.empresaId, empresaId)));

      if (produto) {
        await db
          .update(produtos)
          .set({ estoque: produto.estoque - mov.quantidade })
          .where(and(eq(produtos.id, mov.produtoId), eq(produtos.empresaId, empresaId)));
      }
    }
  }

  await db
    .delete(movimentacoesEstoque)
    .where(and(inArray(movimentacoesEstoque.id, ids), eq(movimentacoesEstoque.empresaId, empresaId)));

  return { success: true };
}
