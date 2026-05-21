import { Router } from "express";
import * as whatsappController from "../controllers/whatsapp.controller";

export const whatsappRouter = Router();

whatsappRouter.get("/config", whatsappController.getConfig);
whatsappRouter.put("/config", whatsappController.upsertConfig);
whatsappRouter.post("/link", whatsappController.buildMessageLink);

