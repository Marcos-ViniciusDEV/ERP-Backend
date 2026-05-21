import { getDb } from "../libs/db";
import { salesGoals, expenseGoals, vendas, itensVenda, produtos, contasPagar, contasReceber } from "../../drizzle/schema";
import { eq, and, sql, desc, or } from "drizzle-orm";

/**
 * Calcula a Curva ABC de produtos
 * Baseado no volume de vendas (valor total)
 */
export async function calculateABC(empresaId: number, startDate?: string, endDate?: string) {
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
        eq(vendas.empresaId, empresaId),
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
export async function upsertSalesGoal(empresaId: number, month: number, year: number, targetAmount: number, sellerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.query.salesGoals.findFirst({
    where: and(
      eq(salesGoals.month, month),
      eq(salesGoals.year, year),
      eq(salesGoals.empresaId, empresaId),
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
      empresaId,
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
export async function getSalesPerformance(empresaId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return null;

  // Buscar meta geral (sem sellerId)
  const goal = await db.query.salesGoals.findFirst({
    where: and(
      eq(salesGoals.month, month),
      eq(salesGoals.year, year),
      eq(salesGoals.empresaId, empresaId),
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
        eq(vendas.empresaId, empresaId),
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

/**
 * Define ou atualiza meta mensal de despesas
 */
export async function upsertExpenseGoal(empresaId: number, month: number, year: number, targetAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.query.expenseGoals.findFirst({
    where: and(
      eq(expenseGoals.month, month),
      eq(expenseGoals.year, year),
      eq(expenseGoals.empresaId, empresaId)
    )
  });

  if (existing) {
    await db.update(expenseGoals)
      .set({ targetAmount })
      .where(eq(expenseGoals.id, existing.id));
    return { ...existing, targetAmount };
  }

  const [inserted] = await db.insert(expenseGoals).values({
    empresaId,
    month,
    year,
    targetAmount
  }).$returningId();

  return { id: inserted.id, month, year, targetAmount };
}

/**
 * Busca gastos realizados vs meta mensal de despesas
 */
export async function getExpensePerformance(empresaId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return null;

  const goal = await db.query.expenseGoals.findFirst({
    where: and(
      eq(expenseGoals.month, month),
      eq(expenseGoals.year, year),
      eq(expenseGoals.empresaId, empresaId)
    )
  });

  const startStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01 00:00:00`;

  const paidQuery = await db.select({
    total: sql<number>`sum(${contasPagar.valor})`.mapWith(Number)
  })
  .from(contasPagar)
  .where(
    and(
      eq(contasPagar.status, 'PAGO'),
      eq(contasPagar.empresaId, empresaId),
      sql`${contasPagar.dataPagamento} >= ${startStr}`,
      sql`${contasPagar.dataPagamento} < ${endStr}`
    )
  );

  const spent = paidQuery[0]?.total || 0;
  const target = goal?.targetAmount || 0;

  return {
    month,
    year,
    target,
    spent,
    percentage: target > 0 ? (spent / target) * 100 : 0,
    remainingBudget: Math.max(0, target - spent),
    exceeded: target > 0 && spent > target,
  };
}

/**
 * Retorna produtos encalhados (sem vendas nos últimos X dias)
 */
export async function getStaleProducts(empresaId: number, daysThreshold: number = 30) {
  const db = await getDb();
  if (!db) return [];

  // 1. Pegar última data de venda por produto
  const lastSales = await db.select({
    produtoId: itensVenda.produtoId,
    ultimaVenda: sql<string>`max(${vendas.dataVenda})`
  })
  .from(itensVenda)
  .innerJoin(vendas, eq(itensVenda.vendaId, vendas.id))
  .where(and(eq(vendas.status, 'CONCLUIDA'), eq(vendas.empresaId, empresaId)))
  .groupBy(itensVenda.produtoId);

  const lastSalesMap = new Map(lastSales.map(item => [item.produtoId, item.ultimaVenda]));

  // 2. Pegar produtos ativos com estoque
  const activeProducts = await db.select()
    .from(produtos)
    .where(
      and(
        eq(produtos.empresaId, empresaId),
        eq(produtos.ativo, true),
        sql`${produtos.estoque} > 0`
      )
    );

  const now = new Date().getTime();

  // 3. Filtrar e formatar
  const stale = activeProducts.map(p => {
    const ultima = lastSalesMap.get(p.id);
    let diasSemVenda = -1; // -1 significa que nunca foi vendido
    let ultimaVendaDate = null;
    
    if (ultima) {
      ultimaVendaDate = new Date(ultima);
      diasSemVenda = Math.floor((now - ultimaVendaDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      id: p.id,
      codigo: p.codigo,
      descricao: p.descricao,
      estoque: p.estoque,
      precoVenda: p.precoVenda,
      valorParado: p.estoque * p.precoVenda,
      diasSemVenda,
      ultimaVenda: ultima
    };
  }).filter(p => p.diasSemVenda >= daysThreshold || p.diasSemVenda === -1); // Filtra os que passaram do limite ou nunca venderam

  // Ordenar pelo valor financeiro parado (decrescente)
  return stale.sort((a, b) => b.valorParado - a.valorParado);
}

/**
 * Retorna o resumo financeiro aprimorado (Receitas vs Despesas e Fluxo de Caixa)
 */
export async function getFinancialSummary(empresaId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return null;

  const start = startDate ? `${startDate} 00:00:00` : '1970-01-01 00:00:00';
  const end = endDate ? `${endDate} 23:59:59` : '2100-12-31 23:59:59';

  // 1. Receitas de Vendas
  const salesRevenueQuery = await db.select({
    total: sql<number>`sum(${vendas.valorLiquido})`.mapWith(Number)
  })
  .from(vendas)
  .where(
    and(
      eq(vendas.status, 'CONCLUIDA'),
      eq(vendas.empresaId, empresaId),
      sql`${vendas.dataVenda} >= ${start}`,
      sql`${vendas.dataVenda} <= ${end}`
    )
  );
  const salesRevenue = salesRevenueQuery[0]?.total || 0;

  // 2. Contas a Receber (Recebido)
  const receivedQuery = await db.select({
    total: sql<number>`sum(${contasReceber.valor})`.mapWith(Number)
  })
  .from(contasReceber)
  .where(
    and(
      eq(contasReceber.status, 'RECEBIDO'),
      eq(contasReceber.empresaId, empresaId),
      sql`${contasReceber.dataRecebimento} >= ${start}`,
      sql`${contasReceber.dataRecebimento} <= ${end}`
    )
  );
  const receivedAmount = receivedQuery[0]?.total || 0;

  // 3. Contas a Receber (Pendente/Atrasado)
  const pendingReceivableQuery = await db.select({
    total: sql<number>`sum(${contasReceber.valor})`.mapWith(Number)
  })
  .from(contasReceber)
  .where(
    and(
      or(eq(contasReceber.status, 'PENDENTE'), eq(contasReceber.status, 'ATRASADO')),
      eq(contasReceber.empresaId, empresaId),
      sql`${contasReceber.dataVencimento} >= ${start}`,
      sql`${contasReceber.dataVencimento} <= ${end}`
    )
  );
  const pendingReceivable = pendingReceivableQuery[0]?.total || 0;

  // 4. Contas a Pagar (Pago)
  const paidQuery = await db.select({
    total: sql<number>`sum(${contasPagar.valor})`.mapWith(Number)
  })
  .from(contasPagar)
  .where(
    and(
      eq(contasPagar.status, 'PAGO'),
      eq(contasPagar.empresaId, empresaId),
      sql`${contasPagar.dataPagamento} >= ${start}`,
      sql`${contasPagar.dataPagamento} <= ${end}`
    )
  );
  const paidAmount = paidQuery[0]?.total || 0;

  // 5. Contas a Pagar (Pendente/Atrasado)
  const pendingPayableQuery = await db.select({
    total: sql<number>`sum(${contasPagar.valor})`.mapWith(Number)
  })
  .from(contasPagar)
  .where(
    and(
      or(eq(contasPagar.status, 'PENDENTE'), eq(contasPagar.status, 'ATRASADO')),
      eq(contasPagar.empresaId, empresaId),
      sql`${contasPagar.dataVencimento} >= ${start}`,
      sql`${contasPagar.dataVencimento} <= ${end}`
    )
  );
  const pendingPayable = pendingPayableQuery[0]?.total || 0;

  // 6. Agrupamento diário de Receitas vs Despesas (para o gráfico)
  const dailyVendas = await db.select({
    date: sql<string>`DATE(${vendas.dataVenda})`,
    amount: sql<number>`sum(${vendas.valorLiquido})`.mapWith(Number)
  })
  .from(vendas)
  .where(
    and(
      eq(vendas.status, 'CONCLUIDA'),
      eq(vendas.empresaId, empresaId),
      sql`${vendas.dataVenda} >= ${start}`,
      sql`${vendas.dataVenda} <= ${end}`
    )
  )
  .groupBy(sql`DATE(${vendas.dataVenda})`);

  const dailyPagos = await db.select({
    date: sql<string>`DATE(${contasPagar.dataPagamento})`,
    amount: sql<number>`sum(${contasPagar.valor})`.mapWith(Number)
  })
  .from(contasPagar)
  .where(
    and(
      eq(contasPagar.status, 'PAGO'),
      eq(contasPagar.empresaId, empresaId),
      sql`${contasPagar.dataPagamento} >= ${start}`,
      sql`${contasPagar.dataPagamento} <= ${end}`
    )
  )
  .groupBy(sql`DATE(${contasPagar.dataPagamento})`);

  // Consolidar em uma série temporal
  const timelineMap = new Map<string, { date: string, receitas: number, despesas: number }>();
  
  dailyVendas.forEach(item => {
    if (!item.date) return;
    const formattedDate = new Date(item.date).toLocaleDateString('pt-BR');
    timelineMap.set(formattedDate, { date: formattedDate, receitas: item.amount, despesas: 0 });
  });

  dailyPagos.forEach(item => {
    if (!item.date) return;
    const formattedDate = new Date(item.date).toLocaleDateString('pt-BR');
    const existing = timelineMap.get(formattedDate);
    if (existing) {
      existing.despesas = item.amount;
    } else {
      timelineMap.set(formattedDate, { date: formattedDate, receitas: 0, despesas: item.amount });
    }
  });

  const timeline = Array.from(timelineMap.values()).sort((a, b) => {
    const parseDate = (d: string) => {
      const [day, month, year] = d.split('/').map(Number);
      return new Date(year, month - 1, day).getTime();
    };
    return parseDate(a.date) - parseDate(b.date);
  });

  return {
    salesRevenue,
    receivedAmount,
    pendingReceivable,
    paidAmount,
    pendingPayable,
    totalReceitas: salesRevenue + receivedAmount,
    totalDespesas: paidAmount,
    saldoLiquido: (salesRevenue + receivedAmount) - paidAmount,
    saldoPrevisto: ((salesRevenue + receivedAmount) - paidAmount) + (pendingReceivable - pendingPayable),
    timeline
  };
}

