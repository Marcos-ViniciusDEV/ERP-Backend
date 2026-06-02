import { and, desc, eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import {
  certificadosDigitais,
  clientes,
  configuracoesFiscais,
  documentosFiscais,
  empresas,
  fiscalEventos,
  fiscalAuditoria,
  fiscalTransmissoes,
  itensVenda,
  produtos,
  satMfeCupons,
  satMfeEquipamentos,
  vendas,
} from "../../drizzle/schema";
import { getDb } from "../libs/db";
import { ENV } from "../libs/env";
import { inspectCertificateA1 } from "../libs/certificate-a1";
import { decryptSecret, encryptSecret } from "../libs/secret-crypto";
import {
  cancelFiscalDocumentWithProvider,
  consultFiscalDocumentWithProvider,
  downloadFiscalProviderFile,
  emitFiscalDocumentWithProvider,
  hasFiscalProviderForCompany,
  listGlobalFiscalProviderCredentials,
  type FiscalProviderResult,
} from "./fiscal-provider.service";
import type {
  CertificadoDigitalInput,
  FiscalCartaCorrecaoInput,
  EmpresaFiscalInput,
  FiscalConfigInput,
  FiscalInutilizacaoInput,
  FiscalPreflightInput,
  FiscalPrepareInput,
  SatMfeCupomInput,
  SatMfeEquipamentoInput,
} from "../zod/fiscal.schema";
import { validateProdutoFiscal, type RegimeTributario } from "./produto-fiscal.service";

type FiscalIssueSeverity = "error" | "warning";

type FiscalIssue = {
  severity: FiscalIssueSeverity;
  code: string;
  message: string;
  path?: string;
};

type FiscalModelo = "NFE" | "NFCE" | "SAT" | "MFE";

export async function getConfig(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [config] = await db
    .select()
    .from(configuracoesFiscais)
    .where(eq(configuracoesFiscais.empresaId, empresaId))
    .limit(1);

  if (config) return config;

  await db.insert(configuracoesFiscais).values({ empresaId });
  const [created] = await db
    .select()
    .from(configuracoesFiscais)
    .where(eq(configuracoesFiscais.empresaId, empresaId))
    .limit(1);

  return created;
}

export async function updateConfig(empresaId: number, input: FiscalConfigInput, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const current = await getConfig(empresaId);
  const criticalChanges = [
    current.ambiente !== input.ambiente && input.ambiente === "PRODUCAO" ? "ATIVAR_PRODUCAO" : null,
    current.serieNfce !== input.serieNfce ? "ALTERAR_SERIE_NFCE" : null,
    current.proximoNumeroNfce !== input.proximoNumeroNfce ? "ALTERAR_NUMERACAO_NFCE" : null,
    current.serieNfe !== input.serieNfe ? "ALTERAR_SERIE_NFE" : null,
    current.proximoNumeroNfe !== input.proximoNumeroNfe ? "ALTERAR_NUMERACAO_NFE" : null,
  ].filter(Boolean);
  if (criticalChanges.length > 0 && !input.confirmarAlteracaoCritica) {
    throw new Error(`Confirme a alteracao fiscal critica: ${criticalChanges.join(", ")}`);
  }

  const { certificadoDigitalSenha, confirmarAlteracaoCritica: _confirmarAlteracaoCritica, ...configInput } = input;
  const payload = {
    ...configInput,
    ...(certificadoDigitalSenha ? { certificadoDigitalSenha: encryptSecret(certificadoDigitalSenha) } : {}),
    certificadoValidade: input.certificadoValidade ? new Date(input.certificadoValidade) : null,
  };

  await db
    .update(configuracoesFiscais)
    .set(payload)
    .where(and(eq(configuracoesFiscais.id, current.id), eq(configuracoesFiscais.empresaId, empresaId)));

  await recordFiscalAudit(empresaId, usuarioId, "ATUALIZAR_CONFIGURACAO", "CONFIGURACAO_FISCAL", String(current.id), {
    ambienteAnterior: current.ambiente,
    ambienteNovo: input.ambiente,
    serieNfceAnterior: current.serieNfce,
    serieNfceNova: input.serieNfce,
    proximoNumeroNfceAnterior: current.proximoNumeroNfce,
    proximoNumeroNfceNovo: input.proximoNumeroNfce,
    serieNfeAnterior: current.serieNfe,
    serieNfeNova: input.serieNfe,
    proximoNumeroNfeAnterior: current.proximoNumeroNfe,
    proximoNumeroNfeNovo: input.proximoNumeroNfe,
    alteracoesCriticas: criticalChanges,
  });
  return getConfig(empresaId);
}

export async function getEmpresaFiscal(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [empresa] = await db.select().from(empresas).where(eq(empresas.id, empresaId)).limit(1);
  if (!empresa) throw new Error("Empresa nao encontrada");
  return empresa;
}

export async function updateEmpresaFiscal(empresaId: number, input: EmpresaFiscalInput, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(empresas)
    .set({
      razaoSocial: input.razaoSocial,
      nomeFantasia: input.nomeFantasia || null,
      cnpj: input.cnpj,
      inscricaoEstadual: input.inscricaoEstadual || null,
      inscricaoMunicipal: input.inscricaoMunicipal || null,
      crt: input.crt,
      cnae: input.cnae || null,
      telefone: input.telefone || null,
      emailFiscal: input.emailFiscal || null,
      logradouro: input.logradouro || null,
      numero: input.numero || null,
      complemento: input.complemento || null,
      bairro: input.bairro || null,
      municipio: input.municipio || null,
      codigoMunicipio: input.codigoMunicipio || null,
      uf: input.uf || null,
      cep: input.cep || null,
    })
    .where(eq(empresas.id, empresaId));
  await recordFiscalAudit(empresaId, usuarioId, "ATUALIZAR_EMITENTE", "EMPRESA", String(empresaId), {
    cnpj: input.cnpj,
    razaoSocial: input.razaoSocial,
    uf: input.uf || null,
  });
  return getEmpresaFiscal(empresaId);
}

export async function listDocuments(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select({
      id: documentosFiscais.id,
      vendaId: documentosFiscais.vendaId,
      modelo: documentosFiscais.modelo,
      ambiente: documentosFiscais.ambiente,
      status: documentosFiscais.status,
      numero: documentosFiscais.numero,
      serie: documentosFiscais.serie,
      chaveAcesso: documentosFiscais.chaveAcesso,
      protocolo: documentosFiscais.protocolo,
      motivoStatus: documentosFiscais.motivoStatus,
      emitidaEm: documentosFiscais.emitidaEm,
      canceladaEm: documentosFiscais.canceladaEm,
      createdAt: documentosFiscais.createdAt,
      numeroVenda: vendas.numeroVenda,
      valorLiquido: vendas.valorLiquido,
    })
    .from(documentosFiscais)
    .leftJoin(vendas, eq(documentosFiscais.vendaId, vendas.id))
    .where(eq(documentosFiscais.empresaId, empresaId))
    .orderBy(desc(documentosFiscais.createdAt));
}

type FiscalMonitoringDocument = {
  id: number;
  modelo: string;
  status: string;
  numero: number | null;
  serie: number | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  emitidaEm?: Date | string | null;
  motivoStatus?: string | null;
};

export function classifyFiscalMonitoringDocument(document: FiscalMonitoringDocument, now = new Date()) {
  const referenceDate = new Date(document.emitidaEm || document.updatedAt || document.createdAt);
  const ageMinutes = Math.max(0, Math.floor((now.getTime() - referenceDate.getTime()) / 60000));
  const pendingStatuses = ["RASCUNHO", "PENDENTE", "PRONTO_PARA_ENVIO", "PRONTA_PARA_EMISSAO", "ASSINADO", "ENVIADO"];
  const rejectedStatuses = ["VALIDACAO_FALHOU", "REJEITADA", "REJEITADO", "DENEGADO"];
  const legalLimitMinutes = ENV.fiscalContingencyLegalHours * 60;

  if (document.status === "CONTINGENCIA") {
    const remainingMinutes = Math.max(0, legalLimitMinutes - ageMinutes);
    return {
      severity: remainingMinutes === 0 ? "critical" : remainingMinutes <= ENV.fiscalPendingCriticalMinutes ? "warning" : "info",
      code: remainingMinutes === 0 ? "CONTINGENCIA_PRAZO_EXCEDIDO" : "CONTINGENCIA_PENDENTE",
      message: remainingMinutes === 0
        ? "Documento em contingencia ultrapassou a janela operacional configurada. Transmita imediatamente e confirme a regra aplicavel na UF."
        : `Documento em contingencia aguardando transmissao. Restam aproximadamente ${remainingMinutes} minuto(s) da janela operacional configurada.`,
      ageMinutes,
      remainingMinutes,
    };
  }

  if (rejectedStatuses.includes(document.status)) {
    return {
      severity: "critical",
      code: "DOCUMENTO_REJEITADO",
      message: document.motivoStatus || "Documento fiscal rejeitado ou com validacao falha. Corrija os dados e reenvie.",
      ageMinutes,
      remainingMinutes: null,
    };
  }

  if (pendingStatuses.includes(document.status) && ageMinutes >= ENV.fiscalPendingWarningMinutes) {
    return {
      severity: ageMinutes >= ENV.fiscalPendingCriticalMinutes ? "critical" : "warning",
      code: "TRANSMISSAO_PENDENTE",
      message: `Documento aguardando autorizacao ou reenvio ha ${ageMinutes} minuto(s).`,
      ageMinutes,
      remainingMinutes: null,
    };
  }

  return null;
}

export async function getFiscalMonitoring(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const documents = await db
    .select({
      id: documentosFiscais.id,
      modelo: documentosFiscais.modelo,
      status: documentosFiscais.status,
      numero: documentosFiscais.numero,
      serie: documentosFiscais.serie,
      motivoStatus: documentosFiscais.motivoStatus,
      emitidaEm: documentosFiscais.emitidaEm,
      createdAt: documentosFiscais.createdAt,
      updatedAt: documentosFiscais.updatedAt,
    })
    .from(documentosFiscais)
    .where(eq(documentosFiscais.empresaId, empresaId))
    .orderBy(desc(documentosFiscais.updatedAt));

  const alerts = documents.flatMap((document) => {
    const alert = classifyFiscalMonitoringDocument(document);
    return alert ? [{ ...document, ...alert }] : [];
  });

  return {
    generatedAt: new Date().toISOString(),
    limits: {
      pendingWarningMinutes: ENV.fiscalPendingWarningMinutes,
      pendingCriticalMinutes: ENV.fiscalPendingCriticalMinutes,
      contingencyLegalHours: ENV.fiscalContingencyLegalHours,
    },
    summary: {
      totalAlerts: alerts.length,
      critical: alerts.filter((alert) => alert.severity === "critical").length,
      warning: alerts.filter((alert) => alert.severity === "warning").length,
      contingency: alerts.filter((alert) => alert.status === "CONTINGENCIA").length,
    },
    alerts,
  };
}

export async function preflightSale(empresaId: number, input: FiscalPreflightInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const config = await getConfig(empresaId);
  const issues: FiscalIssue[] = [];

  const [sale] = await db
    .select()
    .from(vendas)
    .where(and(eq(vendas.id, input.vendaId), eq(vendas.empresaId, empresaId)))
    .limit(1);

  if (!sale) {
    return {
      ok: false,
      issues: [{ severity: "error", code: "VENDA_NAO_ENCONTRADA", message: "Venda nao encontrada para esta empresa." }],
    };
  }

  if (sale.status !== "CONCLUIDA") {
    issues.push({ severity: "error", code: "VENDA_NAO_CONCLUIDA", message: "Somente vendas concluidas podem gerar documento fiscal." });
  }

  if (input.modelo === "SAT" || input.modelo === "MFE") {
    issues.push({
      severity: "error",
      code: "MODELO_REQUER_AGENT_LOCAL",
      message: "SAT/MFE precisa ser emitido pelo PDV/agent local conectado ao equipamento fiscal.",
    });
  }

  if (input.modelo === "NFCE" && !config.habilitarNfce) {
    issues.push({ severity: "error", code: "NFCE_DESABILITADA", message: "A emissao automatica de NFC-e esta desabilitada nas configuracoes fiscais." });
  }

  if (!config.certificadoDigitalCaminho) {
    issues.push({ severity: "warning", code: "CERTIFICADO_AUSENTE", message: "Certificado A1 ainda nao cadastrado. A transmissao para SEFAZ ficara bloqueada." });
  }
  const [certificadoAtivo] = await db
    .select({ validade: certificadosDigitais.validade })
    .from(certificadosDigitais)
    .where(and(eq(certificadosDigitais.empresaId, empresaId), eq(certificadosDigitais.ativo, true)))
    .limit(1);
  const certificadoValidade = certificadoAtivo?.validade || config.certificadoValidade;
  if (certificadoValidade && new Date(certificadoValidade).getTime() < Date.now()) {
    issues.push({ severity: "error", code: "CERTIFICADO_VENCIDO", message: "Certificado A1 vencido. Atualize o certificado antes de emitir." });
  }

  if (input.modelo === "NFCE" && (!config.idTokenIsc || !config.csc)) {
    issues.push({ severity: "warning", code: "CSC_AUSENTE", message: "CSC/idToken nao configurados. O QR Code da NFC-e nao podera ser gerado." });
  }

  if (input.modelo === "NFE") {
    if (!sale.clienteId) {
      issues.push({
        severity: "error",
        code: "CLIENTE_NAO_VINCULADO",
        message: "NF-e modelo 55 exige cliente/destinatario vinculado a venda.",
      });
    } else {
      const [cliente] = await db
        .select()
        .from(clientes)
        .where(and(eq(clientes.id, sale.clienteId), eq(clientes.empresaId, empresaId)))
        .limit(1);
      const missing = [
        !cliente?.cpfCnpj && "CPF/CNPJ",
        !cliente?.logradouro && "logradouro",
        !cliente?.numero && "numero",
        !cliente?.bairro && "bairro",
        !cliente?.municipio && "municipio",
        !cliente?.codigoMunicipio && "codigo IBGE",
        !cliente?.uf && "UF",
        !cliente?.cep && "CEP",
      ].filter(Boolean);
      if (missing.length > 0) {
        issues.push({
          severity: "error",
          code: "DESTINATARIO_INCOMPLETO",
          message: `Cliente destinatario incompleto para NF-e: ${missing.join(", ")}.`,
        });
      }
    }
  }

  const saleItems = await db
    .select({
      itemId: itensVenda.id,
      produtoId: produtos.id,
      codigo: produtos.codigo,
      descricao: produtos.descricao,
      unidade: produtos.unidade,
      ncm: produtos.ncm,
      cest: produtos.cest,
      cfopPadraoVenda: produtos.cfopPadraoVenda,
      origem: produtos.origem,
      cstIcms: produtos.cstIcms,
      csosnIcms: produtos.csosnIcms,
      pisCst: produtos.pisCst,
      cofinsCst: produtos.cofinsCst,
    })
    .from(itensVenda)
    .innerJoin(produtos, eq(itensVenda.produtoId, produtos.id))
    .where(eq(itensVenda.vendaId, sale.id));

  if (saleItems.length === 0) {
    issues.push({ severity: "error", code: "VENDA_SEM_ITENS", message: "Venda nao possui itens." });
  }

  for (const item of saleItems) {
    for (const productIssue of validateProdutoFiscal(item, config.regimeTributario as RegimeTributario)) {
      issues.push({
        severity: "error",
        code: productIssue.code,
        message: productIssue.message,
        path: `produto.${item.produtoId}.${productIssue.field}`,
      });
    }
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    venda: sale,
    itemCount: saleItems.length,
    config: {
      ambiente: config.ambiente,
      regimeTributario: config.regimeTributario,
      habilitarNfce: config.habilitarNfce,
    },
    issues,
  };
}

export async function prepareFiscalDocument(empresaId: number, input: FiscalPrepareInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const config = await getConfig(empresaId);
  const preflight = await preflightSale(empresaId, input);
  const hasErrors = !preflight.ok;
  const numero = input.modelo === "NFCE" ? config.proximoNumeroNfce : config.proximoNumeroNfe;
  const serie = input.modelo === "NFCE" ? config.serieNfce : config.serieNfe;
  const status = hasErrors ? "VALIDACAO_FALHOU" : input.emitirEmContingencia ? "CONTINGENCIA" : "PRONTA_PARA_EMISSAO";

  const [insertResult] = await db.insert(documentosFiscais).values({
    empresaId,
    vendaId: input.vendaId,
    modelo: input.modelo,
    ambiente: config.ambiente,
    status,
    numero,
    serie,
    motivoStatus: preflight.issues.map((issue) => `[${issue.severity}] ${issue.message}`).join("\n") || "Pre-validacao fiscal concluida.",
    xml: hasErrors ? null : buildDraftXml(input.modelo, numero, serie, input.vendaId),
    emitidaEm: null,
  });

  if (!hasErrors && (input.modelo === "NFE" || input.modelo === "NFCE")) {
    await incrementFiscalNumber(empresaId, input.modelo);
  }

  const documentId = Number(insertResult.insertId);
  const [document] = await db.select().from(documentosFiscais).where(eq(documentosFiscais.id, documentId)).limit(1);

  return {
    document,
    preflight,
    transmissionReady: !hasErrors && Boolean(config.certificadoDigitalCaminho),
  };
}

export async function emitirNotaDaVenda(empresaId: number, input: FiscalPrepareInput, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const config = await getConfig(empresaId);
  const preflight = await preflightSale(empresaId, input);
  if (!preflight.ok) {
    const failed = await createFiscalDocument(empresaId, input, config, "VALIDACAO_FALHOU", preflight);
    await recordFiscalAudit(empresaId, usuarioId, "EMITIR_DOCUMENTO_BLOQUEADO", "DOCUMENTO_FISCAL", String(failed.id), {
      vendaId: input.vendaId,
      modelo: input.modelo,
    });
    return {
      document: failed,
      preflight,
      authorized: false,
      message: "Nota nao criada para emissao porque existem bloqueios fiscais.",
    };
  }

  const [existing] = await db
    .select()
    .from(documentosFiscais)
    .where(and(
      eq(documentosFiscais.empresaId, empresaId),
      eq(documentosFiscais.vendaId, input.vendaId),
      eq(documentosFiscais.modelo, input.modelo),
      sql`${documentosFiscais.status} in ('PRONTA_PARA_EMISSAO','AUTORIZADA','CONTINGENCIA')`
    ))
    .limit(1);

  if (existing) {
    return {
      document: existing,
      preflight,
      authorized: existing.status === "AUTORIZADA",
      message: "Esta venda ja possui nota fiscal criada para este modelo.",
    };
  }

  const status = input.emitirEmContingencia ? "CONTINGENCIA" : "PRONTO_PARA_ENVIO";

  if (!input.emitirEmContingencia && (input.modelo === "NFE" || input.modelo === "NFCE") && await hasFiscalProviderForCompany(empresaId, config.ambiente)) {
    const numero = input.modelo === "NFCE" ? config.proximoNumeroNfce : config.proximoNumeroNfe;
    const serie = input.modelo === "NFCE" ? config.serieNfce : config.serieNfe;
    const providerResult = await emitFiscalDocumentWithProvider(empresaId, input, config, numero, serie);

    if (providerResult) {
      const document = await createFiscalDocumentFromProvider(empresaId, input, config, providerResult, preflight, numero, serie);

      if (input.modelo === "NFCE" && document.chaveAcesso) {
        await db
          .update(vendas)
          .set({ nfceNumero: String(document.numero || ""), nfceChave: document.chaveAcesso })
          .where(and(eq(vendas.id, input.vendaId), eq(vendas.empresaId, empresaId)));
      }

      await recordFiscalAudit(empresaId, usuarioId, "EMITIR_DOCUMENTO", "DOCUMENTO_FISCAL", String(document.id), {
        vendaId: input.vendaId,
        modelo: input.modelo,
        provider: providerResult.provider,
        status: providerResult.status,
      });
      return {
        document,
        preflight,
        authorized: providerResult.status === "AUTORIZADA",
        provider: providerResult.provider,
        message: providerResult.status === "AUTORIZADA"
          ? "Nota fiscal autorizada pelo provedor fiscal."
          : providerResult.motivoStatusSefaz || "Nota enviada ao provedor fiscal e aguardando processamento/autorizacao.",
      };
    }
  }

  const document = await createFiscalDocument(empresaId, input, config, status, preflight);

  if (input.modelo === "NFCE" && document.chaveAcesso) {
    await db
      .update(vendas)
      .set({ nfceNumero: String(document.numero || ""), nfceChave: document.chaveAcesso })
      .where(and(eq(vendas.id, input.vendaId), eq(vendas.empresaId, empresaId)));
  }

  await recordFiscalAudit(empresaId, usuarioId, "PREPARAR_DOCUMENTO", "DOCUMENTO_FISCAL", String(document.id), {
    vendaId: input.vendaId,
    modelo: input.modelo,
    status,
  });
  return {
    document,
    preflight,
    authorized: false,
    message: status === "CONTINGENCIA"
        ? "Nota fiscal criada em contingencia para posterior transmissao."
        : "Nota fiscal criada e pronta para envio. A autorizacao real depende do motor fiscal/SEFAZ configurado.",
  };
}

async function createFiscalDocument(empresaId: number, input: FiscalPrepareInput, config: any, status: string, preflight: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const numero = input.modelo === "NFCE" ? config.proximoNumeroNfce : config.proximoNumeroNfe;
  const serie = input.modelo === "NFCE" ? config.serieNfce : config.serieNfe;
  const chaveAcesso = status === "VALIDACAO_FALHOU" ? null : await buildAccessKey(empresaId, input.modelo, numero, serie);
  const protocolo = null;
  const xml = status === "VALIDACAO_FALHOU"
    ? null
    : await buildFiscalXml(empresaId, input.modelo, numero, serie, input.vendaId, chaveAcesso, protocolo);

  const [insertResult] = await db.insert(documentosFiscais).values({
    empresaId,
    vendaId: input.vendaId,
    modelo: input.modelo,
    ambiente: config.ambiente,
    status: status as any,
    numero,
    serie,
    chaveAcesso,
    protocolo,
    motivoStatus: preflight.issues.map((issue: FiscalIssue) => `[${issue.severity}] ${issue.message}`).join("\n")
      || "Documento fiscal criado e aguardando transmissao fiscal real.",
    xml,
    xmlGerado: xml,
    danfeUrl: chaveAcesso ? `/api/fiscal/documentos/${chaveAcesso}/danfe` : null,
    emitidaEm: status === "CONTINGENCIA" ? new Date() : null,
  });

  if (status !== "VALIDACAO_FALHOU" && (input.modelo === "NFE" || input.modelo === "NFCE")) {
    await incrementFiscalNumber(empresaId, input.modelo);
  }

  const documentId = Number(insertResult.insertId);
  const [document] = await db.select().from(documentosFiscais).where(eq(documentosFiscais.id, documentId)).limit(1);
  return document;
}

async function createFiscalDocumentFromProvider(
  empresaId: number,
  input: FiscalPrepareInput,
  config: any,
  providerResult: FiscalProviderResult,
  preflight: any,
  numero: number,
  serie: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const providerMessage = providerResult.motivoStatusSefaz || "Retorno recebido do provedor fiscal.";
  const [insertResult] = await db.insert(documentosFiscais).values({
    empresaId,
    vendaId: input.vendaId,
    modelo: input.modelo,
    ambiente: config.ambiente,
    status: providerResult.status as any,
    numero,
    serie,
    chaveAcesso: providerResult.chaveAcesso,
    protocolo: providerResult.protocolo,
    protocoloAutorizacao: providerResult.status === "AUTORIZADA" ? providerResult.protocolo : null,
    codigoStatusSefaz: providerResult.codigoStatusSefaz,
    motivoStatusSefaz: providerResult.motivoStatusSefaz,
    motivoStatus: preflight.issues.map((issue: FiscalIssue) => `[${issue.severity}] ${issue.message}`).join("\n")
      || providerMessage,
    xml: providerResult.xmlUrl,
    xmlGerado: JSON.stringify(providerResult.requestPayload),
    xmlAutorizado: providerResult.status === "AUTORIZADA" ? providerResult.xmlUrl : null,
    danfeUrl: providerResult.danfeUrl,
    qrcodeUrl: providerResult.qrcodeUrl,
    emitidaEm: new Date(),
    autorizadaEm: providerResult.authorizedAt,
  });

  const documentId = Number(insertResult.insertId);

  await db.insert(fiscalTransmissoes).values({
    empresaId,
    documentoFiscalId: documentId,
    tipoOperacao: "EMISSAO",
    ambiente: config.ambiente,
    endpoint: providerResult.endpoint,
    requestXml: JSON.stringify(providerResult.requestPayload),
    responseXml: JSON.stringify(providerResult.responsePayload),
    httpStatus: providerResult.httpStatus,
    codigoStatusSefaz: providerResult.codigoStatusSefaz,
    motivo: providerMessage,
    duracaoMs: providerResult.durationMs,
  });

  if (input.modelo === "NFE" || input.modelo === "NFCE") {
    await incrementFiscalNumber(empresaId, input.modelo);
  }

  const [document] = await db.select().from(documentosFiscais).where(eq(documentosFiscais.id, documentId)).limit(1);
  return document;
}

export async function cancelDocument(empresaId: number, documentId: number, justificativa: string, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [document] = await db
    .select()
    .from(documentosFiscais)
    .where(and(eq(documentosFiscais.id, documentId), eq(documentosFiscais.empresaId, empresaId)))
    .limit(1);

  if (!document) throw new Error("Documento fiscal nao encontrado");
  if (document.status !== "AUTORIZADA" && document.status !== "PRONTA_PARA_EMISSAO" && document.status !== "CONTINGENCIA") {
    throw new Error("Documento fiscal nao esta em um status cancelavel nesta etapa");
  }

  const providerResult = document.status === "AUTORIZADA"
    ? await cancelFiscalDocumentWithProvider(empresaId, document, justificativa)
    : null;
  const eventoStatus = providerResult
    ? providerResult.status === "CANCELADA" || providerResult.codigoStatusSefaz === "135" ? "AUTORIZADO" : "REJEITADO"
    : "PENDENTE";

  await db.insert(fiscalEventos).values({
    empresaId,
    documentoFiscalId: documentId,
    tipo: "CANCELAMENTO",
    status: eventoStatus as any,
    justificativa,
    codigoStatusSefaz: providerResult?.codigoStatusSefaz || null,
    motivoStatusSefaz: providerResult?.motivoStatusSefaz || null,
    protocolo: providerResult?.protocolo || null,
    xmlRetorno: providerResult ? JSON.stringify(providerResult.responsePayload) : null,
    usuarioId,
  });

  if (providerResult) {
    await db.insert(fiscalTransmissoes).values({
      empresaId,
      documentoFiscalId: documentId,
      tipoOperacao: "CANCELAMENTO",
      ambiente: document.ambiente,
      endpoint: providerResult.endpoint,
      requestXml: JSON.stringify(providerResult.requestPayload),
      responseXml: JSON.stringify(providerResult.responsePayload),
      httpStatus: providerResult.httpStatus,
      codigoStatusSefaz: providerResult.codigoStatusSefaz,
      motivo: providerResult.motivoStatusSefaz,
      duracaoMs: providerResult.durationMs,
    });

    if (eventoStatus !== "AUTORIZADO") {
      throw new Error(providerResult.motivoStatusSefaz || "Cancelamento rejeitado pelo provedor fiscal.");
    }
  }

  await db
    .update(documentosFiscais)
    .set({
      status: "CANCELADA",
      justificativaCancelamento: justificativa,
      protocoloCancelamento: providerResult?.protocolo || null,
      codigoStatusSefaz: providerResult?.codigoStatusSefaz || document.codigoStatusSefaz,
      motivoStatusSefaz: providerResult?.motivoStatusSefaz || document.motivoStatusSefaz,
      xmlCancelamento: providerResult?.xmlUrl || null,
      canceladaEm: new Date(),
      motivoStatus: providerResult ? "Cancelamento autorizado pelo provedor fiscal." : "Cancelamento registrado no ERP e pendente de transmissao oficial pelo motor fiscal.",
    })
    .where(and(eq(documentosFiscais.id, documentId), eq(documentosFiscais.empresaId, empresaId)));

  await recordFiscalAudit(empresaId, usuarioId, "CANCELAR_DOCUMENTO", "DOCUMENTO_FISCAL", String(documentId), {
    justificativa,
    status: eventoStatus,
    protocolo: providerResult?.protocolo || null,
  });
  const [updated] = await db.select().from(documentosFiscais).where(eq(documentosFiscais.id, documentId)).limit(1);
  return updated;
}

export async function consultDocumentStatus(empresaId: number, documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [document] = await db
    .select()
    .from(documentosFiscais)
    .where(and(eq(documentosFiscais.id, documentId), eq(documentosFiscais.empresaId, empresaId)))
    .limit(1);

  if (!document) throw new Error("Documento fiscal nao encontrado");
  if (document.modelo !== "NFE" && document.modelo !== "NFCE") {
    throw new Error("Consulta oficial pelo provedor esta disponivel apenas para NF-e e NFC-e");
  }
  if (!document.vendaId || !document.serie || !document.numero) {
    throw new Error("Documento fiscal sem referencia completa para consulta no provedor");
  }

  const providerResult = await consultFiscalDocumentWithProvider(empresaId, document);
  if (!providerResult) throw new Error("Credencial de provedor fiscal nao configurada para este ambiente");

  const providerMessage = providerResult.motivoStatusSefaz || "Status consultado no provedor fiscal.";

  await db.insert(fiscalTransmissoes).values({
    empresaId,
    documentoFiscalId: documentId,
    tipoOperacao: "CONSULTA_STATUS",
    ambiente: document.ambiente,
    endpoint: providerResult.endpoint,
    requestXml: JSON.stringify(providerResult.requestPayload),
    responseXml: JSON.stringify(providerResult.responsePayload),
    httpStatus: providerResult.httpStatus,
    codigoStatusSefaz: providerResult.codigoStatusSefaz,
    motivo: providerMessage,
    duracaoMs: providerResult.durationMs,
  });

  await db.insert(fiscalEventos).values({
    empresaId,
    documentoFiscalId: documentId,
    tipo: "CONSULTA_STATUS",
    status: providerResult.httpStatus >= 400 ? "REJEITADO" : "AUTORIZADO",
    codigoStatusSefaz: providerResult.codigoStatusSefaz,
    motivoStatusSefaz: providerResult.motivoStatusSefaz,
    protocolo: providerResult.protocolo,
    xmlRetorno: JSON.stringify(providerResult.responsePayload),
  });

  await db
    .update(documentosFiscais)
    .set({
      status: providerResult.status as any,
      chaveAcesso: providerResult.chaveAcesso || document.chaveAcesso,
      protocolo: providerResult.protocolo || document.protocolo,
      protocoloAutorizacao: providerResult.status === "AUTORIZADA" ? providerResult.protocolo : document.protocoloAutorizacao,
      codigoStatusSefaz: providerResult.codigoStatusSefaz,
      motivoStatusSefaz: providerResult.motivoStatusSefaz,
      motivoStatus: providerMessage,
      xml: providerResult.xmlUrl || document.xml,
      xmlAutorizado: providerResult.status === "AUTORIZADA" ? providerResult.xmlUrl : document.xmlAutorizado,
      danfeUrl: providerResult.danfeUrl || document.danfeUrl,
      qrcodeUrl: providerResult.qrcodeUrl || document.qrcodeUrl,
      autorizadaEm: providerResult.status === "AUTORIZADA" ? (document.autorizadaEm || new Date()) : document.autorizadaEm,
      canceladaEm: providerResult.status === "CANCELADA" ? (document.canceladaEm || new Date()) : document.canceladaEm,
    })
    .where(and(eq(documentosFiscais.id, documentId), eq(documentosFiscais.empresaId, empresaId)));

  const [updated] = await db.select().from(documentosFiscais).where(eq(documentosFiscais.id, documentId)).limit(1);
  return {
    document: updated,
    provider: providerResult.provider,
    message: providerMessage,
  };
}

type FiscalPollingDocument = {
  id: number;
  empresaId: number;
  modelo: string;
  status: string;
};

export async function processFiscalPollingBatch(
  documents: FiscalPollingDocument[],
  consult: (empresaId: number, documentId: number) => Promise<unknown> = consultDocumentStatus,
) {
  const results = [];
  for (const document of documents) {
    try {
      await consult(document.empresaId, document.id);
      results.push({ id: document.id, empresaId: document.empresaId, success: true });
    } catch (error: any) {
      results.push({
        id: document.id,
        empresaId: document.empresaId,
        success: false,
        error: error.message || "Falha ao consultar documento fiscal",
      });
    }
  }
  return results;
}

export async function pollPendingFiscalDocuments(empresaId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [
    sql`${documentosFiscais.status} in ('PENDENTE','PRONTO_PARA_ENVIO','ENVIADO','CONTINGENCIA')`,
    sql`${documentosFiscais.modelo} in ('NFE','NFCE')`,
    sql`${documentosFiscais.vendaId} is not null`,
    sql`${documentosFiscais.serie} is not null`,
    sql`${documentosFiscais.numero} is not null`,
  ];
  if (empresaId) conditions.push(eq(documentosFiscais.empresaId, empresaId));

  const documents = await db
    .select({
      id: documentosFiscais.id,
      empresaId: documentosFiscais.empresaId,
      modelo: documentosFiscais.modelo,
      status: documentosFiscais.status,
    })
    .from(documentosFiscais)
    .where(and(...conditions))
    .orderBy(desc(documentosFiscais.updatedAt))
    .limit(Math.max(1, ENV.fiscalPollingBatchSize));

  const results = await processFiscalPollingBatch(documents);
  return {
    processed: results.length,
    success: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
    results,
  };
}

let fiscalPollingTimer: ReturnType<typeof setInterval> | null = null;

export function startFiscalPolling() {
  if (fiscalPollingTimer || ENV.fiscalPollingIntervalMs <= 0) return;
  fiscalPollingTimer = setInterval(() => {
    void pollPendingFiscalDocuments().catch((error) => {
      console.warn("[Fiscal Polling] Falha ao processar pendencias:", String(error));
    });
  }, ENV.fiscalPollingIntervalMs);
  fiscalPollingTimer.unref?.();
}

export async function reemitDocument(empresaId: number, documentId: number, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [document] = await db
    .select()
    .from(documentosFiscais)
    .where(and(eq(documentosFiscais.id, documentId), eq(documentosFiscais.empresaId, empresaId)))
    .limit(1);

  if (!document) throw new Error("Documento fiscal nao encontrado");
  if (!document.vendaId) throw new Error("Documento fiscal nao esta vinculado a uma venda");
  if (document.status === "AUTORIZADA" || document.status === "CANCELADA") {
    throw new Error("Documento autorizado ou cancelado nao pode ser reenviado");
  }

  return emitirNotaDaVenda(empresaId, {
    vendaId: document.vendaId,
    modelo: document.modelo as any,
    emitirEmContingencia: false,
  }, usuarioId);
}

export async function createCartaCorrecao(empresaId: number, documentId: number, input: FiscalCartaCorrecaoInput, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [document] = await db
    .select()
    .from(documentosFiscais)
    .where(and(eq(documentosFiscais.id, documentId), eq(documentosFiscais.empresaId, empresaId)))
    .limit(1);

  if (!document) throw new Error("Documento fiscal nao encontrado");
  if (document.status !== "AUTORIZADA") throw new Error("Carta de correcao exige documento autorizado");
  if (document.modelo !== "NFE") throw new Error("Carta de correcao estruturada esta liberada apenas para NF-e modelo 55");

  const eventos = await db
    .select({ sequencia: fiscalEventos.sequencia })
    .from(fiscalEventos)
    .where(and(eq(fiscalEventos.empresaId, empresaId), eq(fiscalEventos.documentoFiscalId, documentId), eq(fiscalEventos.tipo, "CARTA_CORRECAO")))
    .orderBy(desc(fiscalEventos.sequencia))
    .limit(1);
  const sequencia = (eventos[0]?.sequencia || 0) + 1;

  const [result] = await db.insert(fiscalEventos).values({
    empresaId,
    documentoFiscalId: documentId,
    tipo: "CARTA_CORRECAO",
    status: "PENDENTE",
    justificativa: input.correcao,
    sequencia,
    usuarioId,
    xmlEvento: JSON.stringify({
      tipo: "CARTA_CORRECAO",
      correcao: input.correcao,
      sequencia,
      chaveAcesso: document.chaveAcesso,
    }),
  });

  await recordFiscalAudit(empresaId, usuarioId, "REGISTRAR_CARTA_CORRECAO", "DOCUMENTO_FISCAL", String(documentId), {
    sequencia,
  });
  return {
    success: true,
    id: result.insertId,
    status: "PENDENTE",
    message: "Carta de correcao registrada. O envio oficial pode ser acoplado ao provedor quando a conta Focus estiver habilitada para eventos.",
  };
}

export async function createInutilizacao(empresaId: number, input: FiscalInutilizacaoInput, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const config = await getConfig(empresaId);

  const [result] = await db.insert(fiscalEventos).values({
    empresaId,
    documentoFiscalId: null,
    tipo: "INUTILIZACAO",
    status: "PENDENTE",
    justificativa: input.justificativa,
    usuarioId,
    xmlEvento: JSON.stringify({
      tipo: "INUTILIZACAO",
      modelo: input.modelo,
      ambiente: config.ambiente,
      serie: input.serie,
      numeroInicial: input.numeroInicial,
      numeroFinal: input.numeroFinal,
      justificativa: input.justificativa,
    }),
  });

  await recordFiscalAudit(empresaId, usuarioId, "REGISTRAR_INUTILIZACAO", "NUMERACAO_FISCAL", null, {
    modelo: input.modelo,
    serie: input.serie,
    numeroInicial: input.numeroInicial,
    numeroFinal: input.numeroFinal,
  });
  return {
    success: true,
    id: result.insertId,
    status: "PENDENTE",
    message: "Inutilizacao registrada. O envio oficial deve ocorrer pelo provedor fiscal/SEFAZ antes de considerar a numeracao inutilizada.",
  };
}

export async function getDocumentXml(empresaId: number, documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [document] = await db
    .select()
    .from(documentosFiscais)
    .where(and(eq(documentosFiscais.id, documentId), eq(documentosFiscais.empresaId, empresaId)))
    .limit(1);
  if (!document) throw new Error("Documento fiscal nao encontrado");
  if (!document.xml) throw new Error("Documento fiscal ainda nao possui XML");
  if (isProviderFilePath(document.xml)) {
    const providerFile = await downloadFiscalProviderFile(document.xml, document.ambiente, empresaId);
    if (providerFile?.content) {
      return { ...document, xml: providerFile.content };
    }
  }
  return document;
}

export async function getDocumentDanfeHtml(empresaId: number, documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [documentRecord] = await db
    .select()
    .from(documentosFiscais)
    .where(and(eq(documentosFiscais.id, documentId), eq(documentosFiscais.empresaId, empresaId)))
    .limit(1);

  if (!documentRecord) throw new Error("Documento fiscal nao encontrado");
  if (documentRecord.danfeUrl && isProviderFilePath(documentRecord.danfeUrl)) {
    const providerFile = await downloadFiscalProviderFile(documentRecord.danfeUrl, documentRecord.ambiente, empresaId);
    if (providerFile?.content) return providerFile.content;
  }

  const document = await getDocumentXml(empresaId, documentId);
  return [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>DANFE</title>",
    "<style>body{font-family:Arial,sans-serif;margin:24px;color:#111} .box{border:1px solid #333;padding:12px;margin:8px 0} h1{font-size:20px;margin:0 0 8px} .muted{color:#555;font-size:12px}</style>",
    "</head><body>",
    `<h1>DANFE ${document.modelo}</h1>`,
    `<div class="box"><strong>Status:</strong> ${document.status}<br><strong>Ambiente:</strong> ${document.ambiente}<br><strong>Serie/Numero:</strong> ${document.serie}/${document.numero}</div>`,
    `<div class="box"><strong>Chave de acesso:</strong><br>${document.chaveAcesso || "-"}</div>`,
    `<div class="box"><strong>Protocolo:</strong> ${document.protocolo || "-"}</div>`,
    "<p class=\"muted\">DANFE simplificado gerado pelo ERP. A impressao oficial sera finalizada na integracao SEFAZ/mensageria.</p>",
    "</body></html>",
  ].join("");
}

export async function getFiscalSummary(empresaId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const start = `${year}-${String(month).padStart(2, "0")}-01 00:00:00`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01 00:00:00`;

  const [summary] = await db
    .select({
      totalDocumentos: sql<number>`count(*)`.mapWith(Number),
      totalAutorizadas: sql<number>`sum(case when ${documentosFiscais.status} = 'AUTORIZADA' then 1 else 0 end)`.mapWith(Number),
      totalCanceladas: sql<number>`sum(case when ${documentosFiscais.status} = 'CANCELADA' then 1 else 0 end)`.mapWith(Number),
      totalValor: sql<number>`coalesce(sum(${vendas.valorLiquido}), 0)`.mapWith(Number),
    })
    .from(documentosFiscais)
    .leftJoin(vendas, eq(documentosFiscais.vendaId, vendas.id))
    .where(and(eq(documentosFiscais.empresaId, empresaId), sql`${documentosFiscais.createdAt} >= ${start}`, sql`${documentosFiscais.createdAt} < ${end}`));

  return summary;
}

export function parseFiscalInutilizacaoPayload(xmlEvento?: string | null) {
  if (!xmlEvento) return null;
  try {
    const payload = JSON.parse(xmlEvento);
    return {
      modelo: payload.modelo || null,
      serie: payload.serie ?? null,
      numeroInicial: payload.numeroInicial ?? null,
      numeroFinal: payload.numeroFinal ?? null,
      ambiente: payload.ambiente || null,
    };
  } catch {
    return null;
  }
}

export async function getFiscalExceptionsReport(empresaId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const start = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end = endDate || now.toISOString().slice(0, 10);

  const cancelled = await db
    .select({
      id: documentosFiscais.id,
      modelo: documentosFiscais.modelo,
      numero: documentosFiscais.numero,
      serie: documentosFiscais.serie,
      chaveAcesso: documentosFiscais.chaveAcesso,
      protocoloCancelamento: documentosFiscais.protocoloCancelamento,
      justificativa: documentosFiscais.justificativaCancelamento,
      canceladaEm: documentosFiscais.canceladaEm,
    })
    .from(documentosFiscais)
    .where(and(
      eq(documentosFiscais.empresaId, empresaId),
      eq(documentosFiscais.status, "CANCELADA"),
      sql`${documentosFiscais.canceladaEm} >= ${`${start} 00:00:00`}`,
      sql`${documentosFiscais.canceladaEm} <= ${`${end} 23:59:59`}`,
    ))
    .orderBy(desc(documentosFiscais.canceladaEm));

  const inutilizacoes = await db
    .select({
      id: fiscalEventos.id,
      status: fiscalEventos.status,
      justificativa: fiscalEventos.justificativa,
      protocolo: fiscalEventos.protocolo,
      xmlEvento: fiscalEventos.xmlEvento,
      createdAt: fiscalEventos.createdAt,
    })
    .from(fiscalEventos)
    .where(and(
      eq(fiscalEventos.empresaId, empresaId),
      eq(fiscalEventos.tipo, "INUTILIZACAO"),
      sql`${fiscalEventos.createdAt} >= ${`${start} 00:00:00`}`,
      sql`${fiscalEventos.createdAt} <= ${`${end} 23:59:59`}`,
    ))
    .orderBy(desc(fiscalEventos.createdAt));

  return {
    periodo: { inicio: start, fim: end },
    summary: {
      cancelados: cancelled.length,
      inutilizacoes: inutilizacoes.length,
      inutilizacoesPendentes: inutilizacoes.filter((item) => item.status === "PENDENTE").length,
    },
    cancelados: cancelled,
    inutilizacoes: inutilizacoes.map(({ xmlEvento, ...item }) => ({
      ...item,
      numeracao: parseFiscalInutilizacaoPayload(xmlEvento),
    })),
  };
}

export async function getFiscalReadiness(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const config = await getConfig(empresaId);
  const certificados = await listCertificados(empresaId);
  const equipamentos = await listSatMfeEquipamentos(empresaId);
  const certificadoAtivo = certificados.find((certificado) => certificado.ativo);
  const certificadoVencido = certificadoAtivo?.validade
    ? new Date(certificadoAtivo.validade).getTime() < Date.now()
    : !certificadoAtivo;
  const providerConfigured = await hasFiscalProviderForCompany(empresaId, config.ambiente);
  const providerCredentials = await listGlobalFiscalProviderCredentials();
  const activeProvider = providerCredentials.find((credential) => credential.ativo && credential.ambiente === config.ambiente);

  const checks = [
    {
      code: "AMBIENTE",
      ok: Boolean(config.ambiente),
      label: `Ambiente fiscal definido como ${config.ambiente}`,
      detail: config.ambiente === "PRODUCAO"
        ? "Em producao, as notas possuem valor fiscal real."
        : "Homologacao permite testar sem valor fiscal.",
    },
    {
      code: "CERTIFICADO_A1",
      ok: Boolean(certificadoAtivo) && !certificadoVencido,
      label: "Certificado A1 ativo e dentro da validade",
      detail: certificadoAtivo
        ? `Certificado ${certificadoAtivo.nomeArquivo} vence em ${certificadoAtivo.validade ? new Date(certificadoAtivo.validade).toLocaleDateString("pt-BR") : "data nao informada"}.`
        : "Cadastre o certificado A1 da empresa para transmitir NF-e/NFC-e automaticamente.",
    },
    {
      code: "NFCE_CSC",
      ok: !config.habilitarNfce || Boolean(config.idTokenIsc && config.csc),
      label: "CSC e idToken informados para NFC-e",
      detail: config.habilitarNfce
        ? "Obrigatorio para gerar QR Code de NFC-e."
        : "NFC-e automatica ainda esta desabilitada.",
    },
    {
      code: "PROVEDOR_FISCAL",
      ok: providerConfigured,
      label: "Provedor fiscal automatico configurado",
      detail: providerConfigured
        ? `Provedor central ${activeProvider?.provedor || ENV.fiscalProvider} configurado para transmissao.`
        : "A administracao Trakto precisa configurar o provedor fiscal central para este ambiente.",
    },
    {
      code: "SAT_MFE",
      ok: equipamentos.some((equipamento) => equipamento.status === "ATIVO"),
      label: "Equipamento SAT/MFE ativo para PDV fiscal",
      detail: equipamentos.length > 0
        ? "Equipamentos cadastrados. O teste final depende do agent local conectado ao PDV."
        : "Cadastre SAT/MFE apenas para estados/empresas que usam esse modelo.",
    },
  ];

  return {
    readyForAutomaticNfce: checks
      .filter((check) => ["AMBIENTE", "CERTIFICADO_A1", "NFCE_CSC", "PROVEDOR_FISCAL"].includes(check.code))
      .every((check) => check.ok),
    readyForManualPortal: Boolean(config.ambiente),
    readyForSatMfe: checks.find((check) => check.code === "SAT_MFE")?.ok || false,
    provider: {
      configured: providerConfigured,
      name: activeProvider?.provedor || ENV.fiscalProvider || null,
      baseUrl: activeProvider?.baseUrl || ENV.fiscalProviderBaseUrl || null,
      supportedModels: providerConfigured ? ["NFCE", "NFE"] : [],
    },
    checks,
  };
}

export async function listEventos(empresaId: number, documentoFiscalId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(fiscalEventos.empresaId, empresaId)];
  if (documentoFiscalId) conditions.push(eq(fiscalEventos.documentoFiscalId, documentoFiscalId));
  return db.select().from(fiscalEventos).where(and(...conditions)).orderBy(desc(fiscalEventos.createdAt));
}

export async function listTransmissoes(empresaId: number, documentoFiscalId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(fiscalTransmissoes.empresaId, empresaId)];
  if (documentoFiscalId) conditions.push(eq(fiscalTransmissoes.documentoFiscalId, documentoFiscalId));
  return db.select().from(fiscalTransmissoes).where(and(...conditions)).orderBy(desc(fiscalTransmissoes.createdAt));
}

export async function listAuditoria(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(fiscalAuditoria)
    .where(eq(fiscalAuditoria.empresaId, empresaId))
    .orderBy(desc(fiscalAuditoria.createdAt));
}

async function recordFiscalAudit(
  empresaId: number,
  usuarioId: number | undefined,
  acao: string,
  entidade: string,
  entidadeId?: string | null,
  detalhes?: Record<string, unknown>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(fiscalAuditoria).values({
    empresaId,
    usuarioId: usuarioId || null,
    acao,
    entidade,
    entidadeId: entidadeId || null,
    detalhesJson: detalhes ? JSON.stringify(detalhes) : null,
  });
}

export async function listCertificados(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select({
      id: certificadosDigitais.id,
      tipo: certificadosDigitais.tipo,
      nomeArquivo: certificadosDigitais.nomeArquivo,
      caminhoSeguro: certificadosDigitais.caminhoSeguro,
      validade: certificadosDigitais.validade,
      cnpj: certificadosDigitais.cnpj,
      razaoSocial: certificadosDigitais.razaoSocial,
      ativo: certificadosDigitais.ativo,
      createdAt: certificadosDigitais.createdAt,
    })
    .from(certificadosDigitais)
    .where(eq(certificadosDigitais.empresaId, empresaId))
    .orderBy(desc(certificadosDigitais.createdAt));
}

export async function createCertificado(empresaId: number, input: CertificadoDigitalInput, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const certificateBuffer = loadCertificateBuffer(input.arquivoBase64, input.caminhoSeguro);
  const certificateInfo = inspectCertificateA1(certificateBuffer, input.senha);
  if (certificateInfo.validade.getTime() < Date.now()) {
    throw new Error("Certificado A1 vencido");
  }
  const [empresa] = await db.select({ cnpj: empresas.cnpj }).from(empresas).where(eq(empresas.id, empresaId)).limit(1);
  const empresaCnpj = onlyDigits(empresa?.cnpj);
  if (certificateInfo.cnpj && certificateInfo.cnpj !== empresaCnpj) {
    throw new Error("CNPJ do certificado A1 nao corresponde ao CNPJ da empresa");
  }
  const caminhoSeguro = input.arquivoBase64
    ? saveCertificateFile(empresaId, input.nomeArquivo, input.arquivoBase64)
    : input.caminhoSeguro;
  if (!caminhoSeguro) throw new Error("Informe o arquivo A1 ou um caminho seguro para o certificado");

  const [result] = await db.insert(certificadosDigitais).values({
    empresaId,
    tipo: "A1",
    nomeArquivo: input.nomeArquivo,
    caminhoSeguro,
    senhaCriptografada: encryptSecret(input.senha),
    validade: certificateInfo.validade,
    cnpj: certificateInfo.cnpj || input.cnpj,
    razaoSocial: certificateInfo.razaoSocial || input.razaoSocial,
    ativo: input.ativo,
  });

  if (input.ativo) {
    const config = await getConfig(empresaId);
    await db
      .update(configuracoesFiscais)
      .set({
        certificadoDigitalCaminho: caminhoSeguro,
        certificadoDigitalSenha: encryptSecret(input.senha),
        certificadoValidade: certificateInfo.validade,
      })
      .where(and(eq(configuracoesFiscais.id, config.id), eq(configuracoesFiscais.empresaId, empresaId)));
  }

  await recordFiscalAudit(empresaId, usuarioId, "CRIAR_CERTIFICADO", "CERTIFICADO_A1", String(result.insertId), {
    nomeArquivo: input.nomeArquivo,
    cnpj: certificateInfo.cnpj || input.cnpj || null,
    validade: certificateInfo.validade.toISOString(),
  });
  return { success: true, id: result.insertId };
}

export async function testCertificado(empresaId: number, id: number, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [certificado] = await db
    .select()
    .from(certificadosDigitais)
    .where(and(eq(certificadosDigitais.id, id), eq(certificadosDigitais.empresaId, empresaId)))
    .limit(1);
  if (!certificado) throw new Error("Certificado nao encontrado");

  const [empresa] = await db.select({ cnpj: empresas.cnpj }).from(empresas).where(eq(empresas.id, empresaId)).limit(1);
  const issues: string[] = [];
  let certificateInfo = null;
  try {
    const buffer = fs.readFileSync(certificado.caminhoSeguro);
    certificateInfo = inspectCertificateA1(buffer, decryptSecret(certificado.senhaCriptografada, { legacyBase64: true }));
  } catch (error: any) {
    issues.push(error.message);
  }
  const validade = certificateInfo?.validade || (certificado.validade ? new Date(certificado.validade) : null);
  const vencido = validade ? validade.getTime() < Date.now() : true;
  const certificadoCnpj = certificateInfo?.cnpj || certificado.cnpj;
  const cnpjDivergente = Boolean(certificadoCnpj && onlyDigits(certificadoCnpj) !== onlyDigits(empresa?.cnpj));
  if (!certificado.caminhoSeguro) issues.push("Certificado sem caminho seguro cadastrado");
  if (vencido) issues.push("Certificado vencido ou sem validade informada");
  if (cnpjDivergente) issues.push("CNPJ do certificado nao corresponde ao CNPJ da empresa");
  await recordFiscalAudit(empresaId, usuarioId, "TESTAR_CERTIFICADO", "CERTIFICADO_A1", String(id), {
    ok: issues.length === 0,
    issues,
  });
  return {
    ok: issues.length === 0,
    certificado: {
      id: certificado.id,
      nomeArquivo: certificado.nomeArquivo,
      validade: certificado.validade,
      cnpj: certificadoCnpj,
      ativo: certificado.ativo,
    },
    issues,
  };
}

export async function deactivateCertificado(empresaId: number, id: number, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [certificado] = await db
    .select({ caminhoSeguro: certificadosDigitais.caminhoSeguro })
    .from(certificadosDigitais)
    .where(and(eq(certificadosDigitais.id, id), eq(certificadosDigitais.empresaId, empresaId)))
    .limit(1);
  await db.update(certificadosDigitais).set({ ativo: false }).where(and(eq(certificadosDigitais.id, id), eq(certificadosDigitais.empresaId, empresaId)));
  if (certificado) {
    await db
      .update(configuracoesFiscais)
      .set({
        certificadoDigitalCaminho: null,
        certificadoDigitalSenha: null,
        certificadoValidade: null,
      })
      .where(and(
        eq(configuracoesFiscais.empresaId, empresaId),
        eq(configuracoesFiscais.certificadoDigitalCaminho, certificado.caminhoSeguro),
      ));
  }
  await recordFiscalAudit(empresaId, usuarioId, "DESATIVAR_CERTIFICADO", "CERTIFICADO_A1", String(id));
  return { success: true };
}

export async function listSatMfeEquipamentos(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(satMfeEquipamentos).where(eq(satMfeEquipamentos.empresaId, empresaId)).orderBy(desc(satMfeEquipamentos.createdAt));
}

export async function createSatMfeEquipamento(empresaId: number, input: SatMfeEquipamentoInput, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(satMfeEquipamentos).values({
    empresaId,
    pdvId: input.pdvId,
    tipo: input.tipo,
    fabricante: input.fabricante,
    modelo: input.modelo,
    numeroSerie: input.numeroSerie,
    codigoAtivacaoCriptografado: encryptSecret(input.codigoAtivacao),
    assinaturaAplicativoComercial: input.assinaturaAplicativoComercial,
    cnpjSoftwareHouse: input.cnpjSoftwareHouse,
    status: input.status,
  });
  await recordFiscalAudit(empresaId, usuarioId, "CRIAR_EQUIPAMENTO_SAT_MFE", "EQUIPAMENTO_SAT_MFE", String(result.insertId), {
    pdvId: input.pdvId,
    tipo: input.tipo,
    numeroSerie: input.numeroSerie || null,
  });
  return { success: true, id: result.insertId };
}

export async function testSatMfeEquipamento(empresaId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [equipamento] = await db
    .select()
    .from(satMfeEquipamentos)
    .where(and(eq(satMfeEquipamentos.id, id), eq(satMfeEquipamentos.empresaId, empresaId)))
    .limit(1);
  if (!equipamento) throw new Error("Equipamento SAT/MFE nao encontrado");

  await db.update(satMfeEquipamentos)
    .set({ status: "NAO_TESTADO", ultimoTesteComunicacao: new Date() })
    .where(and(eq(satMfeEquipamentos.id, id), eq(satMfeEquipamentos.empresaId, empresaId)));

  return {
    ok: false,
    status: "AGENT_LOCAL_NECESSARIO",
    message: "Equipamento cadastrado. O teste real precisa ser executado pelo agent local do PDV conectado ao SAT/MFE.",
  };
}

export async function createSatMfeCupom(empresaId: number, input: SatMfeCupomInput, usuarioId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [equipamento] = await db
    .select()
    .from(satMfeEquipamentos)
    .where(and(eq(satMfeEquipamentos.id, input.equipamentoId), eq(satMfeEquipamentos.empresaId, empresaId)))
    .limit(1);
  if (!equipamento) throw new Error("Equipamento SAT/MFE nao encontrado");

  const [result] = await db.insert(satMfeCupons).values({
    empresaId,
    vendaId: input.vendaId,
    equipamentoId: input.equipamentoId,
    modelo: input.modelo,
    status: "PENDENTE_EQUIPAMENTO",
    mensagemRetorno: "Cupom aguardando emissao pelo agent local do PDV.",
  });

  await recordFiscalAudit(empresaId, usuarioId, "CRIAR_CUPOM_SAT_MFE", "CUPOM_SAT_MFE", String(result.insertId), {
    vendaId: input.vendaId,
    equipamentoId: input.equipamentoId,
    modelo: input.modelo,
  });
  return { success: true, id: result.insertId, status: "PENDENTE_EQUIPAMENTO" };
}

async function incrementFiscalNumber(empresaId: number, modelo: "NFE" | "NFCE") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (modelo === "NFCE") {
    await db
      .update(configuracoesFiscais)
      .set({ proximoNumeroNfce: sql`${configuracoesFiscais.proximoNumeroNfce} + 1` })
      .where(eq(configuracoesFiscais.empresaId, empresaId));
    return;
  }

  await db
    .update(configuracoesFiscais)
    .set({ proximoNumeroNfe: sql`${configuracoesFiscais.proximoNumeroNfe} + 1` })
    .where(eq(configuracoesFiscais.empresaId, empresaId));
}

function buildDraftXml(modelo: FiscalModelo, numero: number, serie: number, vendaId: number) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<documentoFiscalDraft modelo="${modelo}" numero="${numero}" serie="${serie}" vendaId="${vendaId}">`,
    `  <status>PRE_VALIDADO_SEM_TRANSMISSAO_SEFAZ</status>`,
    `</documentoFiscalDraft>`,
  ].join("\n");
}

async function buildAccessKey(empresaId: number, modelo: FiscalModelo, numero: number, serie: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [empresa] = await db.select({ cnpj: empresas.cnpj }).from(empresas).where(eq(empresas.id, empresaId)).limit(1);
  const cnpj = String(empresa?.cnpj || "").replace(/\D/g, "").padStart(14, "0").slice(0, 14);
  const now = new Date();
  const aamm = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const modeloCodigo = modelo === "NFCE" ? "65" : modelo === "NFE" ? "55" : "59";
  const base = `35${aamm}${cnpj}${modeloCodigo}${String(serie).padStart(3, "0")}${String(numero).padStart(9, "0")}100000001`;
  return `${base}${mod11(base)}`;
}

function mod11(value: string) {
  let weight = 2;
  let sum = 0;
  for (let i = value.length - 1; i >= 0; i--) {
    sum += Number(value[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const result = 11 - (sum % 11);
  return result >= 10 ? 0 : result;
}

async function buildFiscalXml(empresaId: number, modelo: FiscalModelo, numero: number, serie: number, vendaId: number, chaveAcesso: string | null, protocolo: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [empresa] = await db.select().from(empresas).where(eq(empresas.id, empresaId)).limit(1);
  const [sale] = await db.select().from(vendas).where(and(eq(vendas.id, vendaId), eq(vendas.empresaId, empresaId))).limit(1);
  const saleItems = await db
    .select({
      quantidade: itensVenda.quantidade,
      precoUnitario: itensVenda.precoUnitario,
      valorTotal: itensVenda.valorTotal,
      descricao: produtos.descricao,
      codigo: produtos.codigo,
      ncm: produtos.ncm,
      cfop: produtos.cfopPadraoVenda,
    })
    .from(itensVenda)
    .innerJoin(produtos, eq(itensVenda.produtoId, produtos.id))
    .where(eq(itensVenda.vendaId, vendaId));

  const itemsXml = saleItems.map((item, index) => [
    `    <item nItem="${index + 1}">`,
    `      <codigo>${escapeXml(item.codigo || "")}</codigo>`,
    `      <descricao>${escapeXml(item.descricao || "")}</descricao>`,
    `      <ncm>${item.ncm || ""}</ncm>`,
    `      <cfop>${item.cfop || ""}</cfop>`,
    `      <quantidade>${item.quantidade}</quantidade>`,
    `      <valorUnitario>${(item.precoUnitario / 100).toFixed(2)}</valorUnitario>`,
    `      <valorTotal>${(item.valorTotal / 100).toFixed(2)}</valorTotal>`,
    `    </item>`,
  ].join("\n")).join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<notaFiscal modelo="${modelo}" chave="${chaveAcesso || ""}">`,
    `  <emitente cnpj="${escapeXml(empresa?.cnpj || "")}">${escapeXml(empresa?.razaoSocial || empresa?.nomeFantasia || "")}</emitente>`,
    `  <identificacao serie="${serie}" numero="${numero}" vendaId="${vendaId}" numeroVenda="${escapeXml(sale?.numeroVenda || "")}" />`,
    `  <itens>`,
    itemsXml,
    `  </itens>`,
    `  <total>${((sale?.valorLiquido || 0) / 100).toFixed(2)}</total>`,
    `  <protocolo>${protocolo || ""}</protocolo>`,
    `</notaFiscal>`,
  ].join("\n");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isProviderFilePath(value: string) {
  return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
}

function saveCertificateFile(empresaId: number, originalName: string, fileBase64: string) {
  const buffer = decodeCertificateBase64(fileBase64);
  const extension = path.extname(originalName).toLowerCase() || ".pfx";
  if (![".pfx", ".p12"].includes(extension)) {
    throw new Error("Certificado A1 deve ser um arquivo .pfx ou .p12");
  }
  const uploadDir = path.join(process.cwd(), "uploads", "certificados", String(empresaId));
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const filename = `${nanoid()}${extension}`;
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, buffer, { mode: 0o600 });
  return filepath;
}

function loadCertificateBuffer(fileBase64?: string | null, securePath?: string | null) {
  if (fileBase64) return decodeCertificateBase64(fileBase64);
  if (securePath && fs.existsSync(securePath)) return fs.readFileSync(securePath);
  throw new Error("Envie o arquivo A1 .pfx/.p12 para validacao");
}

function decodeCertificateBase64(fileBase64: string) {
  const raw = fileBase64.includes(",") ? fileBase64.split(",").pop() || "" : fileBase64;
  return Buffer.from(raw, "base64");
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}
