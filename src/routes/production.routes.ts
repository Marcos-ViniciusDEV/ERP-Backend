import { Router } from "express";
import { productionController } from "../controllers/production.controller";

const router = Router();

router.post("/", productionController.register);
router.get("/", productionController.list);
router.get("/preview/:produtoId", productionController.preview);

export default router;
