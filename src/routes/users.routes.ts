import { Router } from "express";
import * as usersController from "../controllers/users.controller";
import { authenticate } from "../middleware/auth.middleware";

export const usersRouter = Router();

// Todas as rotas de usuários requerem autenticação
usersRouter.use(authenticate);

// Listar usuários (apenas admin ou gerente - por enquanto aberto a logados, mas idealmente restrito)
usersRouter.get("/", usersController.listUsers);

// Criar usuário
usersRouter.post("/", usersController.createUser);

// Atualizar usuário
usersRouter.put("/:id", usersController.updateUser);

// Deletar usuário
usersRouter.delete("/:id", usersController.deleteUser);
