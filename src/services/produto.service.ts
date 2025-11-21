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

import { eq } from "drizzle-orm";
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

    const { id, ...updateData } = data;
    await db.update(produtos).set(updateData).where(eq(produtos.id, id));
  }

  /**
   * Deleta produto
   * Valida se não tem movimentações antes de deletar
   */
  async delete(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const produto = await this.getById(id);
    if (!produto) {
      throw new Error(`Produto ${id} não encontrado`);
    }

    // Verificar se o produto tem movimentações no Kardex
    const movimentacoes = await db.select().from(movimentacoesEstoque).where(eq(movimentacoesEstoque.produtoId, id)).limit(1);

    if (movimentacoes.length > 0) {
      throw new Error("Não é possível excluir este produto pois ele possui movimentações de estoque registradas.");
    }

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
}

export const produtoService = new ProdutoService();
