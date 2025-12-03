import { Router } from "express";
import { recipesController } from "../controllers/recipes.controller";

const router = Router();

router.post("/", recipesController.create);
router.get("/product/:productId", recipesController.getByProduct);
router.delete("/:id", recipesController.delete);

export default router;
