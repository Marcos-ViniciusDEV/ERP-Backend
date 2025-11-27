import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as inventarioService from "../../src/services/inventario.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  inventarios: {
    id: "id",
    data: "data",
    status: "status",
  },
  inventariosItens: {
    id: "id",
    inventarioId: "inventarioId",
    produtoId: "produtoId",
    quantidade: "quantidade",
  },
}));

describe("InventarioService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
    insert: jest.fn(),
    values: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup chainable mocks
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    
    // Default leaf methods
    mockDb.limit.mockResolvedValue([]);

    jest.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("create", () => {
    it("should create inventario successfully", async () => {
      const input = { status: "ABERTO" };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await inventarioService.create(input as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(input);
    });
  });

  describe("getAll", () => {
    it("should return list of inventarios", async () => {
      const mockInventarios = [{ id: 1, status: "ABERTO" }];
      mockDb.from.mockResolvedValue(mockInventarios);

      const result = await inventarioService.getAll();

      expect(result).toEqual(mockInventarios);
    });
  });

  describe("getById", () => {
    it("should return inventario by id", async () => {
      const mockInventario = { id: 1, status: "ABERTO" };
      mockDb.limit.mockResolvedValue([mockInventario]);

      const result = await inventarioService.getById(1);

      expect(result).toEqual(mockInventario);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should return undefined if not found", async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await inventarioService.getById(999);

      expect(result).toBeUndefined();
    });
  });

  describe("addItem", () => {
    it("should add item to inventario", async () => {
      const input = { inventarioId: 1, produtoId: 1, quantidade: 10 };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await inventarioService.addItem(input as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(input);
    });
  });

  describe("getItens", () => {
    it("should return items of inventario", async () => {
      const mockItens = [{ id: 1, produtoId: 1, quantidade: 10 }];
      mockDb.where.mockResolvedValue(mockItens);

      const result = await inventarioService.getItens(1);

      expect(result).toEqual(mockItens);
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});
