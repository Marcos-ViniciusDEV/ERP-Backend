import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app";

describe("Clientes Routes Integration", () => {
  describe("GET /api/clientes", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/clientes");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/clientes", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/clientes")
        .send({ nome: "Test Client" });
      expect(response.status).toBe(401);
    });
  });
});
