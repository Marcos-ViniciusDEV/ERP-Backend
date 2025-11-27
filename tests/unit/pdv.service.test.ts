import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as pdvService from "../../src/services/pdv.service";
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
    ativo: "ativo",
    estoque: "estoque",
    precoPdv: "precoPdv",
    precoVenda: "precoVenda",
  },
  users: {
    id: "id",
    name: "name",
    role: "role",
  },
  vendas: {
    id: "id",
    numeroVenda: "numeroVenda",
  },
  itensVenda: {
    id: "id",
    vendaId: "vendaId",
  },
  movimentacoesEstoque: {
    id: "id",
    produtoId: "produtoId",
  },
  movimentacoesCaixa: {
    id: "id",
    tipo: "tipo",
    valor: "valor",
    operadorId: "operadorId",
    dataMovimento: "dataMovimento",
  },
}));

describe("PDVService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
    insert: jest.fn(),
    values: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
    execute: jest.fn(),
    $returningId: jest.fn(),
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
    
    // Special handling for returningId
    mockDb.$returningId.mockResolvedValue([{ id: 1 }]);
    mockDb.values.mockReturnValue(mockDb); // Make values returnable for chain

    jest.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("getCargaInicial", () => {
    it("should return initial load data", async () => {
      const mockProdutos = [{ id: 1, nome: "Produto 1" }];
      const mockUsers = [{ id: 1, name: "User 1", password: "hash" }];

      mockDb.where.mockResolvedValue(mockProdutos); // Produtos
      
      // First call to from() is for products (chain continues to where)
      // Second call to from() is for users (terminates)
      mockDb.from
        .mockReturnValueOnce(mockDb)
        .mockResolvedValueOnce(mockUsers);

      const result = await pdvService.getCargaInicial();

      expect(result).toHaveProperty("produtos");
      expect(result).toHaveProperty("usuarios");
      expect(result).toHaveProperty("formasPagamento");
      expect(mockDb.execute).toHaveBeenCalled(); // Update prices
    });
  });

  describe("sincronizar", () => {
    const mockVenda = {
      uuid: "uuid-1",
      numeroVenda: "V001",
      dataVenda: new Date().toISOString(),
      itens: [
        { produtoId: 1, quantidade: 2, precoUnitario: 10, valorTotal: 20 },
      ],
    };

    it("should sync new sale and update stock", async () => {
      const input = {
        vendas: [mockVenda],
        movimentosCaixa: [],
      };

      // Mock sequence:
      // 1. Check existing sale (empty)
      // 2. Insert sale (returns id via $returningId)
      // 3. Insert items
      // 4. Get product for stock update
      // 5. Insert stock movement
      // 6. Update product stock

      mockDb.limit.mockResolvedValueOnce([]); // Sale check
      mockDb.limit.mockResolvedValueOnce([{ estoque: 10 }]); // Product check

      await pdvService.sincronizar(input as any);

      expect(mockDb.insert).toHaveBeenCalledTimes(3); // Venda, Item, Movimentacao
      // Actually: Venda (1), Item (1), Movimentacao (1) = 3 inserts related to sale
      
      // Verify stock update
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ estoque: 8 }); // 10 - 2
    });

    it("should skip duplicate sales", async () => {
      const input = {
        vendas: [mockVenda],
        movimentosCaixa: [],
      };

      mockDb.limit.mockResolvedValueOnce([{ id: 1 }]); // Sale exists

      const result = await pdvService.sincronizar(input as any);

      expect(result.vendasDuplicadas).toBe(1);
      expect(result.vendasProcessadas).toBe(0);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });
});
