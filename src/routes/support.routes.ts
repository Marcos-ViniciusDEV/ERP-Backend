import { Router } from "express";
import { supportController } from "../controllers/support.controller";

export const supportRouter = Router();

supportRouter.get("/overview", supportController.overview);
supportRouter.get("/search", supportController.search);

supportRouter.get("/tickets", supportController.listTickets);
supportRouter.post("/tickets", supportController.createTicket);
supportRouter.patch("/tickets/:id", supportController.updateTicket);

supportRouter.get("/articles", supportController.listArticles);
supportRouter.post("/articles", supportController.createArticle);
supportRouter.patch("/articles/:id", supportController.updateArticle);

supportRouter.get("/tutorials", supportController.listTutorials);
supportRouter.post("/tutorials", supportController.createTutorial);
supportRouter.patch("/tutorials/:id", supportController.updateTutorial);

supportRouter.post("/whatsapp-link", supportController.whatsappLink);
