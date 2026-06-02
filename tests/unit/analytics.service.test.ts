import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { getDb } from "../../src/libs/db";
import * as analyticsService from "../../src/services/analytics.service";

jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

jest.mock("../../drizzle/schema", () => ({
  salesGoals: {},
  expenseGoals: {},
  vendas: {
    id: "vendas.id",
    empresaId: "vendas.empresaId",
    clienteId: "vendas.clienteId",
    dataVenda: "vendas.dataVenda",
    valorTotal: "vendas.valorTotal",
    valorDesconto: "vendas.valorDesconto",
    valorLiquido: "vendas.valorLiquido",
    status: "vendas.status",
    pdvId: "vendas.pdvId",
    formaPagamento: "vendas.formaPagamento",
    operadorId: "vendas.operadorId",
  },
  itensVenda: {
    vendaId: "itensVenda.vendaId",
    produtoId: "itensVenda.produtoId",
    quantidade: "itensVenda.quantidade",
    valorTotal: "itensVenda.valorTotal",
    valorDesconto: "itensVenda.valorDesconto",
    precoUnitario: "itensVenda.precoUnitario",
  },
  produtos: {
    id: "produtos.id",
    empresaId: "produtos.empresaId",
    custoMedio: "produtos.custoMedio",
    precoCusto: "produtos.precoCusto",
  },
  contasPagar: {},
  contasReceber: {},
  users: {},
  clientes: {
    id: "clientes.id",
    empresaId: "clientes.empresaId",
    nome: "clientes.nome",
    cpfCnpj: "clientes.cpfCnpj",
    ativo: "clientes.ativo",
    createdAt: "clientes.createdAt",
  },
  returns: {
    id: "returns.id",
    originalSaleId: "returns.originalSaleId",
    createdAt: "returns.createdAt",
  },
  returnItems: {
    returnId: "returnItems.returnId",
    produtoId: "returnItems.produtoId",
    quantidade: "returnItems.quantidade",
  },
}));

describe("AnalyticsService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    groupBy: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.leftJoin.mockReturnValue(mockDb);
    mockDb.innerJoin.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.groupBy.mockReturnValue(mockDb);
    mockDb.orderBy.mockReturnValue(mockDb);
    jest.mocked(getDb).mockResolvedValue(mockDb);
  });

  it("ranks identified customers and calculates margin, new and inactive customers", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        clienteId: 10,
        nome: "Cliente A",
        documento: "111",
        totalComprado: 10000,
        quantidadeCompras: 2,
        ultimaCompra: "2026-05-20",
        primeiraCompra: "2026-05-02",
        descontosRecebidos: 500,
      },
      {
        clienteId: 20,
        nome: "Cliente B",
        documento: "222",
        totalComprado: 8000,
        quantidadeCompras: 4,
        ultimaCompra: "2026-05-25",
        primeiraCompra: "2026-05-03",
        descontosRecebidos: 0,
      },
    ]);
    mockDb.where
      .mockReturnValueOnce(mockDb)
      .mockReturnValueOnce(mockDb)
      .mockResolvedValueOnce([
        { totalClientesCadastrados: 5, clientesNovos: 1 },
      ]);
    mockDb.groupBy
      .mockReturnValueOnce(mockDb)
      .mockResolvedValueOnce([
      { clienteId: 10, custoMercadorias: 7000 },
      { clienteId: 20, custoMercadorias: 4000 },
      ]);

    const result = await analyticsService.getCustomerRanking(7, {
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });

    expect(result.totalClientesCadastrados).toBe(5);
    expect(result.clientesComCompra).toBe(2);
    expect(result.clientesNovos).toBe(1);
    expect(result.clientesInativos).toBe(3);
    expect(result.items[0]).toEqual(expect.objectContaining({
      clienteId: 10,
      margemGerada: 3000,
      margemPercentual: 30,
      ticketMedio: 5000,
    }));
    expect(result.rankings.porMargem[0].clienteId).toBe(20);
    expect(result.rankings.porFrequencia[0].clienteId).toBe(20);
  });

  it("calculates a sale price that preserves the desired gross margin", () => {
    expect(analyticsService.calculateSuggestedSalePrice(800, 20)).toBe(1000);
    expect(analyticsService.calculateSuggestedSalePrice(0, 20)).toBeNull();
    expect(analyticsService.calculateSuggestedSalePrice(800, 100)).toBeNull();
  });

  it("calculates product margin after reversing returned revenue and cost", () => {
    expect(analyticsService.calculateNetProductMargin(
      { quantidadeVendida: 10, receitaLiquida: 10000, custoTotal: 6000 },
      { quantidadeDevolvida: 2, receitaDevolvida: 2000, custoDevolvido: 1200 },
    )).toEqual({
      quantidadeDevolvida: 2,
      quantidadeLiquida: 8,
      receitaDevolvida: 2000,
      receitaLiquidaAposDevolucoes: 8000,
      custoDevolvido: 1200,
      custoLiquido: 4800,
      lucroBruto: 3200,
      margemPercentual: 40,
    });
  });

  it("flags operators above the average cancellation or discount percentage", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        operadorId: 1,
        operadorNome: "Operador A",
        totalVendas: 10,
        vendasConcluidas: 8,
        totalCancelamentos: 2,
        valorCancelado: 1000,
        totalDescontos: 1000,
        receitaLiquida: 9000,
      },
      {
        operadorId: 2,
        operadorNome: "Operador B",
        totalVendas: 10,
        vendasConcluidas: 10,
        totalCancelamentos: 0,
        valorCancelado: 0,
        totalDescontos: 0,
        receitaLiquida: 10000,
      },
    ]);

    const result = await analyticsService.getOperatorsRisk(7);

    expect(result[0].alertas).toEqual([
      "CANCELAMENTO_ACIMA_DA_MEDIA",
      "DESCONTO_ACIMA_DA_MEDIA",
    ]);
    expect(result[1].alertas).toEqual([]);
  });
});
