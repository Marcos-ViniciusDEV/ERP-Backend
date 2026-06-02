import { Router } from "express";
import { z } from "zod";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { loginSchema, registerSchema } from "../zod/auth.schema";

export const authRouter = Router();

const validateCompanySchema = z.object({
  body: z.object({
    cnpj: z.string().min(11).max(18),
    senhaAcesso: z.string().min(1).max(120),
  }),
});

authRouter.post("/login", validate(z.object({ body: loginSchema })), authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.post("/validate-company", validate(validateCompanySchema), authController.validateCompany);
authRouter.post("/checkout-company", validate(validateCompanySchema), authController.checkoutCompany);
authRouter.post("/register", validate(z.object({ body: registerSchema })), authController.register);
authRouter.get("/me", authenticate, authController.me);
