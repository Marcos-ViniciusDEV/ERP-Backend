// Global setup for integration tests
import { jest } from "@jest/globals";

// Mock jose module to avoid ESM issues
jest.mock("jose", () => ({
  SignJWT: jest.fn(),
  jwtVerify: jest.fn(),
}));

// Mock nanoid
jest.mock("nanoid", () => ({
  nanoid: () => "test-id",
}));
