import { Request, Response } from "express";
import { conferenciaService } from "../services/conferencia.service";
import {
  createConferenciaSchema,
  updateConferenciaSchema,
  iniciarConferenciaSchema,
  finalizarConferenciaSchema,
} from "../models/conferencia.model";

export class ConferenciasController {
  /**
   * GET /conferencias/pendentes
   * Listar NFes pendentes de conferência
   */
  async listPendentes(req: Request, res: Response) {
    try {
      const pendentes = await conferenciaService.listPendentes();
      res.json(pendentes);
    } catch (error) {
      console.error("[ConferenciasController] Error listing pendentes:", error);
      res.status(500).json({ error: "Erro ao listar NFes pendentes" });
    }
  }

  /**
   * GET /conferencias/movimentacao/:id
   * Listar conferências de uma NFe específica
   */
  async listByMovimentacao(req: Request, res: Response) {
    try {
      const movimentacaoId = parseInt(req.params.id);
      const conferencias = await conferenciaService.listByMovimentacao(
        movimentacaoId
      );
      res.json(conferencias);
    } catch (error) {
      console.error(
        "[ConferenciasController] Error listing by movimentacao:",
        error
      );
      res.status(500).json({ error: "Erro ao listar conferências" });
    }
  }

  /**
   * POST /conferencias/movimentacao/:id/iniciar
   * Iniciar conferência de uma NFe
   */
  async iniciar(req: Request, res: Response) {
    try {
      const movimentacaoId = parseInt(req.params.id);
      const validated = iniciarConferenciaSchema.parse({ movimentacaoEstoqueId: movimentacaoId });

      const result = await conferenciaService.iniciarConferencia(
        movimentacaoId
      );
      res.json(result);
    } catch (error: any) {
      console.error("[ConferenciasController] Error iniciando conferencia:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Dados inválidos", details: error.errors });
      } else {
        res.status(500).json({ error: "Erro ao iniciar conferência" });
      }
    }
  }

  /**
   * POST /conferencias
   * Criar nova conferência de item
   */
  async create(req: Request, res: Response) {
    try {
      const validated = createConferenciaSchema.parse(req.body);
      const usuarioId = (req as any).user?.id || 1; // TODO: pegar do token JWT

      const result = await conferenciaService.create(validated, usuarioId);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("[ConferenciasController] Error creating conferencia:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Dados inválidos", details: error.errors });
      } else {
        res.status(500).json({ error: "Erro ao criar conferência" });
      }
    }
  }

  /**
   * PUT /conferencias/:id
   * Atualizar conferência existente
   */
  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const validated = updateConferenciaSchema.parse({ ...req.body, id });

      const result = await conferenciaService.update(id, validated);
      res.json(result);
    } catch (error: any) {
      console.error("[ConferenciasController] Error updating conferencia:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Dados inválidos", details: error.errors });
      } else {
        res.status(500).json({ error: "Erro ao atualizar conferência" });
      }
    }
  }

  /**
   * POST /conferencias/movimentacao/:id/finalizar
   * Finalizar conferência e atualizar estoque
   */
  async finalizar(req: Request, res: Response) {
    try {
      const movimentacaoId = parseInt(req.params.id);
      const validated = finalizarConferenciaSchema.parse({ movimentacaoEstoqueId: movimentacaoId });

      const result = await conferenciaService.finalizarConferencia(
        movimentacaoId
      );
      res.json(result);
    } catch (error: any) {
      console.error("[ConferenciasController] Error finalizando conferencia:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Dados inválidos", details: error.errors });
      } else {
        res.status(500).json({ error: "Erro ao finalizar conferência" });
      }
    }
  }

  /**
   * GET /conferencias/codigo-barras/:codigo
   * Buscar produto por código de barras
   */
  async getByCodigoBarras(req: Request, res: Response) {
    try {
      const codigoBarras = req.params.codigo;
      const movimentacaoId = parseInt(req.query.movimentacaoId as string);

      if (!movimentacaoId) {
        return res
          .status(400)
          .json({ error: "movimentacaoId é obrigatório" });
      }

      const result = await conferenciaService.getByCodigoBarras(
        codigoBarras,
        movimentacaoId
      );

      if (!result) {
        return res
          .status(404)
          .json({ error: "Produto não encontrado nesta NFe" });
      }

      res.json(result);
    } catch (error) {
      console.error(
        "[ConferenciasController] Error getting by codigo barras:",
        error
      );
      res.status(500).json({ error: "Erro ao buscar produto" });
    }
  }
}

export const conferenciasController = new ConferenciasController();
