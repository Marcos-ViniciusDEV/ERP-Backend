import { getDb } from "../libs/db";
import {
  salesGoals,
  expenseGoals,
  vendas,
  itensVenda,
  produtos,
  contasPagar,
  contasReceber,
  users,
  clientes,
} from "../../drizzle/schema";
import { eq, and, sql, desc, or, asc } from "drizzle-orm";

type AnalyticsFilters = {
  startDate?: string;
  endDate?: string;
  pdvId?: string;
  formaPagamento?: string;
  produtoId?: number;
  departamentoId?: number;
  operadorId?: number;
  limit?: number;
  marginThreshold?: number;
  days?: number;
  leadTimeDays?: number;
};

const dateRange = (startDate?: string, endDate?: string) => ({
  start: startDate ? `${startDate} 00:00:00` : "1970-01-01 00:00:00",
  end: endDate ? `${endDate} 23:59:59` : "2100-12-31 23:59:59",
});

const percent = (value: number, total: number) => total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0;

const saleConditions = (empresaId: number, filters: AnalyticsFilters = {}, onlyCompleted = true) => {
  const { start, end } = dateRange(filters.startDate, filters.endDate);
  const conditions = [
    eq(vendas.empresaId, empresaId),
    sql`${vendas.dataVenda} >= ${start}`,
    sql`${vendas.dataVenda} <= ${end}`,
  ];
  if (onlyCompleted) conditions.push(eq(vendas.status, "CONCLUIDA"));
  if (filters.pdvId) conditions.push(eq(vendas.pdvId, filters.pdvId));
  if (filters.formaPagamento) conditions.push(eq(vendas.formaPagamento, filters.formaPagamento));
  if (filters.operadorId) conditions.push(eq(vendas.operadorId, filters.operadorId));
  return conditions;
};

const costExpression = sql<number>`coalesce(nullif(${produtos.custoMedio}, 0), nullif(${produtos.precoCusto}, 0), 0)`;
const itemNetExpression = sql<number>`(${itensVenda.valorTotal} - ${itensVenda.valorDesconto})`;

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

export async function getDre(empresaId: number, filters: AnalyticsFilters = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { start, end } = dateRange(filters.startDate, filters.endDate);

  const [sales] = await db.select({
    receitaBruta: sql<number>`coalesce(sum(${vendas.valorTotal}), 0)`.mapWith(Number),
    descontos: sql<number>`coalesce(sum(${vendas.valorDesconto}), 0)`.mapWith(Number),
    receitaLiquida: sql<number>`coalesce(sum(${vendas.valorLiquido}), 0)`.mapWith(Number),
    totalVendas: sql<number>`count(*)`.mapWith(Number),
  })
    .from(vendas)
    .where(and(...saleConditions(empresaId, filters, true)));

  const [cancelled] = await db.select({
    cancelamentos: sql<number>`coalesce(sum(${vendas.valorLiquido}), 0)`.mapWith(Number),
    totalCancelamentos: sql<number>`count(*)`.mapWith(Number),
  })
    .from(vendas)
    .where(and(...saleConditions(empresaId, filters, false), eq(vendas.status, "CANCELADA")));

  const itemFilters = [...saleConditions(empresaId, filters, true)];
  if (filters.produtoId) itemFilters.push(eq(itensVenda.produtoId, filters.produtoId));
  if (filters.departamentoId) itemFilters.push(eq(produtos.departamentoId, filters.departamentoId));

  const [costs] = await db.select({
    custoMercadorias: sql<number>`coalesce(sum(${itensVenda.quantidade} * ${costExpression}), 0)`.mapWith(Number),
    receitaItens: sql<number>`coalesce(sum(${itemNetExpression}), 0)`.mapWith(Number),
  })
    .from(itensVenda)
    .innerJoin(vendas, eq(itensVenda.vendaId, vendas.id))
    .innerJoin(produtos, eq(itensVenda.produtoId, produtos.id))
    .where(and(...itemFilters));

  const [expenses] = await db.select({
    despesasOperacionais: sql<number>`coalesce(sum(${contasPagar.valor}), 0)`.mapWith(Number),
  })
    .from(contasPagar)
    .where(and(
      eq(contasPagar.empresaId, empresaId),
      eq(contasPagar.status, "PAGO"),
      sql`${contasPagar.dataPagamento} >= ${start}`,
      sql`${contasPagar.dataPagamento} <= ${end}`,
    ));

  const receitaBruta = sales?.receitaBruta ?? 0;
  const descontos = sales?.descontos ?? 0;
  const cancelamentos = cancelled?.cancelamentos ?? 0;
  const receitaLiquida = sales?.receitaLiquida ?? 0;
  const custoMercadorias = costs?.custoMercadorias ?? 0;
  const lucroBruto = receitaLiquida - custoMercadorias;
  const despesasOperacionais = expenses?.despesasOperacionais ?? 0;
  const resultadoOperacional = lucroBruto - despesasOperacionais;

  return {
    periodo: { inicio: filters.startDate ?? null, fim: filters.endDate ?? null },
    receitaBruta,
    descontos,
    cancelamentos,
    receitaLiquida,
    custoMercadorias,
    lucroBruto,
    despesasOperacionais,
    resultadoOperacional,
    margemBrutaPercentual: percent(lucroBruto, receitaLiquida),
    margemLiquidaPercentual: percent(resultadoOperacional, receitaLiquida),
    totalVendas: sales?.totalVendas ?? 0,
    totalCancelamentos: cancelled?.totalCancelamentos ?? 0,
    despesasConfiguradas: despesasOperacionais > 0,
    linhas: [
      { label: "Receita bruta", value: receitaBruta, type: "positive" },
      { label: "(-) Descontos", value: descontos, type: "negative" },
      { label: "(-) Cancelamentos", value: cancelamentos, type: "negative" },
      { label: "Receita liquida", value: receitaLiquida, type: "result" },
      { label: "(-) Custo das mercadorias", value: custoMercadorias, type: "negative" },
      { label: "Lucro bruto", value: lucroBruto, type: "result" },
      { label: "(-) Despesas operacionais", value: despesasOperacionais, type: "negative" },
      { label: "Resultado operacional", value: resultadoOperacional, type: "result" },
    ],
  };
}

export async function getProfitByPeriod(empresaId: number, filters: AnalyticsFilters = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { start, end } = dateRange(filters.startDate, filters.endDate);
  const startTime = new Date(filters.startDate ?? start).getTime();
  const endTime = new Date(filters.endDate ?? end).getTime();
  const days = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));
  const bucket = days > 62 ? sql<string>`date_format(${vendas.dataVenda}, '%Y-%m')` : sql<string>`date(${vendas.dataVenda})`;

  const rows = await db.select({
    periodo: bucket,
    receitaLiquida: sql<number>`coalesce(sum(${itemNetExpression}), 0)`.mapWith(Number),
    custoTotal: sql<number>`coalesce(sum(${itensVenda.quantidade} * ${costExpression}), 0)`.mapWith(Number),
  })
    .from(itensVenda)
    .innerJoin(vendas, eq(itensVenda.vendaId, vendas.id))
    .innerJoin(produtos, eq(itensVenda.produtoId, produtos.id))
    .where(and(...saleConditions(empresaId, filters, true)))
    .groupBy(bucket)
    .orderBy(asc(bucket));

  const series = rows.map((row) => {
    const lucroBruto = row.receitaLiquida - row.custoTotal;
    return {
      ...row,
      lucroBruto,
      margemPercentual: percent(lucroBruto, row.receitaLiquida),
    };
  });

  const totals = series.reduce((acc, row) => ({
    receitaLiquida: acc.receitaLiquida + row.receitaLiquida,
    custoTotal: acc.custoTotal + row.custoTotal,
    lucroBruto: acc.lucroBruto + row.lucroBruto,
  }), { receitaLiquida: 0, custoTotal: 0, lucroBruto: 0 });

  return {
    agrupamento: days > 62 ? "MES" : "DIA",
    totais: { ...totals, margemPercentual: percent(totals.lucroBruto, totals.receitaLiquida) },
    series,
  };
}

export async function getProductMargins(empresaId: number, filters: AnalyticsFilters = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const limit = Math.min(filters.limit ?? 50, 200);
  const conditions = [...saleConditions(empresaId, filters, true), eq(produtos.empresaId, empresaId)];
  if (filters.produtoId) conditions.push(eq(produtos.id, filters.produtoId));
  if (filters.departamentoId) conditions.push(eq(produtos.departamentoId, filters.departamentoId));

  const rows = await db.select({
    produtoId: produtos.id,
    codigo: produtos.codigo,
    codigoBarras: produtos.codigoBarras,
    nome: produtos.descricao,
    departamentoId: produtos.departamentoId,
    quantidadeVendida: sql<number>`coalesce(sum(${itensVenda.quantidade}), 0)`.mapWith(Number),
    receitaBruta: sql<number>`coalesce(sum(${itensVenda.valorTotal}), 0)`.mapWith(Number),
    descontos: sql<number>`coalesce(sum(${itensVenda.valorDesconto}), 0)`.mapWith(Number),
    receitaLiquida: sql<number>`coalesce(sum(${itemNetExpression}), 0)`.mapWith(Number),
    custoUnitario: costExpression.mapWith(Number),
    custoTotal: sql<number>`coalesce(sum(${itensVenda.quantidade} * ${costExpression}), 0)`.mapWith(Number),
    margemMinima: produtos.margemLucro,
  })
    .from(itensVenda)
    .innerJoin(vendas, eq(itensVenda.vendaId, vendas.id))
    .innerJoin(produtos, eq(itensVenda.produtoId, produtos.id))
    .where(and(...conditions))
    .groupBy(produtos.id, produtos.codigo, produtos.codigoBarras, produtos.descricao, produtos.departamentoId, produtos.custoMedio, produtos.precoCusto, produtos.margemLucro)
    .orderBy(desc(sql`sum(${itemNetExpression})`))
    .limit(limit);

  return rows.map((row) => {
    const lucroBruto = row.receitaLiquida - row.custoTotal;
    const margemPercentual = percent(lucroBruto, row.receitaLiquida);
    const alertas = [];
    if (row.custoUnitario <= 0) alertas.push("SEM_CUSTO");
    if (lucroBruto < 0) alertas.push("MARGEM_NEGATIVA");
    if (margemPercentual < (row.margemMinima ?? 0)) alertas.push("MARGEM_ABAIXO_DA_META");
    return {
      ...row,
      lucroBruto,
      margemPercentual,
      ticketMedioProduto: row.quantidadeVendida > 0 ? Math.round(row.receitaLiquida / row.quantidadeVendida) : 0,
      alertas,
    };
  });
}

export async function getLowMarginProducts(empresaId: number, filters: AnalyticsFilters = {}) {
  const threshold = filters.marginThreshold ?? 15;
  const products = await getProductMargins(empresaId, { ...filters, limit: filters.limit ?? 100 });
  return products
    .filter((item) => item.margemPercentual < threshold || item.alertas.length > 0)
    .sort((a, b) => a.margemPercentual - b.margemPercentual)
    .map((item) => ({
      ...item,
      margemMinimaEsperada: threshold,
      diferencaMargem: Number((item.margemPercentual - threshold).toFixed(2)),
      perdaEstimadaLucro: item.margemPercentual < threshold
        ? Math.round(item.receitaLiquida * ((threshold - item.margemPercentual) / 100))
        : 0,
    }));
}

export async function getOperatorsRisk(empresaId: number, filters: AnalyticsFilters = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = saleConditions(empresaId, filters, false);

  const rows = await db.select({
    operadorId: vendas.operadorId,
    operadorNome: sql<string>`coalesce(${users.name}, ${vendas.operadorNome}, 'Sem operador')`,
    totalVendas: sql<number>`count(*)`.mapWith(Number),
    vendasConcluidas: sql<number>`sum(case when ${vendas.status} = 'CONCLUIDA' then 1 else 0 end)`.mapWith(Number),
    totalCancelamentos: sql<number>`sum(case when ${vendas.status} = 'CANCELADA' then 1 else 0 end)`.mapWith(Number),
    valorCancelado: sql<number>`coalesce(sum(case when ${vendas.status} = 'CANCELADA' then ${vendas.valorLiquido} else 0 end), 0)`.mapWith(Number),
    totalDescontos: sql<number>`coalesce(sum(${vendas.valorDesconto}), 0)`.mapWith(Number),
    receitaLiquida: sql<number>`coalesce(sum(case when ${vendas.status} = 'CONCLUIDA' then ${vendas.valorLiquido} else 0 end), 0)`.mapWith(Number),
  })
    .from(vendas)
    .leftJoin(users, eq(users.id, vendas.operadorId))
    .where(and(...conditions))
    .groupBy(vendas.operadorId, users.name, vendas.operadorNome)
    .orderBy(desc(sql`coalesce(sum(${vendas.valorDesconto}), 0)`))
    .limit(Math.min(filters.limit ?? 50, 200));

  return rows.map((row) => ({
    ...row,
    percentualCancelamento: percent(row.totalCancelamentos, row.totalVendas),
    percentualDesconto: percent(row.totalDescontos, row.receitaLiquida + row.totalDescontos),
    ticketMedio: row.vendasConcluidas > 0 ? Math.round(row.receitaLiquida / row.vendasConcluidas) : 0,
  }));
}

export async function getCustomerRanking(empresaId: number, filters: AnalyticsFilters = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [sales] = await db.select({
    totalComprado: sql<number>`coalesce(sum(${vendas.valorLiquido}), 0)`.mapWith(Number),
    quantidadeCompras: sql<number>`count(*)`.mapWith(Number),
    ultimaCompra: sql<string>`max(${vendas.dataVenda})`,
    primeiraCompra: sql<string>`min(${vendas.dataVenda})`,
    descontosRecebidos: sql<number>`coalesce(sum(${vendas.valorDesconto}), 0)`.mapWith(Number),
  })
    .from(vendas)
    .where(and(...saleConditions(empresaId, filters, true)));

  const customers = await db.select({ totalClientesCadastrados: sql<number>`count(*)`.mapWith(Number) })
    .from(clientes)
    .where(and(eq(clientes.empresaId, empresaId), eq(clientes.ativo, true)));

  const totalComprado = sales?.totalComprado ?? 0;
  const quantidadeCompras = sales?.quantidadeCompras ?? 0;
  return {
    warning: "A tabela de vendas ainda nao possui clienteId. O ranking detalhado por cliente depende desse vinculo; por enquanto as vendas aparecem agrupadas como cliente nao identificado.",
    totalClientesCadastrados: customers[0]?.totalClientesCadastrados ?? 0,
    items: totalComprado > 0 ? [{
      clienteId: null,
      nome: "Cliente nao identificado",
      documento: null,
      totalComprado,
      quantidadeCompras,
      ticketMedio: quantidadeCompras > 0 ? Math.round(totalComprado / quantidadeCompras) : 0,
      ultimaCompra: sales?.ultimaCompra,
      primeiraCompra: sales?.primeiraCompra,
      margemGerada: null,
      descontosRecebidos: sales?.descontosRecebidos ?? 0,
    }] : [],
  };
}

export async function getStockRuptureForecast(empresaId: number, filters: AnalyticsFilters = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const days = Math.max(filters.days ?? 30, 1);
  const leadTimeDays = Math.max(filters.leadTimeDays ?? 7, 1);
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().slice(0, 10) + " 00:00:00";

  const sales = await db.select({
    produtoId: itensVenda.produtoId,
    quantidadeVendida: sql<number>`coalesce(sum(${itensVenda.quantidade}), 0)`.mapWith(Number),
    ultimaVenda: sql<string>`max(${vendas.dataVenda})`,
  })
    .from(itensVenda)
    .innerJoin(vendas, eq(itensVenda.vendaId, vendas.id))
    .where(and(
      eq(vendas.empresaId, empresaId),
      eq(vendas.status, "CONCLUIDA"),
      sql`${vendas.dataVenda} >= ${startStr}`,
    ))
    .groupBy(itensVenda.produtoId);

  const salesMap = new Map(sales.map((item) => [item.produtoId, item]));
  const productRows = await db.select({
    produtoId: produtos.id,
    codigo: produtos.codigo,
    nome: produtos.descricao,
    estoqueAtual: produtos.estoque,
    estoqueMinimo: produtos.estoqueMinimo,
    precoVenda: produtos.precoVenda,
    fornecedor: sql<string | null>`null`,
    ultimaEntrada: produtos.dataUltimaCompra,
  })
    .from(produtos)
    .where(and(eq(produtos.empresaId, empresaId), eq(produtos.ativo, true), eq(produtos.controlaEstoque, true)))
    .limit(Math.min(filters.limit ?? 100, 500));

  const riskWeight: Record<string, number> = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAIXO: 3, SEM_PREVISAO: 4 };
  return productRows.map((product) => {
    const sold = salesMap.get(product.produtoId);
    const quantidadeVendida = sold?.quantidadeVendida ?? 0;
    const mediaVendaDiaria = quantidadeVendida / days;
    const diasAteRuptura = mediaVendaDiaria > 0 ? product.estoqueAtual / mediaVendaDiaria : null;
    let risco = "SEM_PREVISAO";
    if (product.estoqueAtual < 0 || (diasAteRuptura !== null && diasAteRuptura <= 3)) risco = "CRITICO";
    else if (diasAteRuptura !== null && diasAteRuptura <= 7) risco = "ALTO";
    else if (diasAteRuptura !== null && diasAteRuptura <= 15) risco = "MEDIO";
    else if (diasAteRuptura !== null) risco = "BAIXO";
    const estoqueNecessario = Math.ceil(mediaVendaDiaria * leadTimeDays);

    return {
      ...product,
      quantidadeVendida,
      mediaVendaDiaria: Number(mediaVendaDiaria.toFixed(2)),
      diasAteRuptura: diasAteRuptura === null ? null : Number(diasAteRuptura.toFixed(1)),
      leadTimeDias: leadTimeDays,
      estoqueNecessario,
      pontoReposicaoSugerido: Math.max(product.estoqueMinimo ?? 0, estoqueNecessario),
      risco,
      ultimaVenda: sold?.ultimaVenda ?? null,
      valorEmEstoque: product.estoqueAtual * product.precoVenda,
    };
  }).sort((a, b) => riskWeight[a.risco] - riskWeight[b.risco] || (a.diasAteRuptura ?? 9999) - (b.diasAteRuptura ?? 9999));
}

export async function getManagementAnalytics(empresaId: number, filters: AnalyticsFilters = {}) {
  const [dre, profitPeriod, productMargins, lowMarginProducts, operatorsRisk, customerRanking, stockRuptureForecast] = await Promise.all([
    getDre(empresaId, filters),
    getProfitByPeriod(empresaId, filters),
    getProductMargins(empresaId, { ...filters, limit: 20 }),
    getLowMarginProducts(empresaId, { ...filters, limit: 20 }),
    getOperatorsRisk(empresaId, { ...filters, limit: 20 }),
    getCustomerRanking(empresaId, filters),
    getStockRuptureForecast(empresaId, { ...filters, limit: 50 }),
  ]);

  return {
    dre,
    profitPeriod,
    productMargins,
    lowMarginProducts,
    operatorsRisk,
    customerRanking,
    stockRuptureForecast,
  };
}

