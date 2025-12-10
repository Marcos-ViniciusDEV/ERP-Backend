/**
 * @module VendaService
 * @description Serviço de lógica de negócio para Vendas
 *
 * Responsabilidades:
 * - Criação de vendas com validação de estoque
 * - Cálculo de totais e descontos
 * - Atualização de estoque via Kardex
 * - Geração de movimentações financeiras
 */

import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { getDb } from "../libs/db";
import { vendas, itensVenda, movimentacoesEstoque, movimentacoesCaixa, produtos, users } from "../../drizzle/schema";
import type { CreateVendaInput } from "../models/venda.model";
import * as produtoService from "./produto.service";
import { randomUUID } from "crypto";

/**
 * Lista todas as vendas com seus itens
 */
/**
 * Lista todas as vendas com seus itens e filtros
 */
export async function list(filters?: {
  dataInicio?: string;
  dataFim?: string;
  codigoBarras?: string;
  departamentoId?: number;
  fornecedorId?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      id: vendas.id,
      uuid: vendas.uuid,
      numeroVenda: vendas.numeroVenda,
      dataVenda: vendas.dataVenda,
      valorTotal: vendas.valorTotal,
      valorDesconto: vendas.valorDesconto,
      valorLiquido: vendas.valorLiquido,
      formaPagamento: vendas.formaPagamento,
      status: vendas.status,
      observacao: vendas.observacao,
      operadorId: vendas.operadorId,
      operadorNome: users.name, // Get name from users table
      createdAt: vendas.createdAt,
    })
    .from(vendas)
    .leftJoin(users, eq(vendas.operadorId, users.id))
    .$dynamic();

  const conditions = [];

  if (filters?.dataInicio) {
    const start = `${filters.dataInicio} 00:00:00`;
    conditions.push(sql`${vendas.dataVenda} >= ${start}`);
  }

  if (filters?.dataFim) {
    const end = `${filters.dataFim} 23:59:59`;
    conditions.push(sql`${vendas.dataVenda} <= ${end}`);
  }

  // Filtros complexos que exigem joins (Barcode, Dept, Supplier)
  // Como o drizzle não suporta facilmente filtro em tabela joinada retornando a tabela principal sem duplicatas
  // Vamos fazer em duas etapas se houver esses filtros:
  // 1. Buscar IDs das vendas que atendem aos critérios
  // 2. Buscar as vendas por esses IDs

  if (filters?.codigoBarras || filters?.departamentoId) {
    let subQuery = db
      .select({ vendaId: itensVenda.vendaId })
      .from(itensVenda)
      .innerJoin(produtos, eq(itensVenda.produtoId, produtos.id))
      .$dynamic();

    const subConditions = [];
    if (filters.codigoBarras) {
      subConditions.push(eq(produtos.codigoBarras, filters.codigoBarras));
    }
    if (filters.departamentoId) {
      subConditions.push(eq(produtos.departamentoId, filters.departamentoId));
    }

    if (subConditions.length > 0) {
      // @ts-ignore
      subQuery = subQuery.where(and(...subConditions));
      const matchingVendas = await subQuery;
      const vendaIds = matchingVendas.map((v) => v.vendaId);
      
      if (vendaIds.length === 0) return []; // Nenhum resultado
      
      // @ts-ignore
      conditions.push(inArray(vendas.id, vendaIds));
    }
  }

  if (conditions.length > 0) {
    // @ts-ignore
    query = query.where(and(...conditions));
  }

  const allVendas = await query.orderBy(desc(vendas.dataVenda));

  // Para cada venda, buscar seus itens com detalhes do produto
  const vendasComItens = await Promise.all(
    allVendas.map(async (venda) => {
      const itens = await db
        .select({
          id: itensVenda.id,
          vendaId: itensVenda.vendaId,
          produtoId: itensVenda.produtoId,
          produtoNome: produtos.descricao,
          departamentoId: produtos.departamentoId, // Added departamentoId
          quantidade: itensVenda.quantidade,
          precoUnitario: itensVenda.precoUnitario,
          total: itensVenda.valorTotal,
          desconto: itensVenda.valorDesconto,
        })
        .from(itensVenda)
        .leftJoin(produtos, eq(itensVenda.produtoId, produtos.id))
        .where(eq(itensVenda.vendaId, venda.id));

      return {
        ...venda,
        itens,
      };
    })
  );

  return vendasComItens;
}

/**
 * Cria nova venda
 * - Valida estoque de todos os produtos
 * - Calcula totais
 * - Cria movimentações de estoque
 * - Registra movimentação de caixa
 */
export async function create(data: CreateVendaInput, usuarioId: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validar estoque de todos os produtos
  for (const item of data.itens) {
    const temEstoque = await produtoService.checkEstoque(item.produtoId, item.quantidade);

    if (!temEstoque) {
      const produto = await produtoService.getById(item.produtoId);
      throw new Error(`Estoque insuficiente para ${produto?.descricao}. Disponível: ${produto?.estoque}`);
    }
  }

  // Calcular totais (valores em centavos)
  let valorTotal = 0;
  for (const item of data.itens) {
    const subtotal = item.quantidade * item.precoUnitario;
    valorTotal += subtotal;
  }

  const valorDesconto = data.desconto || 0;
  const valorLiquido = valorTotal - valorDesconto;

  // Gerar número da venda
  const numeroVenda = `V${Date.now()}`;

  // Criar venda
  const [vendaResult] = await db.insert(vendas).values({
    uuid: randomUUID(),
    numeroVenda,
    dataVenda: new Date(),
    valorTotal,
    valorDesconto,
    valorLiquido,
    formaPagamento: data.formaPagamento,
    status: "CONCLUIDA",
    observacao: data.observacoes,
    operadorId: usuarioId,
  });

  const vendaId = Number(vendaResult.insertId);

  // Criar itens da venda e movimentar estoque
  for (const item of data.itens) {
    const produto = await produtoService.getById(item.produtoId);
    if (!produto) continue;

    const valorTotalItem = item.quantidade * item.precoUnitario;
    const valorDescontoItem = item.desconto || 0;

    // Criar item da venda
    await db.insert(itensVenda).values({
      vendaId,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      valorTotal: valorTotalItem,
      valorDesconto: valorDescontoItem,
    });

    // Movimentar estoque (saída via VENDA_PDV)
    const saldoAnterior = produto.estoque;
    const saldoAtual = saldoAnterior - item.quantidade;

    await db.insert(movimentacoesEstoque).values({
      produtoId: item.produtoId,
      tipo: "VENDA_PDV",
      quantidade: -item.quantidade, // Negativo para saída
      saldoAnterior,
      saldoAtual,
      custoUnitario: item.precoUnitario,
      documentoReferencia: numeroVenda,
      usuarioId,
    });

    // Atualizar estoque do produto
    await db.update(produtos).set({ estoque: saldoAtual }).where(eq(produtos.id, item.produtoId));
  }

  // Registrar movimentação de caixa (entrada via ABERTURA)
  // TODO: Usar tipo correto para entrada de venda quando disponível no enum
  await db.insert(movimentacoesCaixa).values({
    tipo: "ABERTURA", // Temporário, ideal seria VENDA ou ENTRADA
    valor: valorLiquido,
    dataMovimento: new Date(),
    operadorId: usuarioId,
    observacao: `Venda ${numeroVenda}`,
  });

  return {
    id: vendaId,
    numeroVenda,
    dataVenda: new Date(),
    valorTotal,
    valorDesconto,
    valorLiquido,
    formaPagamento: data.formaPagamento,
    status: "CONCLUIDA",
    observacao: data.observacoes,
    operadorId: usuarioId,
  };
}

/**
 * Busca vendas por período
 */
export async function getByPeriodo(dataInicio: string, dataFim: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  // Buscar vendas no período usando comparação de timestamp string
  // Isso evita problemas de timezone e conversão de data
  
  // Se dataInicio não for fornecida, usar data muito antiga
  const startStr = dataInicio ? dataInicio : '1970-01-01';
  // Se dataFim não for fornecida, usar data muito futura (ou hoje 23:59:59)
  const endStr = dataFim ? dataFim : '2100-12-31';

  // Buscar vendas no período usando comparação direta de string SQL
  // Isso evita problemas de timezone do driver/ORM
  const start = `${startStr} 00:00:00`;
  const end = `${endStr} 23:59:59`;

  console.log("[VendaService] Searching between:", { start, end });

  const vendasFiltradas = await db
    .select()
    .from(vendas)
    .where(
      sql`${vendas.dataVenda} >= ${start} AND ${vendas.dataVenda} <= ${end}`
    )
    .orderBy(desc(vendas.dataVenda));

  // Para cada venda, buscar seus itens com detalhes do produto
  const vendasComItens = await Promise.all(
    vendasFiltradas.map(async (venda) => {
      const itens = await db
        .select({
          id: itensVenda.id,
          vendaId: itensVenda.vendaId,
          produtoId: itensVenda.produtoId,
          produtoNome: produtos.descricao,
          quantidade: itensVenda.quantidade,
          precoUnitario: itensVenda.precoUnitario,
          total: itensVenda.valorTotal,
          desconto: itensVenda.valorDesconto,
        })
        .from(itensVenda)
        .leftJoin(produtos, eq(itensVenda.produtoId, produtos.id))
        .where(eq(itensVenda.vendaId, venda.id));

      return {
        ...venda,
        itens,
      };
    })
  );

  return vendasComItens;
}

/**
 * Calcula total de vendas do dia
 */
export async function totalVendasHoje(): Promise<number> {
  const vendas = await list();
  const hoje = new Date().toDateString();

  return vendas.filter((v) => new Date(v.dataVenda).toDateString() === hoje).reduce((total, v) => total + v.valorLiquido, 0);
}
/**
 * Busca vendas por produto
 */
export async function getByProduto(produtoId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: vendas.id,
      numeroVenda: vendas.numeroVenda,
      dataVenda: vendas.dataVenda,
      quantidade: itensVenda.quantidade,
      precoUnitario: itensVenda.precoUnitario,
      valorTotal: itensVenda.valorTotal,
    })
    .from(itensVenda)
    .innerJoin(vendas, eq(itensVenda.vendaId, vendas.id))
    .where(eq(itensVenda.produtoId, produtoId))
    .orderBy(desc(vendas.dataVenda));
}

/**
 * Busca venda por ID ou Número
 */
export async function getById(idOrNumber: string | number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const isId = !isNaN(Number(idOrNumber));
  
  const query = db
    .select({
      id: vendas.id,
      uuid: vendas.uuid,
      numeroVenda: vendas.numeroVenda,
      dataVenda: vendas.dataVenda,
      valorTotal: vendas.valorTotal,
      valorDesconto: vendas.valorDesconto,
      valorLiquido: vendas.valorLiquido,
      formaPagamento: vendas.formaPagamento,
      status: vendas.status,
      observacao: vendas.observacao,
      operadorId: vendas.operadorId,
      operadorNome: users.name,
      createdAt: vendas.createdAt,
    })
    .from(vendas)
    .leftJoin(users, eq(vendas.operadorId, users.id));

  // @ts-ignore
  const whereClause = isId 
    ? eq(vendas.id, Number(idOrNumber))
    : eq(vendas.numeroVenda, String(idOrNumber));

  const vendaResult = await query.where(whereClause).limit(1);
  const venda = vendaResult[0];

  if (!venda) return null;

  // Buscar itens
  const itens = await db
    .select({
      id: itensVenda.id,
      vendaId: itensVenda.vendaId,
      produtoId: itensVenda.produtoId,
      produtoNome: produtos.descricao,
      quantidade: itensVenda.quantidade,
      precoUnitario: itensVenda.precoUnitario,
      total: itensVenda.valorTotal,
      desconto: itensVenda.valorDesconto,
    })
    .from(itensVenda)
    .leftJoin(produtos, eq(itensVenda.produtoId, produtos.id))
    .where(eq(itensVenda.vendaId, venda.id));

  return {
    ...venda,
    itens,
  };
}
