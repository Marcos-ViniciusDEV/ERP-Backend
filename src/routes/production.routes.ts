import { Router } from "express";
import { productionController } from "../controllers/production.controller";

const router = Router();

router.post("/", productionController.register);

export default router;
