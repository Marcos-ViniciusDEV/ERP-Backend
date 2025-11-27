import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as fornecedorService from "../../src/services/fornecedor.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  fornecedores: {
    id: "id",
    nome: "nome",
    cnpj: "cnpj",
  },
}));

describe("FornecedorService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
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
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    mockDb.delete.mockReturnValue(mockDb);

    jest.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("getAll", () => {
    it("should return list of fornecedores", async () => {
      const mockFornecedores = [{ id: 1, nome: "Fornecedor 1" }];
      mockDb.from.mockResolvedValue(mockFornecedores);

      const result = await fornecedorService.getAll();

      expect(result).toEqual(mockFornecedores);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create a fornecedor successfully", async () => {
      const input = { nome: "Novo Fornecedor" };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await fornecedorService.create(input as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(input);
    });
  });

  describe("update", () => {
    it("should update a fornecedor successfully", async () => {
      const input = { nome: "Fornecedor Atualizado" };
      mockDb.where.mockResolvedValue({ affectedRows: 1 });

      await fornecedorService.update(1, input);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(input);
    });
  });

  describe("deleteFornecedor", () => {
    it("should delete a fornecedor successfully", async () => {
      mockDb.where.mockResolvedValue({ affectedRows: 1 });

      await fornecedorService.deleteFornecedor(1);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
