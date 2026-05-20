import { Router } from "express";
import { offersController } from "../controllers/offers.controller";

const router = Router();

router.post("/", offersController.create);
router.get("/", offersController.getAll);
router.get("/active", offersController.getActive);
router.put("/:id", offersController.update);
router.patch("/:id/toggle", offersController.toggleAtivo);
router.delete("/:id", offersController.delete);

export default router;
