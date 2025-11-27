import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as departamentoService from "../../src/services/departamento.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  departamentos: {
    id: "id",
    nome: "nome",
  },
}));

describe("DepartamentoService", () => {
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
    it("should return list of departamentos", async () => {
      const mockDepartamentos = [{ id: 1, nome: "Departamento 1" }];
      mockDb.from.mockResolvedValue(mockDepartamentos);

      const result = await departamentoService.getAll();

      expect(result).toEqual(mockDepartamentos);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });

    it("should return empty array if db not available", async () => {
      jest.mocked(getDb).mockResolvedValue(null);
      const result = await departamentoService.getAll();
      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should create a departamento successfully", async () => {
      const input = { nome: "Novo Departamento" };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await departamentoService.create(input as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(input);
    });

    it("should throw error if db not available", async () => {
      jest.mocked(getDb).mockResolvedValue(null);
      
      await expect(departamentoService.create({} as any))
        .rejects.toThrow("Database not available");
    });
  });
});
