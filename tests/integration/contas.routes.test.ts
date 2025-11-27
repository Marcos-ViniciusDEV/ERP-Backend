import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app";

describe("Contas Routes Integration", () => {
  describe("GET /api/contas-pagar", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/contas-pagar");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/contas-receber", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/contas-receber");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/contas-pagar", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/contas-pagar")
        .send({ descricao: "Test", valor: 100 });
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/contas-receber", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/contas-receber")
        .send({ descricao: "Test", valor: 100 });
      expect(response.status).toBe(401);
    });
  });
});
