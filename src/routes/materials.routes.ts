import { Router } from "express";
import { materialsController } from "../controllers/materials.controller";

const router = Router();

router.post("/", materialsController.create);
router.get("/", materialsController.getAll);
router.put("/:id", materialsController.update);
router.delete("/:id", materialsController.delete);

export default router;
