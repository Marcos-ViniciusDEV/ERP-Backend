import { getDb } from "../libs/db";
import { salesGoals, vendas, itensVenda, produtos } from "../../drizzle/schema";
import { eq, and, sql, desc, sum } from "drizzle-orm";

/**
 * Calcula a Curva ABC de produtos
 * Baseado no volume de vendas (valor total)
 */
export async function calculateABC(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];

  const start = startDate ? `${startDate} 00:00:00` : '1970-01-01 00:00:00';
  const end = endDate ? `${endDate} 23:59:59` : '2100-12-31 23:59:59';

  // 1. Calcular vendas por produto
  const productSales = await db
    .select({
      produtoId: itensVenda.produtoId,
      produtoNome: produtos.descricao,
      totalVendido: sql<number>`sum(${itensVenda.valorTotal})`.mapWith(Number),
      quantidadeVendida: sql<number>`sum(${itensVenda.quantidade})`.mapWith(Number)
    })
    .from(itensVenda)
    .innerJoin(vendas, eq(itensVenda.vendaId, vendas.id))
    .innerJoin(produtos, eq(itensVenda.produtoId, produtos.id))
    .where(
      and(
        eq(vendas.status, 'CONCLUIDA'),
        sql`${vendas.dataVenda} >= ${start}`,
        sql`${vendas.dataVenda} <= ${end}`
      )
    )
    .groupBy(itensVenda.produtoId, produtos.descricao)
    .orderBy(desc(sql`sum(${itensVenda.valorTotal})`));

  // 2. Calcular total geral
  const totalRevenue = productSales.reduce((acc, item) => acc + item.totalVendido, 0);

  // 3. Classificar ABC
  let accumulatedRevenue = 0;
  
  return productSales.map(item => {
    accumulatedRevenue += item.totalVendido;
    const percentage = (accumulatedRevenue / totalRevenue) * 100;
    
    let classification = 'C';
    if (percentage <= 80) classification = 'A';
    else if (percentage <= 95) classification = 'B';

    return {
      ...item,
      percentageOfTotal: (item.totalVendido / totalRevenue) * 100,
      accumulatedPercentage: percentage,
      classification
    };
  });
}

/**
 * Define ou atualiza meta de vendas
 */
export async function upsertSalesGoal(month: number, year: number, targetAmount: number, sellerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.query.salesGoals.findFirst({
    where: and(
      eq(salesGoals.month, month),
      eq(salesGoals.year, year),
      sellerId ? eq(salesGoals.sellerId, sellerId) : sql`${salesGoals.sellerId} IS NULL`
    )
  });

  if (existing) {
    await db.update(salesGoals)
      .set({ targetAmount })
      .where(eq(salesGoals.id, existing.id));
    return { ...existing, targetAmount };
  } else {
    const [inserted] = await db.insert(salesGoals).values({
      month,
      year,
      targetAmount,
      sellerId
    }).$returningId();
    return { id: inserted.id, month, year, targetAmount, sellerId };
  }
}

/**
 * Busca performance de vendas vs metas
 */
export async function getSalesPerformance(month: number, year: number) {
  const db = await getDb();
  if (!db) return null;

  // Buscar meta geral (sem sellerId)
  const goal = await db.query.salesGoals.findFirst({
    where: and(
      eq(salesGoals.month, month),
      eq(salesGoals.year, year),
      sql`${salesGoals.sellerId} IS NULL`
    )
  });

  // Calcular vendas do mês
  // Construir datas strings para evitar problemas de timezone
  const startStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
  // Para o fim do mês, vamos simplificar pegando o primeiro dia do próximo mês e subtraindo 1 segundo, ou apenas usar lógica de string
  // Melhor usar SQL functions se possível, mas aqui vamos de string range simples
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01 00:00:00`;

  const salesResult = await db
    .select({
      total: sql<number>`sum(${vendas.valorLiquido})`.mapWith(Number)
    })
    .from(vendas)
    .where(
      and(
        eq(vendas.status, 'CONCLUIDA'),
        sql`${vendas.dataVenda} >= ${startStr}`,
        sql`${vendas.dataVenda} < ${endStr}`
      )
    );

  const totalSold = salesResult[0]?.total || 0;
  const target = goal?.targetAmount || 0;

  return {
    month,
    year,
    target,
    achieved: totalSold,
    percentage: target > 0 ? (totalSold / target) * 100 : 0,
    remaining: Math.max(0, target - totalSold)
  };
}
