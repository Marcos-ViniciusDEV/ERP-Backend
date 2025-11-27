import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app";

describe("Fornecedores Routes Integration", () => {
  describe("GET /api/fornecedores", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/fornecedores");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/fornecedores", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/fornecedores")
        .send({ nome: "Test Supplier" });
      expect(response.status).toBe(401);
    });
  });
});
