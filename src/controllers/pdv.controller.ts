import { Request, Response } from "express";
import * as pdvService from "../services/pdv.service";
import { sincronizarPDVSchema } from "../zod/pdv.schema";
import { ZodError } from "zod";
import * as pdvWebSocketService from "../services/pdv-websocket.service";

/**
 * Controller para endpoints do PDV
 */
/**
 * GET /api/pdv/carga-inicial
 * Retorna produtos, usuários e formas de pagamento para o PDV
 */
export async function cargaInicial(_req: Request, res: Response) {
  try {
    const dados = await pdvService.getCargaInicial();
    res.json({
      success: true,
      data: dados,
    });
  } catch (error: any) {
    console.error("Erro ao buscar carga inicial:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar dados para carga inicial",
      message: error.message,
    });
  }
}

/**
 * POST /api/pdv/sincronizar
 * Recebe lote de vendas e movimentos de caixa do PDV
 */
export async function sincronizar(req: Request, res: Response) {
  try {
    // Validar dados com Zod
    const dadosValidados = sincronizarPDVSchema.parse(req.body);

    // Processar sincronização
    const resultado = await pdvService.sincronizar(dadosValidados);

    // Se houve processamento com sucesso, transmitir atualização de estoque para todos os PDVs
    if (resultado.vendasProcessadas > 0 || resultado.movimentosProcessados > 0) {
      const dadosAtualizados = await pdvService.getCargaInicial();
      pdvWebSocketService.broadcastCatalog(dadosAtualizados);
    }

    // Retornar resultado
    res.json({
      success: true,
      data: resultado,
      message: `${resultado.vendasProcessadas} vendas e ${resultado.movimentosProcessados} movimentos processados`,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: "Dados inválidos",
        details: error.issues,
      });
    }

    console.error("Erro ao sincronizar PDV:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao processar sincronização",
      message: error.message,
    });
  }
}

/**
 * GET /api/pdv/ativos
 * Retorna lista de PDVs conectados via WebSocket
 */
export async function getActivePDVs(_req: Request, res: Response) {
  try {
    const pdvs = pdvWebSocketService.getActivePDVs();
    res.json({
      success: true,
      data: pdvs,
    });
  } catch (error: any) {
    console.error("Erro ao buscar PDVs ativos:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar PDVs ativos",
      message: error.message,
    });
  }
}

/**
 * POST /api/pdv/enviar-carga
 * Envia carga inicial para PDVs específicos ou todos
 */
export async function enviarCarga(req: Request, res: Response) {
  try {
    const { pdvIds } = req.body; // Array de IDs ou undefined para todos

    // Buscar carga inicial (isso também atualiza os preços PDV no banco)
    const dados = await pdvService.getCargaInicial();

    let sent = 0;
    if (pdvIds && Array.isArray(pdvIds)) {
      // Enviar para PDVs específicos
      for (const pdvId of pdvIds) {
        if (pdvWebSocketService.sendCatalogToPDV(pdvId, dados)) {
          sent++;
        }
      }
    } else {
      // Enviar para todos
      sent = pdvWebSocketService.broadcastCatalog(dados);
    }

    res.json({
      success: true,
      message: `Carga enviada para ${sent} PDV(s)`,
      sent,
    });
  } catch (error: any) {
    console.error("Erro ao enviar carga:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao enviar carga",
      message: error.message,
    });
  }
}

/**
 * GET /api/pdv/movimentos
 * Lista movimentações de caixa (Sangrias, etc)
 */
export async function listMovements(req: Request, res: Response) {
  try {
    const { dataInicio, dataFim, tipo, pdvId, operadorId } = req.query;

    const filters = {
      dataInicio: dataInicio as string,
      dataFim: dataFim as string,
      tipo: tipo as string,
      pdvId: pdvId as string,
      operadorId: operadorId ? Number(operadorId) : undefined,
    };

    const movimentos = await pdvService.listMovements(filters);
    
    res.json({
      success: true,
      data: movimentos,
    });
  } catch (error: any) {
    console.error("Erro ao buscar movimentos:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar movimentos",
      message: error.message,
    });
  }
}
