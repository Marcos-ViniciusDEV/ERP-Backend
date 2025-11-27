import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as produtoService from "../../src/services/produto.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  produtos: {
    id: "id",
    codigo: "codigo",
    nome: "nome",
    precoCusto: "precoCusto",
    precoVenda: "precoVenda",
    estoque: "estoque",
    estoqueMinimo: "estoqueMinimo",
  },
  movimentacoesEstoque: {
    id: "id",
    produtoId: "produtoId",
  },
}));

describe("ProdutoService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
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
    
    // Default leaf methods
    mockDb.limit.mockResolvedValue([]);

    jest.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("list", () => {
    it("should return list of products", async () => {
      const mockProdutos = [{ id: 1, nome: "Produto 1" }];
      mockDb.from.mockResolvedValue(mockProdutos);

      const result = await produtoService.list();

      expect(result).toEqual(mockProdutos);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create a product successfully", async () => {
      const input = {
        nome: "Novo Produto",
        codigo: "123",
        precoCusto: 10,
        margemLucro: 50,
        estoque: 100,
        estoqueMinimo: 10,
      };

      mockDb.values.mockResolvedValue([{ insertId: 1 }]); // Insert result
      mockDb.limit
        .mockResolvedValueOnce([]) // No duplicate code
        .mockResolvedValueOnce([{ id: 1, ...input, precoVenda: 15 }]); // Get created product

      const result = await produtoService.create(input as any);

      expect(result).toHaveProperty("id", 1);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        nome: "Novo Produto",
        precoVenda: 15, // 10 * 1.5
      }));
    });

    it("should throw error if code exists", async () => {
      mockDb.limit.mockResolvedValue([{ id: 1 }]); // Duplicate code

      await expect(produtoService.create({ codigo: "123" } as any))
        .rejects.toThrow("Já existe um produto com o código 123");
    });
  });

  describe("checkEstoque", () => {
    it("should return true if stock is sufficient", async () => {
      mockDb.limit.mockResolvedValue([{ id: 1, estoque: 10 }]);

      const result = await produtoService.checkEstoque(1, 5);
      expect(result).toBe(true);
    });

    it("should return false if stock is insufficient", async () => {
      mockDb.limit.mockResolvedValue([{ id: 1, estoque: 4 }]);

      const result = await produtoService.checkEstoque(1, 5);
      expect(result).toBe(false);
    });
  });
});
