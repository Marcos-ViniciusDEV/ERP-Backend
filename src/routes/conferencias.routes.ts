import { Router } from "express";
import * as conferenciasController from "../controllers/conferencias.controller";

const router = Router();

// Listar NFes pendentes de conferência
router.get("/pendentes", (req, res) =>
  conferenciasController.listPendentes(req, res)
);

// Listar conferências de uma NFe específica
router.get("/movimentacao/:id", (req, res) =>
  conferenciasController.listByMovimentacao(req, res)
);

// Iniciar conferência de uma NFe
router.post("/movimentacao/:id/iniciar", (req, res) =>
  conferenciasController.iniciar(req, res)
);

// Criar nova conferência de item
router.post("/", (req, res) => conferenciasController.create(req, res));

// Atualizar conferência existente
router.put("/:id", (req, res) => conferenciasController.update(req, res));

// Finalizar conferência e atualizar estoque
router.post("/movimentacao/:id/finalizar", (req, res) =>
  conferenciasController.finalizar(req, res)
);

// Buscar produto por código de barras
router.get("/codigo-barras/:codigo", (req, res) =>
  conferenciasController.getByCodigoBarras(req, res)
);

// Resetar conferência de um item
router.post("/:id/reset", (req, res) =>
  conferenciasController.reset(req, res)
);

// Deletar conferência de um item
router.delete("/:id", (req, res) =>
  conferenciasController.deleteConferencia(req, res)
);

export default router;
