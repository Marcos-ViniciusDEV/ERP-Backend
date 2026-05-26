import type { ErrorRequestHandler, Request, Response } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = Number(err?.status || err?.statusCode || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;

  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, {
    status: safeStatus,
    message: err?.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  });

  res.status(safeStatus).json({
    status: "error",
    message:
      safeStatus >= 500
        ? "Ocorreu um erro interno no servidor."
        : "Nao foi possivel processar a requisicao.",
  });
};

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    status: "error",
    message: `Rota nao encontrada: ${req.method} ${req.originalUrl}`,
  });
}
