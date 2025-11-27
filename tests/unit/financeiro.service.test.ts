import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as financeiroService from "../../src/services/financeiro.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  contasPagar: {
    id: "id",
    descricao: "descricao",
    valor: "valor",
  },
  contasReceber: {
    id: "id",
    descricao: "descricao",
    valor: "valor",
  },
}));

describe("FinanceiroService", () => {
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

  describe("Contas a Pagar", () => {
    it("should return list of contas pagar", async () => {
      const mockContas = [{ id: 1, descricao: "Conta 1" }];
      mockDb.from.mockResolvedValue(mockContas);

      const result = await financeiroService.getAllContasPagar();

      expect(result).toEqual(mockContas);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });

    it("should create conta pagar successfully", async () => {
      const input = { descricao: "Nova Conta", valor: 100 };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await financeiroService.createContaPagar(input as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(input);
    });
  });

  describe("Contas a Receber", () => {
    it("should return list of contas receber", async () => {
      const mockContas = [{ id: 1, descricao: "Conta 1" }];
      mockDb.from.mockResolvedValue(mockContas);

      const result = await financeiroService.getAllContasReceber();

      expect(result).toEqual(mockContas);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });

    it("should create conta receber successfully", async () => {
      const input = { descricao: "Nova Conta", valor: 100 };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await financeiroService.createContaReceber(input as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(input);
    });
  });
});
