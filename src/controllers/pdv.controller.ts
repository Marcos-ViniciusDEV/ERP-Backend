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
export async function cargaInicial(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId;
    if (!empresaId) throw new Error("Acesso negado: empresaId não definido");

    const dados = await pdvService.getCargaInicial(empresaId);
    // O terminal autenticado precisa dos hashes para validar operadores offline.
    res.locals.allowedResponseSensitiveKeys = ["passwordHash"];
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
    const empresaId = req.empresaId;
    if (!empresaId) throw new Error("Acesso negado: empresaId não definido");

    const resultado = await pdvService.sincronizar(empresaId, dadosValidados);

    // Se houve processamento com sucesso, transmitir atualização de estoque para todos os PDVs
    if (resultado.vendasProcessadas > 0 || resultado.movimentosProcessados > 0) {
      const dadosAtualizados = await pdvService.getCargaInicial(empresaId);
      pdvWebSocketService.broadcastCatalog(dadosAtualizados, empresaId);
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
export async function getActivePDVs(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId;
    if (!empresaId) throw new Error("Acesso negado: empresaId nao definido");

    const pdvs = pdvWebSocketService.getActivePDVs(empresaId);
    let keyStatuses: any[] = [];
    try {
      keyStatuses = await pdvService.listPinpadPairingKeyStatus(empresaId, pdvs.map((pdv: any) => pdv.id));
    } catch (error: any) {
      console.warn("[PDV] Status de PinPad indisponivel:", error.message);
    }
    const empresa = await pdvService.getEmpresaIdentity(empresaId);

    const pdvsComMaquininha = pdvs.map((pdv: any) => {
      const pinpadKey = keyStatuses.find((item) => item.pdvId === pdv.id);

      return {
        ...pdv,
        cnpjVinculado: empresa?.cnpj || null,
        pinpadKey,
        maquininha: {
          conectada: false,
          nomeTerminal: null,
          tipo: null,
          provedor: null,
          status: "Modulo de pagamento nao carregado",
          identificador: null,
        },
      };
    });

    res.json({
      success: true,
      data: pdvsComMaquininha,
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

export async function gerarPinpadKey(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId;
    if (!empresaId) throw new Error("Acesso negado: empresaId nao definido");

    const pdvId = String(req.params.pdvId || req.body?.pdvId || "").trim();
    if (!pdvId) {
      res.status(400).json({ success: false, error: "pdvId e obrigatorio" });
      return;
    }

    const online = pdvWebSocketService.getActivePDVs(empresaId).some((pdv: any) => pdv.id === pdvId);
    if (!online) {
      res.status(400).json({ success: false, error: "O PDV precisa estar online para gerar a chave do PinPad" });
      return;
    }

    const data = await pdvService.generatePinpadPairingKey(empresaId, pdvId);
    res.json({
      success: true,
      data,
      message: `Chave PinPad gerada para o PDV ${pdvId}`,
    });
  } catch (error: any) {
    console.error("Erro ao gerar chave PinPad:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao gerar chave PinPad",
      message: error.message,
    });
  }
}

export async function gerarTokenAcesso(req: Request, res: Response) {
  try {
    const empresaId = req.empresaId;
    if (!empresaId) throw new Error("Acesso negado: empresaId nao definido");

    const pdvId = String(req.body?.pdvId || "").trim();
    if (!pdvId) {
      res.status(400).json({ success: false, error: "pdvId e obrigatorio" });
      return;
    }

    const data = await pdvService.generatePdvAccessToken(empresaId, pdvId);
    res.json({
      success: true,
      data,
      message: `Token de sincronizacao gerado para o PDV ${pdvId}`,
    });
  } catch (error: any) {
    console.error("Erro ao gerar token de acesso do PDV:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao gerar token de acesso do PDV",
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
    const empresaId = req.empresaId;
    if (!empresaId) throw new Error("Acesso negado: empresaId não definido");
    const dados = await pdvService.getCargaInicial(empresaId);

    let sent = 0;
    if (pdvIds && Array.isArray(pdvIds)) {
      // Enviar para PDVs específicos
      for (const pdvId of pdvIds) {
        if (pdvWebSocketService.sendCatalogToPDV(empresaId, pdvId, dados)) {
          sent++;
        }
      }
    } else {
      // Enviar para todos
      sent = pdvWebSocketService.broadcastCatalog(dados, empresaId);
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

    const empresaId = req.empresaId;
    if (!empresaId) throw new Error("Acesso negado: empresaId não definido");
    
    const movimentos = await pdvService.listMovements(empresaId, filters);
    
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

/**
 * POST /api/pdv/heartbeat
 * Recebe sinal de vida do PDV via HTTP (fallback para PDVs sem WebSocket ativo)
 */
export async function heartbeat(req: Request, res: Response) {
  try {
    const { pdvId, name, location } = req.body;

    if (!pdvId) {
      res.status(400).json({ success: false, error: "pdvId é obrigatório" });
      return;
    }

    const empresaId = req.empresaId;
    if (!empresaId) throw new Error("Acesso negado: empresaId nao definido");

    pdvWebSocketService.registerHttpHeartbeat(empresaId, pdvId, name, location);
    console.log(`[Heartbeat] PDV ${pdvId} online (HTTP) - empresaId: ${req.empresaId}`);

    res.json({
      success: true,
      message: "Heartbeat recebido",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Erro no heartbeat:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao processar heartbeat",
      message: error.message,
    });
  }
}

