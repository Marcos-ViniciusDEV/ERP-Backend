import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app";

describe("Vendas Routes Integration", () => {
  describe("GET /api/vendas", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/vendas");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/vendas", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/vendas")
        .send({ itens: [] });
      expect(response.status).toBe(401);
    });
  });
});
