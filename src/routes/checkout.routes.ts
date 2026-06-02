import { Router, type RequestHandler } from "express";
import { checkoutController } from "../controllers/checkout.controller";
import { authenticateCheckout } from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenant.middleware";

export const checkoutRouter = Router();

const asyncHandler = (handler: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

checkoutRouter.get("/planos", checkoutController.listPlans);
checkoutRouter.get("/configuracao", checkoutController.configuration);
checkoutRouter.post("/webhooks/mercado-pago", asyncHandler(checkoutController.mercadoPagoWebhook));
checkoutRouter.post("/pix", authenticateCheckout, requireTenant, asyncHandler(checkoutController.createPix));
checkoutRouter.post("/pagamentos", authenticateCheckout, requireTenant, asyncHandler(checkoutController.createPayment));
checkoutRouter.get("/:uuid/status", authenticateCheckout, requireTenant, asyncHandler(checkoutController.status));
