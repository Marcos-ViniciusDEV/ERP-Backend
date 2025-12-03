import { Router } from "express";
import { offersController } from "../controllers/offers.controller";

const router = Router();

router.post("/", offersController.create);
router.get("/", offersController.getAll);
router.delete("/:id", offersController.delete);

export default router;
