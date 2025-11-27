import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as conferenciaService from "../../src/services/conferencia.service";
import { getDb } from "../../src/libs/db";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  conferenciasMercadoria: {
    id: "id",
    movimentacaoEstoqueId: "movimentacaoEstoqueId",
    produtoId: "produtoId",
    quantidadeEsperada: "quantidadeEsperada",
    quantidadeConferida: "quantidadeConferida",
    divergencia: "divergencia",
    tipoDivergencia: "tipoDivergencia",
    status: "status",
    observacao: "observacao",
  },
  movimentacoesEstoque: {
    id: "id",
    statusConferencia: "statusConferencia",
    documentoReferencia: "documentoReferencia",
    createdAt: "createdAt",
    observacao: "observacao",
    produtoId: "produtoId",
  },
  produtos: {
    id: "id",
    descricao: "descricao",
    codigoBarras: "codigoBarras",
    estoque: "estoque",
  },
}));

describe("ConferenciaService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    leftJoin: jest.fn(),
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
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    mockDb.delete.mockReturnValue(mockDb);

    jest.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("create", () => {
    it("should create conferencia with correct divergence (FALTA)", async () => {
      const input = {
        movimentacaoEstoqueId: 1,
        produtoId: 1,
        quantidadeEsperada: 10,
        quantidadeConferida: 8,
      };

      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await conferenciaService.create(input as any, 1);

      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        divergencia: -2,
        tipoDivergencia: "FALTA",
        status: "DIVERGENCIA",
      }));
    });

    it("should create conferencia with correct divergence (SOBRA)", async () => {
      const input = {
        movimentacaoEstoqueId: 1,
        produtoId: 1,
        quantidadeEsperada: 10,
        quantidadeConferida: 12,
      };

      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await conferenciaService.create(input as any, 1);

      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        divergencia: 2,
        tipoDivergencia: "SOBRA",
        status: "DIVERGENCIA",
      }));
    });

    it("should create conferencia with correct divergence (OK)", async () => {
      const input = {
        movimentacaoEstoqueId: 1,
        produtoId: 1,
        quantidadeEsperada: 10,
        quantidadeConferida: 10,
      };

      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await conferenciaService.create(input as any, 1);

      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        divergencia: 0,
        tipoDivergencia: "OK",
        status: "CONFERIDO",
      }));
    });
  });

  describe("update", () => {
    it("should update conferencia and recalculate divergence", async () => {
      const existingConferencia = {
        id: 1,
        quantidadeEsperada: 10,
        divergencia: -2,
      };

      mockDb.where.mockResolvedValueOnce([existingConferencia]); // Get existing
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 }); // Update

      await conferenciaService.update(1, { quantidadeConferida: 10 } as any);

      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        quantidadeConferida: 10,
        divergencia: 0,
        tipoDivergencia: "OK",
        status: "CONFERIDO",
      }));
    });
  });

  describe("finalizarConferencia", () => {
    it("should finalize with status CONFERIDO if no divergences", async () => {
      const conferencias = [
        { id: 1, status: "CONFERIDO", produtoId: 1, quantidadeConferida: 10 },
      ];
      const produto = { id: 1, estoque: 50 };

      mockDb.where.mockResolvedValueOnce(conferencias); // Get conferencias
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 }); // Update movimentacao
      mockDb.where.mockResolvedValueOnce([produto]); // Get produto
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 }); // Update produto

      const result = await conferenciaService.finalizarConferencia(1);

      expect(result.statusFinal).toBe("CONFERIDO");
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        statusConferencia: "CONFERIDO",
      }));
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        estoque: 60, // 50 + 10
      }));
    });

    it("should finalize with status CONFERIDO_COM_DIVERGENCIA if divergences exist", async () => {
      const conferencias = [
        { id: 1, status: "DIVERGENCIA", produtoId: 1, quantidadeConferida: 8 },
      ];
      const produto = { id: 1, estoque: 50 };

      mockDb.where.mockResolvedValueOnce(conferencias); // Get conferencias
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 }); // Update movimentacao
      mockDb.where.mockResolvedValueOnce([produto]); // Get produto
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 }); // Update produto

      const result = await conferenciaService.finalizarConferencia(1);

      expect(result.statusFinal).toBe("CONFERIDO_COM_DIVERGENCIA");
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        statusConferencia: "CONFERIDO_COM_DIVERGENCIA",
      }));
    });
  });
});
