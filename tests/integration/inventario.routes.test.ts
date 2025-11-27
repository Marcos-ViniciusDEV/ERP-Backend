import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app";

describe("Inventario Routes Integration", () => {
  describe("GET /api/inventario", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/inventario");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/inventario", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/inventario")
        .send({ status: "ABERTO" });
      expect(response.status).toBe(401);
    });
  });
});
