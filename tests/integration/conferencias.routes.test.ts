import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app";

describe("Conferencias Routes Integration", () => {
  describe("GET /api/conferencias/pendentes", () => {
    it("should return route exists (not 404)", async () => {
      const response = await request(app).get("/api/conferencias/pendentes");
      // Route exists if status is not 404
      expect(response.status).not.toBe(404);
    });
  });

  describe("POST /api/conferencias", () => {
    it("should return route exists (not 404)", async () => {
      const response = await request(app)
        .post("/api/conferencias")
        .send({ movimentacaoEstoqueId: 1, produtoId: 1 });
      // Route exists if status is not 404
      expect(response.status).not.toBe(404);
    });
  });
});
