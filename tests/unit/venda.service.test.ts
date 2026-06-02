import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as vendaService from "../../src/services/venda.service";
import * as produtoService from "../../src/services/produto.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

jest.mock("../../src/services/produto.service", () => ({
  checkEstoque: jest.fn(),
  getById: jest.fn(),
}));

jest.mock("crypto", () => ({
  randomUUID: () => "test-uuid",
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  vendas: {
    id: "id",
    empresaId: "empresaId",
    numeroVenda: "numeroVenda",
    uuid: "uuid",
    ccf: "ccf",
    coo: "coo",
    pdvId: "pdvId",
    dataVenda: "dataVenda",
    valorTotal: "valorTotal",
    valorDesconto: "valorDesconto",
    valorLiquido: "valorLiquido",
    formaPagamento: "formaPagamento",
    status: "status",
    observacao: "observacao",
    operadorId: "operadorId",
    operadorNome: "operadorNome",
    clienteId: "clienteId",
    createdAt: "createdAt",
  },
  clientes: {
    id: "id",
    empresaId: "empresaId",
    nome: "nome",
    cpfCnpj: "cpfCnpj",
  },
  itensVenda: {
    id: "id",
    vendaId: "vendaId",
    produtoId: "produtoId",
    quantidade: "quantidade",
    precoUnitario: "precoUnitario",
    valorTotal: "valorTotal",
    valorDesconto: "valorDesconto",
  },
  movimentacoesEstoque: {
    id: "id",
  },
  movimentacoesCaixa: {
    id: "id",
  },
  produtos: {
    id: "id",
    descricao: "descricao",
    departamentoId: "departamentoId",
    estoque: "estoque",
  },
  users: {
    id: "id",
    name: "name",
  },
}));

describe("VendaService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    insert: jest.fn(),
    values: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
    limit: jest.fn(),
    $dynamic: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup chainable mocks
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.orderBy.mockReturnValue(mockDb);
    mockDb.leftJoin.mockReturnValue(mockDb);
    mockDb.innerJoin.mockReturnValue(mockDb);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    mockDb.limit.mockResolvedValue([]);
    mockDb.$dynamic.mockReturnValue(mockDb);

    jest.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("create", () => {
    const mockVendaInput = {
      itens: [
        { produtoId: 1, quantidade: 2, precoUnitario: 1000, desconto: 0 },
      ],
      formaPagamento: "DINHEIRO",
      desconto: 0,
      observacoes: "Test",
    };

    it("should create venda successfully", async () => {
      // Mock stock check
      jest.mocked(produtoService.checkEstoque).mockResolvedValue(true);
      jest.mocked(produtoService.getById).mockResolvedValue({
        id: 1,
        estoque: 10,
        descricao: "Produto 1",
      } as any);

      mockDb.values.mockResolvedValue([{ insertId: 1 }]);
      mockDb.limit.mockResolvedValueOnce([{ ccf: "000001", coo: "000001" }]);

      const result = await vendaService.create(1, mockVendaInput as any, 1);

      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("valorTotal", 2000);
      expect(result).toHaveProperty("valorLiquido", 2000);
      expect(mockDb.insert).toHaveBeenCalledTimes(4); // Venda, Item, Movimentacao Estoque, Movimentacao Caixa
    });

    it("should throw error if stock insufficient", async () => {
      jest.mocked(produtoService.checkEstoque).mockResolvedValue(false);
      jest.mocked(produtoService.getById).mockResolvedValue({
        id: 1,
        estoque: 1,
        descricao: "Produto 1",
      } as any);

      await expect(vendaService.create(1, mockVendaInput as any, 1))
        .rejects.toThrow("Estoque insuficiente");
    });
  });

  describe("list", () => {
    it("should return list of vendas with items", async () => {
      const mockVendas = [{ id: 1, numeroVenda: "V001" }];
      const mockItens = [{ id: 1, produtoNome: "Produto 1" }];

      mockDb.where
        .mockReturnValueOnce(mockDb)
        .mockResolvedValueOnce(mockItens);
      mockDb.orderBy.mockResolvedValueOnce(mockVendas);

      const result = await vendaService.list(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("itens");
    });
  });
});
