 import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as pedidoCompraService from "../../src/services/pedido-compra.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  pedidosCompra: {
    id: "id",
    fornecedorId: "fornecedorId",
    status: "status",
  },
}));

describe("PedidoCompraService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    insert: jest.fn(),
    values: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup chainable mocks
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);

    jest.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("create", () => {
    it("should create pedido compra successfully", async () => {
      const input = { fornecedorId: 1, status: "PENDENTE" };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await pedidoCompraService.create(input as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(input);
    });
  });

  describe("getAll", () => {
    it("should return list of pedidos compra", async () => {
      const mockPedidos = [{ id: 1, status: "PENDENTE" }];
      mockDb.from.mockResolvedValue(mockPedidos);

      const result = await pedidoCompraService.getAll();

      expect(result).toEqual(mockPedidos);
    });
  });
});
