import { Router } from "express";
import * as usersController from "../controllers/users.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenant.middleware";

export const usersRouter = Router();

// Todas as rotas de usuários requerem autenticação e empresa vinculada
usersRouter.use(authenticate);
usersRouter.use(requireTenant);

// Listar usuários
usersRouter.get("/", usersController.listUsers);

// Criar usuário
usersRouter.post("/", usersController.createUser);

// Atualizar usuário
usersRouter.put("/:id", usersController.updateUser);

// Alterar senha do usuário
usersRouter.put("/:id/password", usersController.updatePassword);

// Deletar usuário
usersRouter.delete("/:id", usersController.deleteUser);

