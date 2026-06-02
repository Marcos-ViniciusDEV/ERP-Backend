import request from "supertest";
import { jest } from "@jest/globals";
import { SignJWT, jwtVerify } from "jose";
import { app } from "../../src/app";
import { createCheckoutCompanyToken } from "../../src/services/auth.service";

describe("app upload security", () => {
  it("blocks public HTTP access to certificate files", async () => {
    const response = await request(app).get("/uploads/certificados/empresa-1/certificado.pfx");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Acesso publico a certificados nao permitido");
  });

  it("exposes a dependency-free liveness endpoint", async () => {
    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      status: "ok",
      uptimeSeconds: expect.any(Number),
      timestamp: expect.any(String),
    }));
  });

  it("reports unavailable readiness when MySQL is not configured", async () => {
    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual(expect.objectContaining({
      status: "unavailable",
      database: "not_configured",
    }));
  });

  it("exposes the public commercial plan catalog without authentication", async () => {
    const response = await request(app).get("/api/checkout/planos");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ codigo: "starter", valorMensalCentavos: 10000, valorMensalPadraoCentavos: 15000 }),
      expect.objectContaining({ codigo: "profissional", valorMensalCentavos: 20000, valorMensalPadraoCentavos: 25000 }),
    ]));
  });

  it("requires authentication to create a commercial checkout payment", async () => {
    const response = await request(app).post("/api/checkout/pagamentos").send({});

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized: No token provided");
  });

  it("requires authentication to read a commercial checkout status", async () => {
    const response = await request(app).get("/api/checkout/checkout-uuid/status");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized: No token provided");
  });

  it("requires authentication to download the product import template", async () => {
    const response = await request(app).get("/api/produtos/importacao/template");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized: No token provided");
  });

  it("requires authentication to read onboarding progress", async () => {
    const response = await request(app).get("/api/empresas/onboarding");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized: No token provided");
  });

  it("requires authentication to read the central company profile", async () => {
    const response = await request(app).get("/api/empresas/perfil");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized: No token provided");
  });

  it("requires SaaS admin authentication to read the global fiscal provider", async () => {
    const response = await request(app).get("/api/saas/fiscal/provider");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized: No token provided");
  });

  it("does not allow a checkout company token to access ERP routes", async () => {
    jest.mocked(SignJWT as any).mockImplementation(() => ({
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue("mock-token"),
    }));
    jest.mocked(jwtVerify as any).mockResolvedValueOnce({
      payload: {
        userId: 0,
        openId: "checkout_empresa_99",
        email: null,
        name: "Empresa Checkout",
        role: "checkout_company",
        empresaId: 99,
        scope: "checkout",
      },
    });
    const token = await createCheckoutCompanyToken({
      id: 99,
      razaoSocial: "Empresa Checkout",
      nomeFantasia: "Empresa Checkout",
    });

    const response = await request(app)
      .get("/api/clientes")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Token restrito ao checkout comercial");
  });
});
