import { NextFunction, Request, Response } from "express";
import { requirePermission } from "../../src/middleware/permission.middleware";

describe("requirePermission", () => {
  const next = jest.fn() as NextFunction;
  const json = jest.fn();
  const status = jest.fn();
  const response = { status } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
    status.mockReturnValue({ json });
  });

  it("allows administrators without explicit permissions", () => {
    const request = { user: { role: "admin" } } as Request;

    requirePermission("fiscal_configurar")(request, response, next);

    expect(next).toHaveBeenCalled();
  });

  it("allows a regular user with the required permission", () => {
    const request = {
      user: { role: "user", permissions: JSON.stringify({ fiscal_configurar: true }) },
    } as Request;

    requirePermission("fiscal_configurar")(request, response, next);

    expect(next).toHaveBeenCalled();
  });

  it("denies a regular user without the required permission", () => {
    const request = {
      user: { role: "user", permissions: JSON.stringify({ fiscal_consultar: true }) },
    } as Request;

    requirePermission("fiscal_configurar")(request, response, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
