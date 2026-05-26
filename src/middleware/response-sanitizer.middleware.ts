import { NextFunction, Request, Response } from "express";
import { sanitizeResponse } from "../utils/sanitizer";

export function responseSanitizer(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = (body?: any) => originalJson(sanitizeResponse(body));

  next();
}
