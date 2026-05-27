 import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as pedidoCompraService from "../../src/services/pedido-compra.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  fornecedores: {
    empresaId: "empresaId",
  },
  itensPedidoCompra: {
    pedidoCompraId: "pedidoCompraId",
    produtoId: "produtoId",
    quantidade: "quantidade",
    precoUnitario: "precoUnitario",
    valorTotal: "valorTotal",
  },
  itensVenda: {
    produtoId: "produtoId",
    quantidade: "quantidade",
    valorTotal: "valorTotal",
    vendaId: "vendaId",
  },
  pedidosCompra: {
    id: "id",
    empresaId: "empresaId",
    fornecedorId: "fornecedorId",
    status: "status",
    createdAt: "createdAt",
  },
  produtos: {
    id: "id",
    empresaId: "empresaId",
    ativo: "ativo",
    controlaEstoque: "controlaEstoque",
  },
  vendas: {
    id: "id",
    empresaId: "empresaId",
    status: "status",
    dataVenda: "dataVenda",
  },
}));

describe("PedidoCompraService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    insert: jest.fn(),
    values: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup chainable mocks
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.orderBy.mockReturnValue(mockDb);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);

    jest.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("create", () => {
    it("should create pedido compra successfully", async () => {
      const input = { fornecedorId: 1, status: "PENDENTE" };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await pedidoCompraService.create(10, input as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          ...input,
          empresaId: 10,
          valorTotal: 0,
        })
      );
    });
  });

  describe("getAll", () => {
    it("should return list of pedidos compra", async () => {
      const mockPedidos = [{ id: 1, status: "PENDENTE" }];
      mockDb.orderBy.mockResolvedValue(mockPedidos);

      const result = await pedidoCompraService.getAll(10);

      expect(result).toEqual(mockPedidos);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });
  });
});
