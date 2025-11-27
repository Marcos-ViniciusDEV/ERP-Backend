import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as authService from "../../src/services/auth.service";
import { getDb } from "../../src/libs/db";
import { hashPassword, verifyPassword } from "../../src/libs/password";
import { SignJWT, jwtVerify } from "jose";

// Mock dependencies
jest.mock("../../src/libs/db", () => ({
  getDb: jest.fn(),
}));
jest.mock("../../src/libs/env", () => ({
  ENV: {
    jwtSecret: "test-secret",
    jwtExpiresIn: "1h",
    ownerOpenId: "owner-id",
  },
}));
jest.mock("../../src/libs/password");
jest.mock("jose", () => ({
  SignJWT: jest.fn(),
  jwtVerify: jest.fn(),
}));
jest.mock("nanoid", () => ({
  nanoid: () => "test-nanoid",
}));

// Mock Drizzle schema to avoid actual DB dependency
jest.mock("../../drizzle/schema", () => ({
  users: {
    id: "id",
    email: "email",
    openId: "openId",
  },
}));

describe("AuthService", () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
    insert: jest.fn(),
    values: jest.fn(),
    onDuplicateKeyUpdate: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup chainable mocks
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.onDuplicateKeyUpdate.mockReturnValue(mockDb);
    
    // Default leaf methods
    mockDb.limit.mockResolvedValue([]);
    mockDb.values.mockResolvedValue([]);

    jest.mocked(getDb).mockResolvedValue(mockDb);
    jest.mocked(hashPassword).mockReturnValue("hashed-password");
    jest.mocked(verifyPassword).mockReturnValue(true);
    
    // Mock jose
    jest.mocked(SignJWT as any).mockImplementation(() => ({
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      sign: jest.fn().mockImplementation(() => Promise.resolve("mock-token")),
    }));
    
    jest.mocked(jwtVerify as any).mockResolvedValue({
      payload: {
        userId: 1,
        openId: "test-openid",
        email: "test@example.com",
        name: "Test User",
        role: "user",
      },
    });
  });

  describe("login", () => {
    it("should login successfully with correct credentials", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        password: "hashed-password",
        name: "Test User",
        role: "user",
        openId: "test-openid",
      };

      mockDb.limit.mockResolvedValue([mockUser]);

      const result = await authService.login("test@example.com", "password");

      expect(result).toHaveProperty("token", "mock-token");
      expect(result.user).toEqual(mockUser);
      expect(verifyPassword).toHaveBeenCalledWith("password", "hashed-password");
    });

    it("should throw error if user not found", async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(authService.login("wrong@example.com", "password"))
        .rejects.toThrow("Usuário não encontrado ou sem senha configurada");
    });

    it("should throw error if password incorrect", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        password: "hashed-password",
      };

      mockDb.limit.mockResolvedValue([mockUser]);
      (verifyPassword as jest.Mock).mockReturnValue(false);

      await expect(authService.login("test@example.com", "wrong-password"))
        .rejects.toThrow("Senha incorreta");
    });
  });

  describe("register", () => {
    it("should register new user successfully", async () => {
      mockDb.limit.mockResolvedValueOnce([]); // Check existing user
      mockDb.values.mockResolvedValue([{ insertId: 1 }]); // Insert
      mockDb.limit.mockResolvedValueOnce([{ id: 1, email: "new@example.com" }]); // Get new user

      const result = await authService.register("new@example.com", "New User", "password");

      expect(result).toHaveProperty("token", "mock-token");
      expect(hashPassword).toHaveBeenCalledWith("password");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should throw error if email already exists", async () => {
      mockDb.limit.mockResolvedValue([{ id: 1 }]); // Existing user

      await expect(authService.register("existing@example.com", "User", "password"))
        .rejects.toThrow("Este e-mail já está registrado");
    });
  });
});
