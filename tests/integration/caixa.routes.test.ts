import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app";

describe("Caixa Routes Integration", () => {
  describe("GET /api/caixa", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/caixa");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/caixa", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/caixa")
        .send({ tipo: "ABERTURA", valor: 100 });
      expect(response.status).toBe(401);
    });
  });
});
