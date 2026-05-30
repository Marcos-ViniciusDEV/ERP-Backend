import { Request, Response } from "express";
import * as pagamentosService from "../services/pagamentos.service";
import * as pdvService from "../services/pdv.service";
import * as pdvWebSocketService from "../services/pdv-websocket.service";
import {
  adquirenteSchema,
  aplicarTaxasApiSchema,
  credencialPagamentoSchema,
  formaPagamentoSchema,
  pagamentoConfigSchema,
  sincronizarTaxasApiSchema,
  taxaSchema,
  terminalPagamentoSchema,
  testarConexaoSchema,
} from "../zod/pagamentos.schema";

export async function getConfig(req: Request, res: Response) {
  try {
    const config = await pagamentosService.getPaymentConfigBundle(req.empresaId!);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao buscar configuracoes de pagamento" });
  }
}

export async function updateConfig(req: Request, res: Response) {
  try {
    const input = pagamentoConfigSchema.parse(req.body);
    const config = await pagamentosService.updateConfig(req.empresaId!, input);
    const pdvCarga = await maybeSendPdvLoad(req, config);
    res.json({ config, pdvCarga });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao salvar configuracoes de pagamento" });
  }
}

export async function listProviders(_req: Request, res: Response) {
  try {
    res.json(await pagamentosService.getProviders());
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao listar provedores" });
  }
}

export async function listForms(req: Request, res: Response) {
  try {
    res.json(await pagamentosService.listForms(req.empresaId!));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao listar formas de pagamento" });
  }
}

export async function createForm(req: Request, res: Response) {
  try {
    const input = formaPagamentoSchema.parse(req.body);
    res.status(201).json(await pagamentosService.createForm(req.empresaId!, input));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao criar forma de pagamento" });
  }
}

export async function updateForm(req: Request, res: Response) {
  try {
    const input = formaPagamentoSchema.partial().parse(req.body);
    res.json(await pagamentosService.updateForm(req.empresaId!, Number(req.params.id), input));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar forma de pagamento" });
  }
}

export async function listAcquirers(req: Request, res: Response) {
  try {
    res.json(await pagamentosService.listAcquirers(req.empresaId!));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao listar adquirentes" });
  }
}

export async function createAcquirer(req: Request, res: Response) {
  try {
    const input = adquirenteSchema.parse(req.body);
    res.status(201).json(await pagamentosService.createAcquirer(req.empresaId!, input));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao criar adquirente" });
  }
}

export async function updateAcquirer(req: Request, res: Response) {
  try {
    const input = adquirenteSchema.partial().parse(req.body);
    res.json(await pagamentosService.updateAcquirer(req.empresaId!, Number(req.params.id), input));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar adquirente" });
  }
}

export async function listCredentials(req: Request, res: Response) {
  try {
    res.json(await pagamentosService.listCredentials(req.empresaId!));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao listar credenciais de pagamento" });
  }
}

export async function upsertCredential(req: Request, res: Response) {
  try {
    const input = credencialPagamentoSchema.parse(req.body);
    res.json(await pagamentosService.upsertCredential(req.empresaId!, input));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao salvar credenciais de pagamento" });
  }
}

export async function testConnection(req: Request, res: Response) {
  try {
    const input = testarConexaoSchema.parse(req.body);
    res.json(await pagamentosService.testConnection(req.empresaId!, input));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao testar conexao da maquininha" });
  }
}

export async function listRates(req: Request, res: Response) {
  try {
    res.json(await pagamentosService.listRates(req.empresaId!));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao listar taxas" });
  }
}

export async function createRate(req: Request, res: Response) {
  try {
    const input = taxaSchema.parse(req.body);
    res.status(201).json(await pagamentosService.createRate(req.empresaId!, req.user?.id, input));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao criar taxa" });
  }
}

export async function updateRate(req: Request, res: Response) {
  try {
    const input = taxaSchema.partial().parse(req.body);
    res.json(await pagamentosService.updateRate(req.empresaId!, req.user?.id, Number(req.params.id), input));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar taxa" });
  }
}

export async function listRateHistory(req: Request, res: Response) {
  try {
    res.json(await pagamentosService.listRateHistory(req.empresaId!));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao listar historico de taxas" });
  }
}

export async function syncRatesFromApi(req: Request, res: Response) {
  try {
    const input = sincronizarTaxasApiSchema.parse(req.body);
    res.json(await pagamentosService.previewProviderRates(req.empresaId!, input.adquirenteEmpresaId));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao buscar taxas na API" });
  }
}

export async function applyRatesFromApi(req: Request, res: Response) {
  try {
    const input = aplicarTaxasApiSchema.parse(req.body);
    res.json(await pagamentosService.applyProviderRates(req.empresaId!, req.user?.id, input.taxas));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao aplicar taxas da API" });
  }
}

export async function listTerminals(req: Request, res: Response) {
  try {
    res.json(await pagamentosService.listTerminals(req.empresaId!));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao listar terminais" });
  }
}

export async function createTerminal(req: Request, res: Response) {
  try {
    const input = terminalPagamentoSchema.parse(req.body);
    res.status(201).json(await pagamentosService.createTerminal(req.empresaId!, input));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao criar terminal" });
  }
}

export async function updateTerminal(req: Request, res: Response) {
  try {
    const input = terminalPagamentoSchema.partial().parse(req.body);
    res.json(await pagamentosService.updateTerminal(req.empresaId!, Number(req.params.id), input));
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar terminal" });
  }
}

export async function sendPdvLoad(req: Request, res: Response) {
  try {
    const carga = await pdvService.getCargaInicial(req.empresaId!);
    const sent = pdvWebSocketService.broadcastCatalog(carga, req.empresaId!);
    res.json({ requested: true, sent });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao enviar carga para PDVs" });
  }
}

async function maybeSendPdvLoad(req: Request, config: any) {
  if (req.query.enviarCarga === "true" || req.body?.enviarCargaPdv === true || config?.enviarCargaAutomaticaPdv) {
    const carga = await pdvService.getCargaInicial(req.empresaId!);
    const sent = pdvWebSocketService.broadcastCatalog(carga, req.empresaId!);
    return { requested: true, sent };
  }

  return { requested: false, sent: 0 };
}
