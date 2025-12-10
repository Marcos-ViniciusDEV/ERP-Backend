import { getDb } from "../libs/db";
import {
  returns,
  returnItems,
  vendas,
  produtos,
  movimentacoesEstoque,
  movimentacoesCaixa,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

interface ReturnItemInput {
  productId: number;
  quantity: number;
  condition: "GOOD" | "DAMAGED";
}

interface CreateReturnInput {
  originalSaleId: number;
  reason: string;
  operatorId: number;
  items: ReturnItemInput[];
}

/**
 * Cria uma devolução
 */
export async function createReturn(input: CreateReturnInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Validar Venda Original
  const sale = await db.query.vendas.findFirst({
    where: eq(vendas.id, input.originalSaleId),
    with: {
      itens: true
    }
  });

  if (!sale) throw new Error("Venda original não encontrada");

  // 2. Calcular Valor de Reembolso e Validar Itens
  let totalRefunded = 0;
  const itemsToInsert: {
    produtoId: number;
    quantidade: number;
    condition: "GOOD" | "DAMAGED";
    unitPrice: number;
  }[] = [];

  for (const itemInput of input.items) {
    // @ts-ignore
    const saleItem = sale.itens.find(i => i.produtoId === itemInput.productId);
    if (!saleItem) throw new Error(`Produto ${itemInput.productId} não pertence a esta venda`);
    
    if (itemInput.quantity > saleItem.quantidade) {
       throw new Error(`Quantidade a devolver maior que a vendida para o produto ${itemInput.productId}`);
    }

    // Calcular reembolso baseado no preço unitário pago
    const refundAmount = saleItem.precoUnitario * itemInput.quantity;
    totalRefunded += refundAmount;

    itemsToInsert.push({
      produtoId: itemInput.productId,
      quantidade: itemInput.quantity,
      condition: itemInput.condition,
      unitPrice: saleItem.precoUnitario
    });
  }

  // 3. Transação
  return await db.transaction(async (tx) => {
    // Inserir Devolução
    const [returnRecord] = await tx.insert(returns).values({
      originalSaleId: input.originalSaleId,
      reason: input.reason,
      totalRefunded: totalRefunded,
      operatorId: input.operatorId,
    }).$returningId();

    // Inserir Itens da Devolução e Atualizar Estoque
    for (const item of itemsToInsert) {
      await tx.insert(returnItems).values({
        returnId: returnRecord.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        condition: item.condition
      });

      // Atualizar Estoque
      const product = await tx.query.produtos.findFirst({
        where: eq(produtos.id, item.produtoId)
      });

      if (product) {
        if (item.condition === 'GOOD') {
          // Retorna para estoque principal
          const novoSaldo = product.estoque + item.quantidade;
          
          await tx.update(produtos)
            .set({ estoque: novoSaldo })
            .where(eq(produtos.id, item.produtoId));
            
          // Registrar movimentação de estoque
          await tx.insert(movimentacoesEstoque).values({
            produtoId: item.produtoId,
            tipo: "DEVOLUCAO",
            quantidade: item.quantidade,
            saldoAnterior: product.estoque,
            saldoAtual: novoSaldo,
            custoUnitario: product.custoMedio || 0,
            documentoReferencia: `DEV-${returnRecord.id}`,
            observacao: `Devolução da Venda ${sale.numeroVenda}`,
            usuarioId: input.operatorId
          });
        } else {
           // Produto danificado vai para estoque de troca
           await tx.update(produtos)
            .set({ estoqueTroca: (product.estoqueTroca || 0) + item.quantidade })
            .where(eq(produtos.id, item.produtoId));
        }
      }
    }

    // Movimentação Financeira (Sangria/Estorno)
    await tx.insert(movimentacoesCaixa).values({
      tipo: "SANGRIA",
      valor: totalRefunded,
      operadorId: input.operatorId,
      observacao: `Estorno/Devolução Venda ${sale.numeroVenda}`,
      pdvId: sale.pdvId || "BACKEND"
    });

    return returnRecord;
  });
}

/**
 * Lista devoluções
 */
export async function listReturns() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.query.returns.findMany({
    with: {
      items: {
        with: {
          // @ts-ignore
          produto: true
        }
      }
    },
    orderBy: (returns, { desc }) => [desc(returns.createdAt)]
  });
}

/**
 * Busca devolução por ID
 */
export async function getReturnById(id: number) {
  const db = await getDb();
  if (!db) return null;

  return await db.query.returns.findFirst({
    where: eq(returns.id, id),
    with: {
      items: {
        with: {
          // @ts-ignore
          produto: true
        }
      }
    }
  });
}
