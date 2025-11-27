import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as clientesService from "../../src/services/clientes.service";
import { getDb } from "../../src/libs/db";
import fs from "fs";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));

jest.mock("fs");
jest.mock("nanoid", () => ({
  nanoid: () => "test-id",
}));

// Mock Drizzle schema
jest.mock("../../drizzle/schema", () => ({
  clientes: {
    id: "id",
    nome: "nome",
    cpfCnpj: "cpfCnpj",
    email: "email",
    telefone: "telefone",
    endereco: "endereco",
    fotoCaminho: "fotoCaminho",
  },
}));

describe("ClientesService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
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
    mockDb.orderBy.mockReturnValue(mockDb);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    mockDb.delete.mockReturnValue(mockDb);

    jest.mocked(getDb).mockResolvedValue(mockDb);
    
    // Mock fs
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => undefined);
  });

  describe("list", () => {
    it("should return list of clientes", async () => {
      const mockClientes = [{ id: 1, nome: "Cliente 1" }];
      mockDb.orderBy.mockResolvedValue(mockClientes);

      const result = await clientesService.list();

      expect(result).toEqual(mockClientes);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });

    it("should filter by search term", async () => {
      const mockClientes = [{ id: 1, nome: "Cliente 1" }];
      mockDb.orderBy.mockResolvedValue(mockClientes);

      await clientesService.list("search");

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create cliente without photo", async () => {
      const input = { nome: "Cliente 1" };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await clientesService.create(input);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        nome: "Cliente 1",
        fotoCaminho: null,
      }));
    });

    it("should create cliente with photo", async () => {
      const input = { 
        nome: "Cliente 1",
        foto: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      };
      mockDb.values.mockResolvedValue([{ insertId: 1 }]);

      await clientesService.create(input);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        fotoCaminho: "/uploads/clientes/test-id.png",
      }));
    });
  });

  describe("update", () => {
    it("should update cliente without photo", async () => {
      const input = { nome: "Cliente Updated" };
      // set() returns mockDb (default), where() returns result
      mockDb.where.mockResolvedValue({ affectedRows: 1 });

      await clientesService.update(1, input);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        nome: "Cliente Updated",
      }));
    });

    it("should update cliente with photo and delete old one", async () => {
      const input = { 
        nome: "Cliente Updated",
        foto: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      };
      
      // First where call is for select (finding existing client)
      // Second where call is for update
      mockDb.where
        .mockResolvedValueOnce([{ id: 1, fotoCaminho: "/old/path.png" }])
        .mockResolvedValueOnce({ affectedRows: 1 });

      await clientesService.update(1, input);

      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        fotoCaminho: "/uploads/clientes/test-id.png",
      }));
    });
  });

  describe("remove", () => {
    it("should remove cliente and delete photo", async () => {
      mockDb.where.mockResolvedValueOnce([{ id: 1, fotoCaminho: "/old/path.png" }]); // Existing client
      mockDb.delete.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 }); // Delete result

      await clientesService.remove(1);

      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
