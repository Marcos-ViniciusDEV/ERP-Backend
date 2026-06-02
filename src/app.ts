import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import swaggerUi from "swagger-ui-express";
import { appRouter } from "./routes";
import { swaggerSpec } from "./swagger";
import { ENV } from "./libs/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { responseSanitizer } from "./middleware/response-sanitizer.middleware";
import { getDb } from "./libs/db";
import { sql } from "drizzle-orm";
import { startFiscalPolling } from "./services/fiscal.service";

export const app = express();

app.disable("x-powered-by");

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || ENV.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(Object.assign(new Error("Origem nao permitida pelo CORS"), { status: 403 }));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

const globalLimiter = rateLimit({
  windowMs: ENV.rateLimitWindowMs,
  limit: ENV.rateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Muitas requisicoes. Aguarde alguns instantes e tente novamente.",
  },
});

const authLimiter = rateLimit({
  windowMs: ENV.authRateLimitWindowMs,
  limit: ENV.authRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas de acesso. Tente novamente mais tarde.",
  },
});

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors(corsOptions));
app.use(globalLimiter);
app.use("/api/auth", authLimiter);
app.use(responseSanitizer);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? "10mb" }));
app.use(express.urlencoded({ limit: process.env.URLENCODED_BODY_LIMIT ?? "10mb", extended: true }));
app.use(hpp());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Static files
app.use("/uploads/certificados", (_req, res) => {
  res.status(403).json({ error: "Acesso publico a certificados nao permitido" });
});
app.use("/uploads", express.static("uploads", { dotfiles: "deny", maxAge: "1h" }));

// Routes
app.use("/api", appRouter);

const healthPayload = () => ({
  timestamp: new Date().toISOString(),
  uptimeSeconds: Math.round(process.uptime()),
  environment: process.env.NODE_ENV ?? "development",
});

// Liveness does not depend on external services. Readiness verifies MySQL.
app.get(["/health", "/health/live"], (_req, res) => {
  res.json({ status: "ok", ...healthPayload() });
});

app.get("/health/ready", async (_req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      res.status(503).json({ status: "unavailable", database: "not_configured", ...healthPayload() });
      return;
    }

    await db.execute(sql`select 1`);
    res.json({ status: "ok", database: "ok", ...healthPayload() });
  } catch {
    res.status(503).json({ status: "unavailable", database: "error", ...healthPayload() });
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

startFiscalPolling();
