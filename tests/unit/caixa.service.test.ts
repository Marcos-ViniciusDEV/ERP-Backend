import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as caixaService from "../../src/services/caixa.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  movimentacoesCaixa: {
    id: "id",
    tipo: "tipo",
    valor: "valor",
    descricao: "descricao",
    data: "data",
  },
}));

describe("CaixaService", () => {
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

  describe("getAll", () => {
    it("should return list of caixa movements", async () => {
      const mockMovimentacoes = [{ id: 1, tipo: "ENTRADA", valor: 100 }];
      mockDb.from.mockResolvedValue(mockMovimentacoes);

      const result = await caixaService.getAll();

      expect(result).toEqual(mockMovimentacoes);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });

    it("should return empty array if db not available", async () => {
      jest.mocked(getDb).mockResolvedValue(null);
      const result = await caixaService.getAll();
      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should create a caixa movement successfully", async () => {
      const input = {
        tipo: "ENTRADA",
        valor: 100,
        descricao: "Venda",
      };

      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await caixaService.create(input as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(input);
    });

    it("should throw error if db not available", async () => {
      jest.mocked(getDb).mockResolvedValue(null);
      
      await expect(caixaService.create({} as any))
        .rejects.toThrow("Database not available");
    });
  });
});
