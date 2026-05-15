/**
 * @module ProdutoService
 * @description Serviço de lógica de negócio para Produtos
 *
 * Responsabilidades:
 * - Validação de regras de negócio
 * - Cálculos de preços e margem
 * - Verificação de estoque
 * - Orquestração de operações complexas
 */

import { eq, desc, and } from "drizzle-orm";
import { getDb } from "../libs/db";
import { produtos, movimentacoesEstoque } from "../../drizzle/schema";
import type { CreateProdutoInput, UpdateProdutoInput } from "../models/produto.model";
import type { Produto } from "../types/produto.types";

/**
 * Lista todos os produtos
 */
export async function list(empresaId: number): Promise<Produto[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(produtos).where(eq(produtos.empresaId, empresaId));
}

/**
 * Busca produto por ID
 */
export async function getById(empresaId: number, id: number): Promise<Produto | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(produtos).where(and(eq(produtos.id, id), eq(produtos.empresaId, empresaId))).limit(1);
  return result[0];
}

/**
 * Cria novo produto
 * Calcula preço de venda baseado na margem se não fornecido
 */
export async function create(empresaId: number, data: CreateProdutoInput): Promise<Produto | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calcular preço de venda se não fornecido
  let precoVenda = data.precoVenda;
  if (!precoVenda && data.margemLucro) {
    precoVenda = data.precoCusto * (1 + data.margemLucro / 100);
  }

  // Verificar código duplicado
  const existing = await db.select().from(produtos).where(and(eq(produtos.codigo, data.codigo), eq(produtos.empresaId, empresaId))).limit(1);
  if (existing.length > 0) {
    throw new Error(`Já existe um produto com o código ${data.codigo}`);
  }

  const finalPrecoVenda = precoVenda || data.precoCusto;

  const [result] = await db.insert(produtos).values({
    ...data,
    empresaId,
    precoVenda: finalPrecoVenda,
    precoPdv: finalPrecoVenda,
  });

  return getById(empresaId, Number(result.insertId));
}

/**
 * Atualiza produto existente
 */
export async function update(empresaId: number, data: UpdateProdutoInput): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const produto = await getById(empresaId, data.id);
  if (!produto) {
    throw new Error(`Produto ${data.id} não encontrado`);
  }

  // Verificar código duplicado
  if (data.codigo && data.codigo !== produto.codigo) {
    const existing = await db.select().from(produtos).where(and(eq(produtos.codigo, data.codigo), eq(produtos.empresaId, empresaId))).limit(1);
    if (existing.length > 0) {
      throw new Error(`Já existe um produto com o código ${data.codigo}`);
    }
  }

  const { id, ...updateData } = data;

  // Converte datas para objetos Date se forem strings
  const payload: any = { ...updateData };
  if (payload.dataUltimaCompra && typeof payload.dataUltimaCompra === 'string') {
    payload.dataUltimaCompra = new Date(payload.dataUltimaCompra);
  }
  if (payload.dataPrimeiraVenda && typeof payload.dataPrimeiraVenda === 'string') {
    payload.dataPrimeiraVenda = new Date(payload.dataPrimeiraVenda);
  }

  await db.update(produtos).set(payload).where(and(eq(produtos.id, id), eq(produtos.empresaId, empresaId)));
}

/**
 * Deleta produto
 * Remove movimentações antes de deletar (Cascade)
 */
export async function deleteProduto(empresaId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const produto = await getById(empresaId, id);
  if (!produto) {
    throw new Error(`Produto ${id} não encontrado`);
  }

  // Deletar movimentações do estoque antes de excluir o produto
  // Precisamos ter certeza que estamos apagando algo do tenant
  await db.delete(movimentacoesEstoque).where(and(eq(movimentacoesEstoque.produtoId, id), eq(movimentacoesEstoque.empresaId, empresaId)));

  await db.delete(produtos).where(and(eq(produtos.id, id), eq(produtos.empresaId, empresaId)));
}

/**
 * Atualiza preços do produto recalculando margem
 */
export async function updatePrecos(empresaId: number, produtoId: number, precoCusto: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const produto = await getById(empresaId, produtoId);
  if (!produto) {
    throw new Error(`Produto ${produtoId} não encontrado`);
  }

  // Calcular novo preço de venda baseado na margem de lucro
  const margemLucro = produto.margemLucro || 30;
  const precoVenda = Math.round(precoCusto * (1 + margemLucro / 100));

  await db.update(produtos).set({ precoCusto, precoVenda }).where(and(eq(produtos.id, produtoId), eq(produtos.empresaId, empresaId)));

  return { precoCusto, precoVenda, margemLucro };
}

/**
 * Verifica se produto tem estoque disponível
 */
export async function checkEstoque(empresaId: number, produtoId: number, quantidade: number): Promise<boolean> {
  const produto = await getById(empresaId, produtoId);
  if (!produto) {
    throw new Error(`Produto ${produtoId} não encontrado`);
  }

  return produto.estoque >= quantidade;
}

/**
 * Busca produtos com estoque abaixo do mínimo
 */
export async function produtosEstoqueBaixo(empresaId: number): Promise<Produto[]> {
  const produtos = await list(empresaId);
  return produtos.filter((p) => p.estoque <= p.estoqueMinimo);
}

/**
 * Preenche dados da última compra baseado no histórico do Kardex
 */
export async function backfillLastPurchaseData(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allProdutos = await list(empresaId);
  let updatedCount = 0;

  for (const produto of allProdutos) {
    const lastEntry = await db
      .select()
      .from(movimentacoesEstoque)
      .where(
        and(
          eq(movimentacoesEstoque.produtoId, produto.id),
          eq(movimentacoesEstoque.empresaId, empresaId),
          eq(movimentacoesEstoque.tipo, "ENTRADA_NFE")
        )
      )
      .orderBy(desc(movimentacoesEstoque.createdAt))
      .limit(1);

    if (lastEntry.length > 0) {
      const entry = lastEntry[0];
      await db
        .update(produtos)
        .set({
          dataUltimaCompra: entry.createdAt,
          quantidadeUltimaCompra: entry.quantidade,
        })
        .where(and(eq(produtos.id, produto.id), eq(produtos.empresaId, empresaId)));
      updatedCount++;
    }
  }

  return { success: true, updated: updatedCount, total: allProdutos.length };
}
