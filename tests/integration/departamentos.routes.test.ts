import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app";

describe("Departamentos Routes Integration", () => {
  describe("GET /api/departamentos", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/api/departamentos");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/departamentos", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/departamentos")
        .send({ nome: "Test Department" });
      expect(response.status).toBe(401);
    });
  });
});
