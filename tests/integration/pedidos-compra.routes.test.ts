import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app";

describe("Pedidos Compra Routes Integration", () => {
  describe("GET /api/pedidos-compra", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/pedidos-compra");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/pedidos-compra", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/pedidos-compra")
        .send({ fornecedorId: 1, status: "PENDENTE" });
      expect(response.status).toBe(401);
    });
  });
});
