import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as kardexService from "../../src/services/kardex.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  movimentacoesEstoque: {
    id: "id",
    produtoId: "produtoId",
    tipo: "tipo",
    quantidade: "quantidade",
    saldoAnterior: "saldoAnterior",
    saldoAtual: "saldoAtual",
    documentoReferencia: "documentoReferencia",
    statusConferencia: "statusConferencia",
    usuarioId: "usuarioId",
    createdAt: "createdAt",
  },
  produtos: {
    id: "id",
    estoque: "estoque",
    dataUltimaCompra: "dataUltimaCompra",
    quantidadeUltimaCompra: "quantidadeUltimaCompra",
  },
  users: {
    id: "id",
    name: "name",
  },
}));

describe("KardexService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    leftJoin: jest.fn(),
    orderBy: jest.fn(),
    insert: jest.fn(),
    values: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup chainable mocks
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.leftJoin.mockReturnValue(mockDb);
    mockDb.orderBy.mockReturnValue(mockDb);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    mockDb.delete.mockReturnValue(mockDb);

    jest.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("create", () => {
    it("should create ENTRADA_NFE with PENDENTE_CONFERENCIA and NOT update stock", async () => {
      const input = {
        tipo: "ENTRADA_NFE",
        produtoId: 1,
        quantidade: 10,
        saldoAtual: 20,
      };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await kardexService.create(input as any, 1);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        statusConferencia: "PENDENTE_CONFERENCIA",
      }));
      // Should NOT update stock (because it's pending conference)
      // But it DOES update last purchase info
      expect(mockDb.update).toHaveBeenCalledTimes(1); 
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        quantidadeUltimaCompra: 10,
      }));
    });

    it("should create normal movement and update stock", async () => {
      const input = {
        tipo: "SAIDA",
        produtoId: 1,
        quantidade: 5,
        saldoAtual: 15,
      };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await kardexService.create(input as any, 1);

      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        statusConferencia: undefined,
      }));
      // Should update stock
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ estoque: 15 });
    });
  });

  describe("deleteByDocumento", () => {
    it("should revert stock if status is NOT PENDENTE_CONFERENCIA", async () => {
      const movs = [{
        id: 1,
        tipo: "ENTRADA_NFE",
        produtoId: 1,
        quantidade: 10,
        statusConferencia: "CONFERIDO",
      }];
      const produto = { id: 1, estoque: 50 };

      mockDb.where.mockResolvedValueOnce(movs); // Get movs
      mockDb.where.mockResolvedValueOnce([produto]); // Get produto
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 }); // Update produto
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 }); // Delete movs

      await kardexService.deleteByDocumento("DOC-123");

      expect(mockDb.set).toHaveBeenCalledWith({ estoque: 40 }); // 50 - 10
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should NOT revert stock if status IS PENDENTE_CONFERENCIA", async () => {
      const movs = [{
        id: 1,
        tipo: "ENTRADA_NFE",
        produtoId: 1,
        quantidade: 10,
        statusConferencia: "PENDENTE_CONFERENCIA",
      }];

      mockDb.where.mockResolvedValueOnce(movs); // Get movs
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 }); // Delete movs

      await kardexService.deleteByDocumento("DOC-123");

      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
