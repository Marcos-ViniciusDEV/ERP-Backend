import { Request, Response } from "express";
import * as fiscalService from "../services/fiscal.service";
import * as pdvService from "../services/pdv.service";
import * as pdvWebSocketService from "../services/pdv-websocket.service";
import { fiscalCancelSchema, fiscalConfigSchema, fiscalPrepareSchema, fiscalPreflightSchema } from "../zod/fiscal.schema";

export async function getConfig(req: Request, res: Response) {
  try {
    const config = await fiscalService.getConfig(req.empresaId!);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao buscar configuracoes fiscais" });
  }
}

export async function updateConfig(req: Request, res: Response) {
  try {
    const input = fiscalConfigSchema.parse(req.body);
    const config = await fiscalService.updateConfig(req.empresaId!, input);
    let pdvCarga = { sent: 0, requested: false };

    if (req.query.enviarCarga === "true" || req.body?.enviarCargaPdv === true) {
      const carga = await pdvService.getCargaInicial(req.empresaId!);
      const sent = pdvWebSocketService.broadcastCatalog(carga);
      pdvCarga = { sent, requested: true };
    }

    res.json({ config, pdvCarga });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar configuracoes fiscais" });
  }
}

export async function listDocuments(req: Request, res: Response) {
  try {
    const documents = await fiscalService.listDocuments(req.empresaId!);
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao listar documentos fiscais" });
  }
}

export async function preflight(req: Request, res: Response) {
  try {
    const input = fiscalPreflightSchema.parse(req.body);
    const result = await fiscalService.preflightSale(req.empresaId!, input);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro na pre-validacao fiscal" });
  }
}

export async function prepare(req: Request, res: Response) {
  try {
    const input = fiscalPrepareSchema.parse(req.body);
    const result = await fiscalService.prepareFiscalDocument(req.empresaId!, input);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao preparar documento fiscal" });
  }
}

export async function emitir(req: Request, res: Response) {
  try {
    const input = fiscalPrepareSchema.parse(req.body);
    const result = await fiscalService.emitirNotaDaVenda(req.empresaId!, input);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao criar nota fiscal" });
  }
}

export async function xml(req: Request, res: Response) {
  try {
    const document = await fiscalService.getDocumentXml(req.empresaId!, Number(req.params.id));
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=nota-${document.id}.xml`);
    res.send(document.xml);
  } catch (error: any) {
    res.status(404).json({ error: error.message || "XML nao encontrado" });
  }
}

export async function danfe(req: Request, res: Response) {
  try {
    const html = await fiscalService.getDocumentDanfeHtml(req.empresaId!, Number(req.params.id));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error: any) {
    res.status(404).json({ error: error.message || "DANFE nao encontrado" });
  }
}

export async function cancel(req: Request, res: Response) {
  try {
    const input = fiscalCancelSchema.parse(req.body);
    const document = await fiscalService.cancelDocument(req.empresaId!, Number(req.params.id), input.justificativa);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao cancelar documento fiscal" });
  }
}

export async function summary(req: Request, res: Response) {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();
    const result = await fiscalService.getFiscalSummary(req.empresaId!, month, year);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao buscar resumo fiscal" });
  }
}
