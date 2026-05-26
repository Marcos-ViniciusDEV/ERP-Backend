import { and, desc, eq, sql } from "drizzle-orm";
import { configuracoesFiscais, documentosFiscais, itensVenda, produtos, vendas } from "../../drizzle/schema";
import { getDb } from "../libs/db";
import type { FiscalConfigInput, FiscalPreflightInput, FiscalPrepareInput } from "../zod/fiscal.schema";

type FiscalIssueSeverity = "error" | "warning";

type FiscalIssue = {
  severity: FiscalIssueSeverity;
  code: string;
  message: string;
  path?: string;
};

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

export async function updateConfig(empresaId: number, input: FiscalConfigInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const current = await getConfig(empresaId);
  const payload = {
    ...input,
    certificadoValidade: input.certificadoValidade ? new Date(input.certificadoValidade) : null,
  };

  await db
    .update(configuracoesFiscais)
    .set(payload)
    .where(and(eq(configuracoesFiscais.id, current.id), eq(configuracoesFiscais.empresaId, empresaId)));

  return getConfig(empresaId);
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

  if (input.modelo === "NFCE" && !config.habilitarNfce) {
    issues.push({ severity: "error", code: "NFCE_DESABILITADA", message: "A emissao automatica de NFC-e esta desabilitada nas configuracoes fiscais." });
  }

  if (!config.certificadoDigitalCaminho) {
    issues.push({ severity: "warning", code: "CERTIFICADO_AUSENTE", message: "Certificado A1 ainda nao cadastrado. A transmissao para SEFAZ ficara bloqueada." });
  }

  if (input.modelo === "NFCE" && (!config.idTokenIsc || !config.csc)) {
    issues.push({ severity: "warning", code: "CSC_AUSENTE", message: "CSC/idToken nao configurados. O QR Code da NFC-e nao podera ser gerado." });
  }

  if (input.modelo === "NFE") {
    issues.push({
      severity: "warning",
      code: "CLIENTE_NAO_VINCULADO",
      message: "A venda ainda nao possui vinculo estruturado com cliente no schema atual. Para NF-e modelo 55, o cadastro completo do destinatario sera obrigatorio.",
    });
  }

  const saleItems = await db
    .select({
      itemId: itensVenda.id,
      produtoId: produtos.id,
      codigo: produtos.codigo,
      descricao: produtos.descricao,
      ncm: produtos.ncm,
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
    const label = `${item.codigo} - ${item.descricao}`;
    if (!item.ncm || !/^\d{8}$/.test(item.ncm)) {
      issues.push({ severity: "error", code: "NCM_INVALIDO", message: `Produto ${label} precisa de NCM com 8 digitos.`, path: `produto.${item.produtoId}.ncm` });
    }
    if (!item.cfopPadraoVenda || !/^\d{4}$/.test(item.cfopPadraoVenda)) {
      issues.push({ severity: "error", code: "CFOP_INVALIDO", message: `Produto ${label} precisa de CFOP padrao de venda com 4 digitos.`, path: `produto.${item.produtoId}.cfopPadraoVenda` });
    }
    if (item.origem === null || item.origem === undefined || item.origem < 0 || item.origem > 8) {
      issues.push({ severity: "error", code: "ORIGEM_INVALIDA", message: `Produto ${label} precisa de origem fiscal entre 0 e 8.`, path: `produto.${item.produtoId}.origem` });
    }
    if (!item.cstIcms && !item.csosnIcms) {
      issues.push({ severity: "error", code: "ICMS_AUSENTE", message: `Produto ${label} precisa de CST ICMS ou CSOSN ICMS.`, path: `produto.${item.produtoId}.icms` });
    }
    if (!item.pisCst) {
      issues.push({ severity: "warning", code: "PIS_AUSENTE", message: `Produto ${label} esta sem CST de PIS.`, path: `produto.${item.produtoId}.pisCst` });
    }
    if (!item.cofinsCst) {
      issues.push({ severity: "warning", code: "COFINS_AUSENTE", message: `Produto ${label} esta sem CST de COFINS.`, path: `produto.${item.produtoId}.cofinsCst` });
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

  if (!hasErrors) {
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

export async function cancelDocument(empresaId: number, documentId: number, justificativa: string) {
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

  await db
    .update(documentosFiscais)
    .set({
      status: "CANCELADA",
      justificativaCancelamento: justificativa,
      canceladaEm: new Date(),
      motivoStatus: "Cancelamento registrado no ERP. Transmissao do evento para SEFAZ sera feita na etapa de integracao.",
    })
    .where(and(eq(documentosFiscais.id, documentId), eq(documentosFiscais.empresaId, empresaId)));

  const [updated] = await db.select().from(documentosFiscais).where(eq(documentosFiscais.id, documentId)).limit(1);
  return updated;
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

function buildDraftXml(modelo: "NFE" | "NFCE", numero: number, serie: number, vendaId: number) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<documentoFiscalDraft modelo="${modelo}" numero="${numero}" serie="${serie}" vendaId="${vendaId}">`,
    `  <status>PRE_VALIDADO_SEM_TRANSMISSAO_SEFAZ</status>`,
    `</documentoFiscalDraft>`,
  ].join("\n");
}
