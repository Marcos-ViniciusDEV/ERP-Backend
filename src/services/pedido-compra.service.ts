import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../libs/db";
import {
  fornecedores,
  itensPedidoCompra,
  itensVenda,
  pedidosCompra,
  produtos,
  vendas,
} from "../../drizzle/schema";

type CotacaoFornecedorInput = {
  fornecedorId: number;
  precoUnitario: number;
  prazoDias?: number;
  observacao?: string;
};

type CotacaoInput = {
  produtoId: number;
  quantidade: number;
  cotacoes: CotacaoFornecedorInput[];
};

type SugestaoCompra = {
  produtoId: number;
  codigo: string;
  descricao: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  giroPeriodo: number;
  mediaDiaria: number;
  quantidadeSugerida: number;
  precoCusto: number;
  valorEstimado: number;
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
};

const DEFAULT_PERIODO_DIAS = 90;
const DEFAULT_LEAD_TIME_DIAS = 7;

function normalizarPeriodo(dias?: number) {
  const periodo = Number(dias || DEFAULT_PERIODO_DIAS);
  if (!Number.isFinite(periodo) || periodo <= 0) return DEFAULT_PERIODO_DIAS;
  return Math.min(Math.round(periodo), 365);
}

function normalizarLeadTime(dias?: number) {
  const leadTime = Number(dias || DEFAULT_LEAD_TIME_DIAS);
  if (!Number.isFinite(leadTime) || leadTime <= 0) return DEFAULT_LEAD_TIME_DIAS;
  return Math.min(Math.round(leadTime), 180);
}

function dataInicialPeriodo(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return data;
}

function classificarPrioridade(
  estoqueAtual: number,
  estoqueMinimo: number,
  mediaDiaria: number
): SugestaoCompra["prioridade"] {
  if (estoqueAtual <= 0 || estoqueAtual <= estoqueMinimo * 0.5) return "ALTA";
  if (mediaDiaria > 0 && estoqueAtual / mediaDiaria <= DEFAULT_LEAD_TIME_DIAS) return "ALTA";
  if (estoqueAtual <= estoqueMinimo) return "MEDIA";
  return "BAIXA";
}

async function getGiroPorProduto(empresaId: number, dias: number) {
  const db = await getDb();
  if (!db) return new Map<number, { quantidade: number; valor: number }>();

  const desde = dataInicialPeriodo(dias);
  const vendasItens = await db
    .select({
      produtoId: itensVenda.produtoId,
      quantidade: itensVenda.quantidade,
      valorTotal: itensVenda.valorTotal,
    })
    .from(itensVenda)
    .innerJoin(vendas, eq(itensVenda.vendaId, vendas.id))
    .where(
      and(
        eq(vendas.empresaId, empresaId),
        eq(vendas.status, "CONCLUIDA"),
        sql`${vendas.dataVenda} >= ${desde}`
      )
    );

  return vendasItens.reduce((acc, item) => {
    const atual = acc.get(item.produtoId) || { quantidade: 0, valor: 0 };
    atual.quantidade += Number(item.quantidade || 0);
    atual.valor += Number(item.valorTotal || 0);
    acc.set(item.produtoId, atual);
    return acc;
  }, new Map<number, { quantidade: number; valor: number }>());
}

export async function create(empresaId: number, data: typeof pedidosCompra.$inferInsert & {
  itens?: Array<{
    produtoId: number;
    quantidade: number;
    precoUnitario: number;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const itens = data.itens || [];
  const valorTotal = itens.length > 0
    ? itens.reduce((total, item) => total + item.quantidade * item.precoUnitario, 0)
    : data.valorTotal || 0;

  const [result] = await db.insert(pedidosCompra).values({
    ...data,
    empresaId,
    numeroPedido: data.numeroPedido || `PC-${Date.now()}`,
    valorTotal,
  });

  const pedidoCompraId = Number(result?.insertId || 0);
  if (pedidoCompraId > 0) {
    for (const item of itens) {
      await db.insert(itensPedidoCompra).values({
        pedidoCompraId,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        valorTotal: item.quantidade * item.precoUnitario,
      });
    }
  }

  return { id: pedidoCompraId, valorTotal };
}

export async function getAll(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(pedidosCompra)
    .where(eq(pedidosCompra.empresaId, empresaId))
    .orderBy(desc(pedidosCompra.createdAt));
}

export async function getSugestoesCompra(
  empresaId: number,
  options?: { dias?: number; leadTimeDias?: number }
): Promise<SugestaoCompra[]> {
  const db = await getDb();
  if (!db) return [];

  const dias = normalizarPeriodo(options?.dias);
  const leadTimeDias = normalizarLeadTime(options?.leadTimeDias);
  const giroPorProduto = await getGiroPorProduto(empresaId, dias);
  const allProdutos = await db
    .select()
    .from(produtos)
    .where(and(eq(produtos.empresaId, empresaId), eq(produtos.ativo, true), eq(produtos.controlaEstoque, true)));

  return allProdutos
    .map((produto) => {
      const giro = giroPorProduto.get(produto.id) || { quantidade: 0, valor: 0 };
      const mediaDiaria = giro.quantidade / dias;
      const coberturaLeadTime = Math.ceil(mediaDiaria * leadTimeDias);
      const alvoReposicao = Math.max(produto.estoqueMinimo, coberturaLeadTime);
      const quantidadeSugerida = Math.max(0, alvoReposicao - produto.estoque);

      return {
        produtoId: produto.id,
        codigo: produto.codigo,
        descricao: produto.descricao,
        estoqueAtual: produto.estoque,
        estoqueMinimo: produto.estoqueMinimo,
        giroPeriodo: giro.quantidade,
        mediaDiaria: Number(mediaDiaria.toFixed(2)),
        quantidadeSugerida,
        precoCusto: produto.precoCusto,
        valorEstimado: quantidadeSugerida * produto.precoCusto,
        prioridade: classificarPrioridade(produto.estoque, produto.estoqueMinimo, mediaDiaria),
      };
    })
    .filter((sugestao) => sugestao.quantidadeSugerida > 0)
    .sort((a, b) => b.valorEstimado - a.valorEstimado);
}

export async function getCurvaAbcCompras(empresaId: number, dias?: number) {
  const periodoDias = normalizarPeriodo(dias);
  const giroPorProduto = await getGiroPorProduto(empresaId, periodoDias);
  const db = await getDb();
  if (!db) return [];

  const allProdutos = await db
    .select()
    .from(produtos)
    .where(and(eq(produtos.empresaId, empresaId), eq(produtos.ativo, true)));

  const linhas = allProdutos
    .map((produto) => {
      const giro = giroPorProduto.get(produto.id) || { quantidade: 0, valor: 0 };
      return {
        produtoId: produto.id,
        codigo: produto.codigo,
        descricao: produto.descricao,
        estoqueAtual: produto.estoque,
        estoqueMinimo: produto.estoqueMinimo,
        quantidadeVendida: giro.quantidade,
        valorVendido: giro.valor,
        precoCusto: produto.precoCusto,
      };
    })
    .filter((linha) => linha.valorVendido > 0)
    .sort((a, b) => b.valorVendido - a.valorVendido);

  const totalVendido = linhas.reduce((total, linha) => total + linha.valorVendido, 0);
  let acumulado = 0;

  return linhas.map((linha) => {
    acumulado += linha.valorVendido;
    const percentualAcumulado = totalVendido > 0 ? (acumulado / totalVendido) * 100 : 0;
    const classe = percentualAcumulado <= 80 ? "A" : percentualAcumulado <= 95 ? "B" : "C";

    return {
      ...linha,
      classe,
      percentualParticipacao: totalVendido > 0 ? Number(((linha.valorVendido / totalVendido) * 100).toFixed(2)) : 0,
      percentualAcumulado: Number(percentualAcumulado.toFixed(2)),
      recomendacao:
        classe === "A"
          ? "Priorizar negociacao e evitar ruptura"
          : classe === "B"
            ? "Comprar com acompanhamento regular"
            : "Comprar sob demanda e revisar estoque minimo",
    };
  });
}

export async function compararCotacoes(empresaId: number, input: CotacaoInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!input.cotacoes || input.cotacoes.length < 2) {
    throw new Error("Informe ao menos duas cotacoes para comparar fornecedores");
  }

  const [produto] = await db
    .select()
    .from(produtos)
    .where(and(eq(produtos.id, input.produtoId), eq(produtos.empresaId, empresaId)))
    .limit(1);

  if (!produto) throw new Error("Produto nao encontrado");

  const fornecedoresIds = input.cotacoes.map((cotacao) => cotacao.fornecedorId);
  const allFornecedores = await db
    .select()
    .from(fornecedores)
    .where(eq(fornecedores.empresaId, empresaId));

  const fornecedoresPorId = new Map(allFornecedores.map((fornecedor) => [fornecedor.id, fornecedor]));
  const linhas = input.cotacoes
    .map((cotacao) => {
      const fornecedor = fornecedoresPorId.get(cotacao.fornecedorId);
      if (!fornecedor || !fornecedoresIds.includes(cotacao.fornecedorId)) return null;

      return {
        fornecedorId: cotacao.fornecedorId,
        fornecedorNome: fornecedor.nomeFantasia || fornecedor.razaoSocial,
        precoUnitario: cotacao.precoUnitario,
        quantidade: input.quantidade,
        valorTotal: cotacao.precoUnitario * input.quantidade,
        prazoDias: cotacao.prazoDias || 0,
        diferencaUltimoCusto: cotacao.precoUnitario - produto.precoCusto,
        observacao: cotacao.observacao || "",
      };
    })
    .filter(Boolean) as Array<{
      fornecedorId: number;
      fornecedorNome: string;
      precoUnitario: number;
      quantidade: number;
      valorTotal: number;
      prazoDias: number;
      diferencaUltimoCusto: number;
      observacao: string;
    }>;

  if (linhas.length < 2) {
    throw new Error("Cotacoes precisam pertencer a fornecedores validos da empresa");
  }

  linhas.sort((a, b) => a.valorTotal - b.valorTotal || a.prazoDias - b.prazoDias);
  const melhor = linhas[0];
  const pior = linhas[linhas.length - 1];

  return {
    produto: {
      id: produto.id,
      codigo: produto.codigo,
      descricao: produto.descricao,
      precoCustoAtual: produto.precoCusto,
    },
    quantidade: input.quantidade,
    melhorFornecedor: melhor,
    economiaPotencial: pior.valorTotal - melhor.valorTotal,
    cotacoes: linhas,
  };
}

export async function gerarPedidoAutomatico(
  empresaId: number,
  usuarioId: number,
  input: { fornecedorId: number; dias?: number; leadTimeDias?: number; observacao?: string }
) {
  const sugestoes = await getSugestoesCompra(empresaId, {
    dias: input.dias,
    leadTimeDias: input.leadTimeDias,
  });

  if (sugestoes.length === 0) {
    throw new Error("Nao ha sugestoes de compra para gerar pedido automatico");
  }

  const itens = sugestoes.map((sugestao) => ({
    produtoId: sugestao.produtoId,
    quantidade: sugestao.quantidadeSugerida,
    precoUnitario: sugestao.precoCusto,
  }));

  const pedido = await create(empresaId, {
    fornecedorId: input.fornecedorId,
    numeroPedido: `AUTO-${Date.now()}`,
    status: "PENDENTE",
    observacao: input.observacao || "Pedido automatico baseado em giro de estoque e estoque minimo",
    usuarioId,
    itens,
  } as any);

  return {
    ...pedido,
    itensGerados: itens.length,
    valorTotal: sugestoes.reduce((total, sugestao) => total + sugestao.valorEstimado, 0),
  };
}
