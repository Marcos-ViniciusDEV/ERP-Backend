import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app";

describe("Kardex Routes Integration", () => {
  describe("GET /api/kardex", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/kardex");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/kardex", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/kardex")
        .send({ produtoId: 1, tipo: "ENTRADA", quantidade: 10 });
      expect(response.status).toBe(401);
    });
  });
});
