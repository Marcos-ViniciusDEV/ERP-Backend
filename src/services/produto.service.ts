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

export class ProdutoService {
  /**
   * Lista todos os produtos
   */
  async list(): Promise<Produto[]> {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(produtos);
  }

  /**
   * Busca produto por ID
   */
  async getById(id: number): Promise<Produto | undefined> {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(produtos).where(eq(produtos.id, id)).limit(1);
    return result[0];
  }

  /**
   * Cria novo produto
   * Calcula preço de venda baseado na margem se não fornecido
   */
  async create(data: CreateProdutoInput): Promise<Produto | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Calcular preço de venda se não fornecido
    let precoVenda = data.precoVenda;
    if (!precoVenda && data.margemLucro) {
      precoVenda = data.precoCusto * (1 + data.margemLucro / 100);
    }

    // Verificar código duplicado
    const existing = await db.select().from(produtos).where(eq(produtos.codigo, data.codigo)).limit(1);
    if (existing.length > 0) {
      throw new Error(`Já existe um produto com o código ${data.codigo}`);
    }

    const [result] = await db.insert(produtos).values({
      ...data,
      precoVenda: precoVenda || data.precoCusto,
    });

    return this.getById(Number(result.insertId));
  }

  /**
   * Atualiza produto existente
   */
  async update(data: UpdateProdutoInput): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const produto = await this.getById(data.id);
    if (!produto) {
      throw new Error(`Produto ${data.id} não encontrado`);
    }

    // Verificar código duplicado
    if (data.codigo && data.codigo !== produto.codigo) {
      const existing = await db.select().from(produtos).where(eq(produtos.codigo, data.codigo)).limit(1);
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

    await db.update(produtos).set(payload).where(eq(produtos.id, id));
  }

  /**
   * Deleta produto
   * Remove movimentações antes de deletar (Cascade)
   */
  async delete(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const produto = await this.getById(id);
    if (!produto) {
      throw new Error(`Produto ${id} não encontrado`);
    }

    // Deletar movimentações do estoque antes de excluir o produto
    await db.delete(movimentacoesEstoque).where(eq(movimentacoesEstoque.produtoId, id));

    await db.delete(produtos).where(eq(produtos.id, id));
  }

  /**
   * Atualiza preços do produto recalculando margem
   */
  async updatePrecos(produtoId: number, precoCusto: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const produto = await this.getById(produtoId);
    if (!produto) {
      throw new Error(`Produto ${produtoId} não encontrado`);
    }

    // Calcular novo preço de venda baseado na margem de lucro
    const margemLucro = produto.margemLucro || 30;
    const precoVenda = Math.round(precoCusto * (1 + margemLucro / 100));

    await db.update(produtos).set({ precoCusto, precoVenda }).where(eq(produtos.id, produtoId));

    return { precoCusto, precoVenda, margemLucro };
  }

  /**
   * Verifica se produto tem estoque disponível
   */
  async checkEstoque(produtoId: number, quantidade: number): Promise<boolean> {
    const produto = await this.getById(produtoId);
    if (!produto) {
      throw new Error(`Produto ${produtoId} não encontrado`);
    }

    return produto.estoque >= quantidade;
  }

  /**
   * Busca produtos com estoque abaixo do mínimo
   */
  async produtosEstoqueBaixo(): Promise<Produto[]> {
    const produtos = await this.list();
    return produtos.filter((p) => p.estoque <= p.estoqueMinimo);
  }

  /**
   * Preenche dados da última compra baseado no histórico do Kardex
   */
  async backfillLastPurchaseData() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allProdutos = await this.list();
    let updatedCount = 0;

    for (const produto of allProdutos) {
      const lastEntry = await db
        .select()
        .from(movimentacoesEstoque)
        .where(
          and(
            eq(movimentacoesEstoque.produtoId, produto.id),
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
          .where(eq(produtos.id, produto.id));
        updatedCount++;
      }
    }

    return { success: true, updated: updatedCount, total: allProdutos.length };
  }
}

export const produtoService = new ProdutoService();
