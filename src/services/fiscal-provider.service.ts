import axios from "axios";
import { and, eq } from "drizzle-orm";
import { clientes, empresas, fiscalProvedorCredenciais, itensVenda, produtos, vendas } from "../../drizzle/schema";
import { getDb } from "../libs/db";
import { ENV } from "../libs/env";
import type { FiscalPrepareInput } from "../zod/fiscal.schema";

type FiscalModelo = "NFE" | "NFCE" | "SAT" | "MFE";

type ProviderCredential = {
  provider: string;
  token: string;
  baseUrl: string | null;
  companyId: string | null;
};

type ProviderStatus =
  | "AUTORIZADA"
  | "ENVIADO"
  | "REJEITADA"
  | "DENEGADO"
  | "CANCELADA";

export type FiscalProviderResult = {
  provider: string;
  reference: string;
  endpoint: string;
  httpStatus: number;
  durationMs: number;
  requestPayload: unknown;
  responsePayload: any;
  status: ProviderStatus;
  chaveAcesso: string | null;
  protocolo: string | null;
  codigoStatusSefaz: string | null;
  motivoStatusSefaz: string | null;
  xmlUrl: string | null;
  danfeUrl: string | null;
  qrcodeUrl: string | null;
  authorizedAt: Date | null;
};

export function hasFiscalProvider() {
  return Boolean(ENV.fiscalProvider && ENV.fiscalProviderToken);
}

export async function hasFiscalProviderForCompany(empresaId: number, ambiente: "HOMOLOGACAO" | "PRODUCAO") {
  const credential = await getProviderCredential(empresaId, ambiente);
  return Boolean(credential);
}

export async function emitFiscalDocumentWithProvider(
  empresaId: number,
  input: FiscalPrepareInput,
  config: any,
  numero: number,
  serie: number,
) {
  const credential = await getProviderCredential(empresaId, config.ambiente);
  if (!credential) return null;

  const provider = credential.provider.toLowerCase();
  if (provider !== "focus_nfe" && provider !== "focus") {
    throw new Error(`Provedor fiscal nao suportado: ${credential.provider}`);
  }

  return emitWithFocusNfe(empresaId, input, config, numero, serie, credential);
}

export async function downloadFiscalProviderFile(pathOrUrl: string, ambiente: "HOMOLOGACAO" | "PRODUCAO", empresaId?: number) {
  const credential = empresaId ? await getProviderCredential(empresaId, ambiente) : getEnvProviderCredential(ambiente);
  if (!credential) return null;
  const provider = credential.provider.toLowerCase();
  if (provider !== "focus_nfe" && provider !== "focus") return null;

  const baseUrl = credential.baseUrl || focusBaseUrl(ambiente);
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${baseUrl.replace(/\/$/, "")}${pathOrUrl}`;
  const response = await axios.get(url, {
    auth: { username: credential.token, password: "" },
    responseType: "text",
    timeout: 45_000,
  });

  return {
    content: response.data,
    contentType: String(response.headers["content-type"] || ""),
  };
}

export async function cancelFiscalDocumentWithProvider(empresaId: number, document: any, justificativa: string) {
  const credential = await getProviderCredential(empresaId, document.ambiente);
  if (!credential) return null;

  const provider = credential.provider.toLowerCase();
  if (provider !== "focus_nfe" && provider !== "focus") {
    throw new Error(`Provedor fiscal nao suportado: ${credential.provider}`);
  }

  const reference = buildReference(empresaId, document.modelo, Number(document.vendaId), Number(document.serie), Number(document.numero));
  const resource = document.modelo === "NFE" ? "nfe" : "nfce";
  const baseUrl = credential.baseUrl || focusBaseUrl(document.ambiente);
  const endpoint = `${baseUrl.replace(/\/$/, "")}/v2/${resource}/${encodeURIComponent(reference)}`;
  const startedAt = Date.now();
  const payload = { justificativa };
  const response = await axios.request({
    method: "DELETE",
    url: endpoint,
    auth: { username: credential.token, password: "" },
    data: payload,
    timeout: 45_000,
    validateStatus: () => true,
  });

  return mapFocusResponse({
    reference,
    endpoint,
    httpStatus: response.status,
    durationMs: Date.now() - startedAt,
    requestPayload: payload,
    responsePayload: response.data,
  });
}

async function emitWithFocusNfe(
  empresaId: number,
  input: FiscalPrepareInput,
  config: any,
  numero: number,
  serie: number,
  credential: ProviderCredential,
): Promise<FiscalProviderResult> {
  const payload = await buildFocusPayload(empresaId, input, config);
  const reference = buildReference(empresaId, input.modelo, input.vendaId, serie, numero);
  const resource = input.modelo === "NFE" ? "nfe" : "nfce";
  const baseUrl = credential.baseUrl || focusBaseUrl(config.ambiente);
  const endpoint = `${baseUrl.replace(/\/$/, "")}/v2/${resource}?ref=${encodeURIComponent(reference)}`;
  const startedAt = Date.now();

  try {
    const response = await axios.post(endpoint, payload, {
      auth: { username: credential.token, password: "" },
      headers: { "Content-Type": "application/json" },
      timeout: 45_000,
      validateStatus: () => true,
    });

    return mapFocusResponse({
      reference,
      endpoint,
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      requestPayload: payload,
      responsePayload: response.data,
    });
  } catch (error: any) {
    if (error.response) {
      return mapFocusResponse({
        reference,
        endpoint,
        httpStatus: error.response.status,
        durationMs: Date.now() - startedAt,
        requestPayload: payload,
        responsePayload: error.response.data,
      });
    }
    throw new Error(`Falha tecnica ao chamar Focus NFe: ${error.message}`);
  }
}

async function getProviderCredential(empresaId: number, ambiente: "HOMOLOGACAO" | "PRODUCAO"): Promise<ProviderCredential | null> {
  const db = await getDb();
  if (!db) return getEnvProviderCredential(ambiente);

  const [credential] = await db
    .select()
    .from(fiscalProvedorCredenciais)
    .where(and(
      eq(fiscalProvedorCredenciais.empresaId, empresaId),
      eq(fiscalProvedorCredenciais.ambiente, ambiente),
      eq(fiscalProvedorCredenciais.ativo, true),
    ))
    .limit(1);

  if (credential) {
    return {
      provider: credential.provedor === "FOCUS_NFE" ? "focus_nfe" : credential.provedor.toLowerCase(),
      token: decodeSecret(credential.tokenCriptografado),
      baseUrl: credential.baseUrl,
      companyId: credential.companyId,
    };
  }

  return getEnvProviderCredential(ambiente);
}

function getEnvProviderCredential(ambiente: "HOMOLOGACAO" | "PRODUCAO"): ProviderCredential | null {
  if (!hasFiscalProvider()) return null;
  return {
    provider: ENV.fiscalProvider,
    token: ENV.fiscalProviderToken,
    baseUrl: ENV.fiscalProviderBaseUrl || focusBaseUrl(ambiente),
    companyId: null,
  };
}

async function buildFocusPayload(empresaId: number, input: FiscalPrepareInput, config: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [empresa] = await db.select().from(empresas).where(eq(empresas.id, empresaId)).limit(1);
  const [sale] = await db
    .select()
    .from(vendas)
    .where(and(eq(vendas.id, input.vendaId), eq(vendas.empresaId, empresaId)))
    .limit(1);
  const [cliente] = sale?.clienteId
    ? await db.select().from(clientes).where(and(eq(clientes.id, sale.clienteId), eq(clientes.empresaId, empresaId))).limit(1)
    : [null];

  if (!empresa) throw new Error("Empresa nao encontrada para emissao fiscal");
  if (!sale) throw new Error("Venda nao encontrada para emissao fiscal");

  const saleItems = await db
    .select({
      quantidade: itensVenda.quantidade,
      precoUnitario: itensVenda.precoUnitario,
      valorTotal: itensVenda.valorTotal,
      valorDesconto: itensVenda.valorDesconto,
      descricao: produtos.descricao,
      codigo: produtos.codigo,
      unidade: produtos.unidade,
      ncm: produtos.ncm,
      cfop: produtos.cfopPadraoVenda,
      origem: produtos.origem,
      cstIcms: produtos.cstIcms,
      csosnIcms: produtos.csosnIcms,
      aliquotaIcms: produtos.aliquotaIcms,
    })
    .from(itensVenda)
    .innerJoin(produtos, eq(itensVenda.produtoId, produtos.id))
    .where(eq(itensVenda.vendaId, input.vendaId));

  const formaPagamento = mapFormaPagamento(sale.formaPagamento);

  const basePayload: any = {
    cnpj_emitente: onlyDigits(empresa.cnpj),
    inscricao_estadual_emitente: empresa.inscricaoEstadual || undefined,
    regime_tributario: empresa.crt || mapRegimeTributario(config.regimeTributario),
    data_emissao: new Date().toISOString(),
    indicador_inscricao_estadual_destinatario: cliente?.indicadorInscricaoEstadual || "9",
    modalidade_frete: "9",
    local_destino: "1",
    presenca_comprador: "1",
    natureza_operacao: "VENDA AO CONSUMIDOR",
    informacoes_adicionais_contribuinte:
      config.ambiente === "HOMOLOGACAO"
        ? "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
        : undefined,
    itens: saleItems.map((item, index) => {
      const icmsSituacaoTributaria = config.regimeTributario === "SIMPLES_NACIONAL"
        ? item.csosnIcms || "102"
        : item.cstIcms || "00";
      const valorBruto = centsToDecimal(item.valorTotal + (item.valorDesconto || 0));

      return {
        numero_item: String(index + 1),
        codigo_ncm: item.ncm,
        codigo_produto: item.codigo,
        descricao: config.ambiente === "HOMOLOGACAO"
          ? "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
          : item.descricao,
        quantidade_comercial: String(item.quantidade),
        quantidade_tributavel: String(item.quantidade),
        cfop: item.cfop,
        valor_unitario_comercial: centsToDecimal(item.precoUnitario),
        valor_unitario_tributavel: centsToDecimal(item.precoUnitario),
        valor_bruto: valorBruto,
        valor_desconto: centsToDecimal(item.valorDesconto || 0),
        unidade_comercial: item.unidade || "UN",
        unidade_tributavel: item.unidade || "UN",
        icms_origem: String(item.origem ?? 0),
        icms_situacao_tributaria: icmsSituacaoTributaria,
        ...(icmsSituacaoTributaria === "00"
          ? {
              icms_aliquota: percentToDecimal(item.aliquotaIcms || 0),
              icms_base_calculo: valorBruto,
              icms_modalidade_base_calculo: "3",
            }
          : {}),
      };
    }),
    formas_pagamento: [
      {
        forma_pagamento: formaPagamento,
        valor_pagamento: centsToDecimal(sale.valorLiquido),
      },
    ],
  };

  if (cliente) {
    Object.assign(basePayload, buildDestinatarioPayload(cliente));
  }

  if (input.modelo === "NFE") {
    if (!cliente) throw new Error("NF-e exige cliente/destinatario vinculado a venda.");
    basePayload.presenca_comprador = "9";
    basePayload.finalidade_emissao = "1";
    basePayload.consumidor_final = "0";
  }

  return basePayload;
}

function mapFocusResponse(input: {
  reference: string;
  endpoint: string;
  httpStatus: number;
  durationMs: number;
  requestPayload: unknown;
  responsePayload: any;
}): FiscalProviderResult {
  const response = input.responsePayload || {};
  const focusStatus = String(response.status || "").toLowerCase();
  const status = mapFocusStatus(focusStatus, input.httpStatus);

  return {
    provider: "focus_nfe",
    reference: input.reference,
    endpoint: input.endpoint,
    httpStatus: input.httpStatus,
    durationMs: input.durationMs,
    requestPayload: input.requestPayload,
    responsePayload: response,
    status,
    chaveAcesso: removeNfePrefix(response.chave_nfe || response.chave_acesso),
    protocolo: response.numero_protocolo || response.protocolo || response.protocolo_nota_fiscal?.numero || null,
    codigoStatusSefaz: response.status_sefaz ? String(response.status_sefaz) : null,
    motivoStatusSefaz: response.mensagem_sefaz || response.mensagem || response.codigo || null,
    xmlUrl: response.caminho_xml_nota_fiscal || null,
    danfeUrl: response.caminho_danfe || null,
    qrcodeUrl: response.qrcode_url || null,
    authorizedAt: status === "AUTORIZADA" ? new Date() : null,
  };
}

function mapFocusStatus(status: string, httpStatus: number): ProviderStatus {
  if (status === "autorizado") return "AUTORIZADA";
  if (status === "cancelado") return "CANCELADA";
  if (status === "denegado") return "DENEGADO";
  if (status === "erro_autorizacao" || httpStatus >= 400) return "REJEITADA";
  return "ENVIADO";
}

function buildReference(empresaId: number, modelo: FiscalModelo, vendaId: number, serie: number, numero: number) {
  return `${empresaId}_${modelo}_${vendaId}_${serie}_${numero}`.replace(/[^a-zA-Z0-9_]/g, "");
}

function mapFormaPagamento(value: string | null) {
  const normalized = String(value || "").toUpperCase();
  if (normalized.includes("DINHEIRO")) return "01";
  if (normalized.includes("CHEQUE")) return "02";
  if (normalized.includes("CREDITO") || normalized.includes("CRÉDITO")) return "03";
  if (normalized.includes("DEBITO") || normalized.includes("DÉBITO")) return "04";
  if (normalized.includes("PIX")) return "17";
  return "99";
}

function buildDestinatarioPayload(cliente: any) {
  const cpfCnpj = onlyDigits(cliente.cpfCnpj);
  const isCnpj = cpfCnpj.length === 14;
  return {
    nome_destinatario: cliente.razaoSocial || cliente.nome,
    ...(isCnpj ? { cnpj_destinatario: cpfCnpj } : { cpf_destinatario: cpfCnpj }),
    inscricao_estadual_destinatario: cliente.inscricaoEstadual || undefined,
    logradouro_destinatario: cliente.logradouro || undefined,
    numero_destinatario: cliente.numero || undefined,
    complemento_destinatario: cliente.complemento || undefined,
    bairro_destinatario: cliente.bairro || undefined,
    municipio_destinatario: cliente.municipio || undefined,
    codigo_municipio_destinatario: cliente.codigoMunicipio || undefined,
    uf_destinatario: cliente.uf || undefined,
    cep_destinatario: onlyDigits(cliente.cep) || undefined,
    telefone_destinatario: onlyDigits(cliente.telefone) || undefined,
    email_destinatario: cliente.email || undefined,
  };
}

function mapRegimeTributario(value: string) {
  if (value === "SIMPLES_NACIONAL") return "1";
  return "3";
}

function focusBaseUrl(ambiente: "HOMOLOGACAO" | "PRODUCAO") {
  return ambiente === "PRODUCAO" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
}

function decodeSecret(value: string) {
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return value;
  }
}

function centsToDecimal(value: number) {
  return (value / 100).toFixed(2);
}

function percentToDecimal(value: number) {
  return (value / 100).toFixed(2);
}

function onlyDigits(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "");
}

function removeNfePrefix(value: string | null | undefined) {
  return value ? String(value).replace(/^NFe/i, "") : null;
}
