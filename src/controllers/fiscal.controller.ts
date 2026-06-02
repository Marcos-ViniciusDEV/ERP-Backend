import { Request, Response } from "express";
import * as fiscalService from "../services/fiscal.service";
import * as pdvService from "../services/pdv.service";
import * as pdvWebSocketService from "../services/pdv-websocket.service";
import {
  certificadoDigitalSchema,
  fiscalCartaCorrecaoSchema,
  empresaFiscalSchema,
  fiscalCancelSchema,
  fiscalConfigSchema,
  fiscalInutilizacaoSchema,
  fiscalPrepareSchema,
  fiscalPreflightSchema,
  satMfeCupomSchema,
  satMfeEquipamentoSchema,
} from "../zod/fiscal.schema";

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
    const config = await fiscalService.updateConfig(req.empresaId!, input, req.user?.id);
    let pdvCarga = { sent: 0, requested: false };

    if (req.query.enviarCarga === "true" || req.body?.enviarCargaPdv === true) {
      const carga = await pdvService.getCargaInicial(req.empresaId!);
      const sent = pdvWebSocketService.broadcastCatalog(carga, req.empresaId!);
      pdvCarga = { sent, requested: true };
    }

    res.json({ config, pdvCarga });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar configuracoes fiscais" });
  }
}

export async function getEmpresaFiscal(req: Request, res: Response) {
  try {
    const result = await fiscalService.getEmpresaFiscal(req.empresaId!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao buscar cadastro fiscal da empresa" });
  }
}

export async function updateEmpresaFiscal(req: Request, res: Response) {
  try {
    const input = empresaFiscalSchema.parse(req.body);
    const result = await fiscalService.updateEmpresaFiscal(req.empresaId!, input, req.user?.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar cadastro fiscal da empresa" });
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
    const result = await fiscalService.emitirNotaDaVenda(req.empresaId!, input, req.user?.id);
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
    const document = await fiscalService.cancelDocument(req.empresaId!, Number(req.params.id), input.justificativa, req.user?.id);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao cancelar documento fiscal" });
  }
}

export async function consultarStatus(req: Request, res: Response) {
  try {
    const result = await fiscalService.consultDocumentStatus(req.empresaId!, Number(req.params.id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao consultar status fiscal" });
  }
}

export async function reenviar(req: Request, res: Response) {
  try {
    const result = await fiscalService.reemitDocument(req.empresaId!, Number(req.params.id), req.user?.id);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao reenviar documento fiscal" });
  }
}

export async function cartaCorrecao(req: Request, res: Response) {
  try {
    const input = fiscalCartaCorrecaoSchema.parse(req.body);
    const result = await fiscalService.createCartaCorrecao(req.empresaId!, Number(req.params.id), input, req.user?.id);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao registrar carta de correcao" });
  }
}

export async function inutilizacao(req: Request, res: Response) {
  try {
    const input = fiscalInutilizacaoSchema.parse(req.body);
    const result = await fiscalService.createInutilizacao(req.empresaId!, input, req.user?.id);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao registrar inutilizacao" });
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

export async function monitoring(req: Request, res: Response) {
  try {
    const result = await fiscalService.getFiscalMonitoring(req.empresaId!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao monitorar pendencias fiscais" });
  }
}

export async function exceptionsReport(req: Request, res: Response) {
  try {
    const result = await fiscalService.getFiscalExceptionsReport(
      req.empresaId!,
      req.query.startDate ? String(req.query.startDate) : undefined,
      req.query.endDate ? String(req.query.endDate) : undefined,
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao gerar relatorio fiscal" });
  }
}

export async function processPolling(req: Request, res: Response) {
  try {
    const result = await fiscalService.pollPendingFiscalDocuments(req.empresaId!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao consultar pendencias fiscais" });
  }
}

export async function readiness(req: Request, res: Response) {
  try {
    const result = await fiscalService.getFiscalReadiness(req.empresaId!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao verificar prontidao fiscal" });
  }
}

export async function listEventos(req: Request, res: Response) {
  try {
    const documentoFiscalId = req.query.documentoFiscalId ? Number(req.query.documentoFiscalId) : undefined;
    const result = await fiscalService.listEventos(req.empresaId!, documentoFiscalId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao buscar eventos fiscais" });
  }
}

export async function listTransmissoes(req: Request, res: Response) {
  try {
    const documentoFiscalId = req.query.documentoFiscalId ? Number(req.query.documentoFiscalId) : undefined;
    const result = await fiscalService.listTransmissoes(req.empresaId!, documentoFiscalId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao buscar transmissoes fiscais" });
  }
}

export async function listAuditoria(req: Request, res: Response) {
  try {
    const result = await fiscalService.listAuditoria(req.empresaId!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao buscar auditoria fiscal" });
  }
}

export async function listCertificados(req: Request, res: Response) {
  try {
    const result = await fiscalService.listCertificados(req.empresaId!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao listar certificados" });
  }
}

export async function createCertificado(req: Request, res: Response) {
  try {
    const input = certificadoDigitalSchema.parse(req.body);
    const result = await fiscalService.createCertificado(req.empresaId!, input, req.user?.id);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao cadastrar certificado" });
  }
}

export async function testCertificado(req: Request, res: Response) {
  try {
    const result = await fiscalService.testCertificado(req.empresaId!, Number(req.params.id), req.user?.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao testar certificado" });
  }
}

export async function deleteCertificado(req: Request, res: Response) {
  try {
    const result = await fiscalService.deactivateCertificado(req.empresaId!, Number(req.params.id), req.user?.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao desativar certificado" });
  }
}

export async function listSatMfeEquipamentos(req: Request, res: Response) {
  try {
    const result = await fiscalService.listSatMfeEquipamentos(req.empresaId!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao listar SAT/MFE" });
  }
}

export async function createSatMfeEquipamento(req: Request, res: Response) {
  try {
    const input = satMfeEquipamentoSchema.parse(req.body);
    const result = await fiscalService.createSatMfeEquipamento(req.empresaId!, input, req.user?.id);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao cadastrar SAT/MFE" });
  }
}

export async function testSatMfeEquipamento(req: Request, res: Response) {
  try {
    const result = await fiscalService.testSatMfeEquipamento(req.empresaId!, Number(req.params.id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao testar SAT/MFE" });
  }
}

export async function createSatMfeCupom(req: Request, res: Response) {
  try {
    const input = satMfeCupomSchema.parse(req.body);
    const result = await fiscalService.createSatMfeCupom(req.empresaId!, input, req.user?.id);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao criar cupom SAT/MFE" });
  }
}
