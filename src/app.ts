import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { appRouter } from "./routes";
import { swaggerSpec } from "./swagger";

export const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Static files
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api", appRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
