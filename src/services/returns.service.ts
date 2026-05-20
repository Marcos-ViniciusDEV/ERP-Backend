import { and, desc, eq, or } from "drizzle-orm";
import {
  itensVenda,
  movimentacoesCaixa,
  movimentacoesEstoque,
  produtos,
  returnItems,
  returns,
  users,
  vendas,
} from "../../drizzle/schema";
import { getDb } from "../libs/db";

type ReturnCondition = "GOOD" | "DAMAGED";
type ReturnOperation = "DEVOLUCAO" | "TROCA";

interface ReturnItemInput {
  productId: number;
  quantity: number;
  condition: ReturnCondition;
}

interface CreateReturnInput {
  originalSaleId: number;
  operation: ReturnOperation;
  reason: string;
  operatorId: number;
  items: ReturnItemInput[];
}

function normalizeOperation(operation?: string): ReturnOperation {
  return operation === "TROCA" ? "TROCA" : "DEVOLUCAO";
}

function getCouponCandidates(cupom: string) {
  const value = String(cupom || "").trim();
  const numeric = value.replace(/\D/g, "");
  const candidates = [value];

  if (numeric) {
    candidates.push(numeric, numeric.padStart(6, "0"));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

async function getReturnedQuantities(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, saleId: number) {
  const rows = await db
    .select({
      produtoId: returnItems.produtoId,
      quantidade: returnItems.quantidade,
    })
    .from(returnItems)
    .innerJoin(returns, eq(returnItems.returnId, returns.id))
    .where(eq(returns.originalSaleId, saleId));

  return rows.reduce<Record<number, number>>((acc, row) => {
    acc[row.produtoId] = (acc[row.produtoId] || 0) + row.quantidade;
    return acc;
  }, {});
}

async function loadSaleWithItems(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, empresaId: number, whereClause: any) {
  const saleRows = await db
    .select({
      id: vendas.id,
      uuid: vendas.uuid,
      numeroVenda: vendas.numeroVenda,
      ccf: vendas.ccf,
      coo: vendas.coo,
      pdvId: vendas.pdvId,
      dataVenda: vendas.dataVenda,
      valorTotal: vendas.valorTotal,
      valorDesconto: vendas.valorDesconto,
      valorLiquido: vendas.valorLiquido,
      formaPagamento: vendas.formaPagamento,
      status: vendas.status,
      nfceNumero: vendas.nfceNumero,
      nfceChave: vendas.nfceChave,
      operadorId: vendas.operadorId,
      operadorNome: vendas.operadorNome,
      createdAt: vendas.createdAt,
      empresaId: vendas.empresaId,
    })
    .from(vendas)
    .where(and(eq(vendas.empresaId, empresaId), whereClause))
    .limit(1);

  const sale = saleRows[0];
  if (!sale) return null;

  const returnedQuantities = await getReturnedQuantities(db, sale.id);
  const items = await db
    .select({
      id: itensVenda.id,
      vendaId: itensVenda.vendaId,
      produtoId: itensVenda.produtoId,
      produtoCodigo: produtos.codigo,
      produtoCodigoBarras: produtos.codigoBarras,
      produtoNome: produtos.descricao,
      quantidade: itensVenda.quantidade,
      precoUnitario: itensVenda.precoUnitario,
      total: itensVenda.valorTotal,
      desconto: itensVenda.valorDesconto,
    })
    .from(itensVenda)
    .leftJoin(produtos, eq(itensVenda.produtoId, produtos.id))
    .where(eq(itensVenda.vendaId, sale.id));

  return {
    ...sale,
    itens: items.map((item) => {
      const returnedQuantity = returnedQuantities[item.produtoId] || 0;
      return {
        ...item,
        returnedQuantity,
        availableQuantity: Math.max(0, item.quantidade - returnedQuantity),
      };
    }),
  };
}

export async function findSaleByFiscalCoupon(empresaId: number, cupom: string) {
  const db = await getDb();
  if (!db) return null;

  const value = String(cupom || "").trim();
  const candidates = getCouponCandidates(value);
  const conditions = candidates.flatMap((candidate) => [
    eq(vendas.numeroVenda, candidate),
    eq(vendas.ccf, candidate),
    eq(vendas.coo, candidate),
    eq(vendas.nfceNumero, candidate),
    eq(vendas.nfceChave, candidate),
  ]);

  if (/^\d+$/.test(value)) {
    conditions.push(eq(vendas.id, Number(value)));
  }

  return loadSaleWithItems(db, empresaId, or(...conditions));
}

export async function createReturn(empresaId: number, input: CreateReturnInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sale = await loadSaleWithItems(db, empresaId, eq(vendas.id, input.originalSaleId));
  if (!sale) throw new Error("Venda original não encontrada");
  if (sale.status === "CANCELADA") throw new Error("Não é possível devolver uma venda cancelada");

  const operation = normalizeOperation(input.operation);
  const operationLabel = operation === "TROCA" ? "Troca" : "Devolução";
  let totalRefunded = 0;

  const itemsToInsert = input.items.map((itemInput) => {
    const saleItem = sale.itens.find((item) => item.produtoId === itemInput.productId);
    if (!saleItem) throw new Error(`Produto ${itemInput.productId} não pertence a esta venda`);
    if (itemInput.quantity > saleItem.availableQuantity) {
      throw new Error(`Quantidade maior que o saldo disponível para ${saleItem.produtoNome || itemInput.productId}`);
    }

    totalRefunded += saleItem.precoUnitario * itemInput.quantity;
    return {
      produtoId: itemInput.productId,
      quantidade: itemInput.quantity,
      condition: itemInput.condition,
      unitPrice: saleItem.precoUnitario,
    };
  });

  return db.transaction(async (tx) => {
    const [returnRecord] = await tx
      .insert(returns)
      .values({
        originalSaleId: input.originalSaleId,
        reason: `${operationLabel}: ${input.reason}`,
        totalRefunded,
        operatorId: input.operatorId,
      })
      .$returningId();

    for (const item of itemsToInsert) {
      await tx.insert(returnItems).values({
        returnId: returnRecord.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        condition: item.condition,
      });

      const [product] = await tx
        .select()
        .from(produtos)
        .where(and(eq(produtos.id, item.produtoId), eq(produtos.empresaId, empresaId)))
        .limit(1);

      if (!product) continue;

      if (item.condition === "GOOD") {
        const novoSaldo = product.estoque + item.quantidade;

        await tx
          .update(produtos)
          .set({ estoque: novoSaldo })
          .where(and(eq(produtos.id, item.produtoId), eq(produtos.empresaId, empresaId)));

        await tx.insert(movimentacoesEstoque).values({
          empresaId,
          produtoId: item.produtoId,
          tipo: "DEVOLUCAO",
          quantidade: item.quantidade,
          saldoAnterior: product.estoque,
          saldoAtual: novoSaldo,
          custoUnitario: product.custoMedio || product.precoCusto || 0,
          documentoReferencia: `${operation === "TROCA" ? "TROCA" : "DEV"}-${returnRecord.id}`,
          observacao: `${operationLabel} do cupom ${sale.numeroVenda}`,
          usuarioId: input.operatorId,
        });
      } else {
        await tx
          .update(produtos)
          .set({ estoqueTroca: (product.estoqueTroca || 0) + item.quantidade })
          .where(and(eq(produtos.id, item.produtoId), eq(produtos.empresaId, empresaId)));
      }
    }

    if (operation === "DEVOLUCAO" && totalRefunded > 0) {
      await tx.insert(movimentacoesCaixa).values({
        empresaId,
        tipo: "SANGRIA",
        valor: totalRefunded,
        operadorId: input.operatorId,
        observacao: `Estorno da venda ${sale.numeroVenda}`,
        pdvId: sale.pdvId || "BACKEND",
      });
    }

    const exchangeNote =
      operation === "TROCA"
        ? {
            numero: `NT-${String(returnRecord.id).padStart(6, "0")}`,
            valor: totalRefunded,
            vendaOrigem: sale.numeroVenda,
            emitidaEm: new Date(),
            observacao: "Crédito de troca para usar como dinheiro em uma próxima compra.",
          }
        : null;

    return {
      id: returnRecord.id,
      operation,
      totalRefunded,
      exchangeNote,
    };
  });
}

export async function listReturns(empresaId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: returns.id,
      originalSaleId: returns.originalSaleId,
      reason: returns.reason,
      totalRefunded: returns.totalRefunded,
      operatorId: returns.operatorId,
      createdAt: returns.createdAt,
      numeroVenda: vendas.numeroVenda,
      ccf: vendas.ccf,
      coo: vendas.coo,
      pdvId: vendas.pdvId,
      operadorNome: users.name,
    })
    .from(returns)
    .innerJoin(vendas, eq(returns.originalSaleId, vendas.id))
    .leftJoin(users, eq(returns.operatorId, users.id))
    .where(eq(vendas.empresaId, empresaId))
    .orderBy(desc(returns.createdAt));

  return Promise.all(
    rows.map(async (row) => {
      const items = await db
        .select({
          id: returnItems.id,
          returnId: returnItems.returnId,
          produtoId: returnItems.produtoId,
          produtoNome: produtos.descricao,
          quantidade: returnItems.quantidade,
          condition: returnItems.condition,
        })
        .from(returnItems)
        .leftJoin(produtos, eq(returnItems.produtoId, produtos.id))
        .where(eq(returnItems.returnId, row.id));

      return {
        ...row,
        operation: row.reason.startsWith("Troca:") ? "TROCA" : "DEVOLUCAO",
        items,
      };
    })
  );
}

export async function getReturnById(empresaId: number, id: number) {
  const records = await listReturns(empresaId);
  return records.find((record) => record.id === id) || null;
}
