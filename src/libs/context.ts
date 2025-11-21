import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authService } from "../services/auth.service";
import { getDb } from "./db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authService.authenticateRequest(opts.req as any);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed");
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    db,
  };
}
