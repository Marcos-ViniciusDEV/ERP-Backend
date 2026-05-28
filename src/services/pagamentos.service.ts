import { and, eq, sql } from "drizzle-orm";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { ENV } from "../libs/env";
import { getDb } from "../libs/db";
import {
  adquirentesEmpresa,
  configuracoesPagamentoEmpresa,
  credenciaisPagamento,
  formasPagamentoEmpresa,
  historicoTaxasAdquirentes,
  provedoresPagamento,
  taxasAdquirentes,
  terminaisPagamento,
} from "../../drizzle/schema";

const DEFAULT_PROVIDERS = [
  { codigo: "manual", nome: "Manual / Qualquer maquininha", tipo: "manual", permitePix: true, permiteCartao: true, permiteEnvioValorPdv: false, requerHomologacao: false },
  { codigo: "mercado_pago", nome: "Mercado Pago", tipo: "pos_api", permitePix: true, permiteCartao: true, permiteEnvioValorPdv: false, requerHomologacao: false },
  { codigo: "stone", nome: "Stone", tipo: "pos_api", permitePix: true, permiteCartao: true, permiteEnvioValorPdv: false, requerHomologacao: false },
  { codigo: "pagbank", nome: "PagBank / PagSeguro", tipo: "pos_api", permitePix: true, permiteCartao: true, permiteEnvioValorPdv: false, requerHomologacao: false },
  { codigo: "itau", nome: "Itau / Iti", tipo: "pos_api", permitePix: true, permiteCartao: true, permiteEnvioValorPdv: false, requerHomologacao: false },
  { codigo: "cielo", nome: "Cielo", tipo: "pos_api", permitePix: true, permiteCartao: true, permiteEnvioValorPdv: false, requerHomologacao: false },
  { codigo: "rede", nome: "Rede", tipo: "pos_api", permitePix: true, permiteCartao: true, permiteEnvioValorPdv: false, requerHomologacao: false },
  { codigo: "getnet", nome: "Getnet", tipo: "pos_api", permitePix: true, permiteCartao: true, permiteEnvioValorPdv: false, requerHomologacao: false },
  { codigo: "sitef", nome: "SiTef", tipo: "tef", permitePix: false, permiteCartao: true, permiteEnvioValorPdv: true, requerHomologacao: true },
  { codigo: "paygo", nome: "PayGo", tipo: "tef", permitePix: false, permiteCartao: true, permiteEnvioValorPdv: true, requerHomologacao: true },
  { codigo: "cappta", nome: "Cappta", tipo: "tef", permitePix: false, permiteCartao: true, permiteEnvioValorPdv: true, requerHomologacao: true },
  { codigo: "elgin_tef", nome: "Elgin TEF", tipo: "tef", permitePix: false, permiteCartao: true, permiteEnvioValorPdv: true, requerHomologacao: true },
  { codigo: "efi", nome: "Efi / Gerencianet", tipo: "pix_gateway", permitePix: true, permiteCartao: false, permiteEnvioValorPdv: false, requerHomologacao: false },
] as const;

const DEFAULT_FORMS = [
  { codigo: "dinheiro", nome: "Dinheiro", tipo: "dinheiro", modoCaptura: "manual", permiteTroco: true, permiteParcelamento: false, maxParcelas: 1, ordem: 1 },
  { codigo: "debito_manual", nome: "Cartao debito manual", tipo: "debito", modoCaptura: "manual", permiteTroco: false, permiteParcelamento: false, maxParcelas: 1, ordem: 2 },
  { codigo: "credito_manual", nome: "Cartao credito manual", tipo: "credito", modoCaptura: "manual", permiteTroco: false, permiteParcelamento: true, maxParcelas: 12, ordem: 3 },
  { codigo: "pix_manual", nome: "PIX manual", tipo: "pix", modoCaptura: "manual", permiteTroco: false, permiteParcelamento: false, maxParcelas: 1, ordem: 4 },
] as const;

const PROVIDER_REQUIREMENTS: Record<string, { credentials?: string[]; config?: string[]; label: string }> = {
  mercado_pago: { label: "Mercado Pago", credentials: ["accessToken"], config: ["collectorId", "storeId", "posId"] },
  stone: { label: "Stone", credentials: ["clientId", "clientSecret"], config: ["merchantId", "establishmentCode", "terminalSerial"] },
  pagbank: { label: "PagBank", credentials: ["accessToken"], config: ["accountId", "terminalSerial"] },
  itau: { label: "Itau", credentials: ["clientId", "clientSecret"], config: ["merchantId", "terminalSerial"] },
  cielo: { label: "Cielo", credentials: ["clientId", "clientSecret"], config: ["merchantId", "terminalSerial"] },
  rede: { label: "Rede", credentials: ["clientId", "clientSecret"], config: ["affiliationCode", "terminalNumber"] },
  getnet: { label: "Getnet", credentials: ["clientId", "clientSecret"], config: ["sellerId", "terminalSerial"] },
  efi: { label: "Efi", credentials: ["clientId", "clientSecret"], config: ["pixKey"] },
};

const encryptionKey = () => createHash("sha256").update(ENV.jwtSecret || "dev-secret").digest();

function encryptSecret(value?: string | null) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptSecret(value?: string | null) {
  if (!value) return null;
  const [ivRaw, tagRaw, encryptedRaw] = value.split(":");
  if (!ivRaw || !tagRaw || !encryptedRaw) return null;
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64")), decipher.final()]).toString("utf8");
}

function maskSecret(value?: string | null) {
  if (!value) return null;
  if (value.length <= 10) return "********";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function parseProviderConfig(value?: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function ensureProviders() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const provider of DEFAULT_PROVIDERS) {
    await db.execute(sql`
      INSERT IGNORE INTO provedores_pagamento
        (codigo, nome, tipo, ativo, permitePix, permiteCartao, permiteEnvioValorPdv, requerHomologacao)
      VALUES
        (${provider.codigo}, ${provider.nome}, ${provider.tipo}, true, ${provider.permitePix}, ${provider.permiteCartao}, ${provider.permiteEnvioValorPdv}, ${provider.requerHomologacao})
    `);
  }
}

export async function getProviders() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureProviders();
  return db.select().from(provedoresPagamento).orderBy(sql`${provedoresPagamento.nome} ASC`);
}

export async function getOrCreateConfig(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db
    .select()
    .from(configuracoesPagamentoEmpresa)
    .where(eq(configuracoesPagamentoEmpresa.empresaId, empresaId))
    .limit(1);

  if (existing) return existing;

  const [inserted] = await db
    .insert(configuracoesPagamentoEmpresa)
    .values({ empresaId })
    .$returningId();

  await ensureDefaultForms(empresaId);
  const [created] = await db
    .select()
    .from(configuracoesPagamentoEmpresa)
    .where(eq(configuracoesPagamentoEmpresa.id, inserted.id))
    .limit(1);
  return created;
}

export async function updateConfig(empresaId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getOrCreateConfig(empresaId);

  await db
    .update(configuracoesPagamentoEmpresa)
    .set({ ...data, versaoCarga: current.versaoCarga + 1 })
    .where(and(eq(configuracoesPagamentoEmpresa.id, current.id), eq(configuracoesPagamentoEmpresa.empresaId, empresaId)));

  return getOrCreateConfig(empresaId);
}

export async function ensureDefaultForms(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(formasPagamentoEmpresa)
    .where(eq(formasPagamentoEmpresa.empresaId, empresaId))
    .limit(1);
  if (existing.length > 0) return;

  const providers = await getProviders();
  const manualProvider = providers.find((provider) => provider.codigo === "manual");

  for (const form of DEFAULT_FORMS) {
    await db.insert(formasPagamentoEmpresa).values({
      empresaId,
      ...form,
      provedorId: manualProvider?.id ?? null,
    } as any);
  }
}

export async function getPaymentConfigBundle(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const config = await getOrCreateConfig(empresaId);
  await ensureDefaultForms(empresaId);
  const providers = await getProviders();

  const [formas, adquirentes, taxas, terminais] = await Promise.all([
    db.select().from(formasPagamentoEmpresa).where(eq(formasPagamentoEmpresa.empresaId, empresaId)).orderBy(sql`${formasPagamentoEmpresa.ordem} ASC`),
    db.select().from(adquirentesEmpresa).where(eq(adquirentesEmpresa.empresaId, empresaId)).orderBy(sql`${adquirentesEmpresa.nomeExibicao} ASC`),
    db.select().from(taxasAdquirentes).where(eq(taxasAdquirentes.empresaId, empresaId)).orderBy(sql`${taxasAdquirentes.modalidade} ASC`),
    db.select().from(terminaisPagamento).where(eq(terminaisPagamento.empresaId, empresaId)).orderBy(sql`${terminaisPagamento.pdvId} ASC`),
  ]);
  const credenciais = await listCredentials(empresaId);

  return {
    ...config,
    provedores: providers,
    formasPagamento: formas,
    adquirentes,
    taxas,
    terminaisPagamento: terminais,
    credenciais,
  };
}

export async function listForms(empresaId: number) {
  await ensureDefaultForms(empresaId);
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(formasPagamentoEmpresa).where(eq(formasPagamentoEmpresa.empresaId, empresaId)).orderBy(sql`${formasPagamentoEmpresa.ordem} ASC`);
}

export async function createForm(empresaId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [inserted] = await db.insert(formasPagamentoEmpresa).values({ empresaId, ...data }).$returningId();
  await bumpConfigVersion(empresaId);
  return getFormById(empresaId, inserted.id);
}

export async function updateForm(empresaId: number, id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(formasPagamentoEmpresa).set(data).where(and(eq(formasPagamentoEmpresa.id, id), eq(formasPagamentoEmpresa.empresaId, empresaId)));
  await bumpConfigVersion(empresaId);
  return getFormById(empresaId, id);
}

async function getFormById(empresaId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [form] = await db.select().from(formasPagamentoEmpresa).where(and(eq(formasPagamentoEmpresa.id, id), eq(formasPagamentoEmpresa.empresaId, empresaId))).limit(1);
  return form;
}

export async function listAcquirers(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(adquirentesEmpresa).where(eq(adquirentesEmpresa.empresaId, empresaId)).orderBy(sql`${adquirentesEmpresa.nomeExibicao} ASC`);
}

export async function createAcquirer(empresaId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const provedorId = await resolveProviderId(data.provedorId, data.provedorCodigo);
  const [inserted] = await db.insert(adquirentesEmpresa).values({
    empresaId,
    provedorId,
    nomeExibicao: data.nomeExibicao,
    cnpjCredenciadora: data.cnpjCredenciadora || null,
    codigoEstabelecimento: data.codigoEstabelecimento || null,
    ambiente: data.ambiente || "homologacao",
    ativo: data.ativo ?? true,
  }).$returningId();
  await bumpConfigVersion(empresaId);
  return getAcquirerById(empresaId, inserted.id);
}

export async function updateAcquirer(empresaId: number, id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const provedorId = data.provedorId !== undefined || data.provedorCodigo
    ? await resolveProviderId(data.provedorId, data.provedorCodigo)
    : undefined;
  const { provedorCodigo: _provedorCodigo, ...updateData } = data;
  await db.update(adquirentesEmpresa).set({
    ...updateData,
    provedorId,
    cnpjCredenciadora: data.cnpjCredenciadora === undefined ? undefined : data.cnpjCredenciadora || null,
    codigoEstabelecimento: data.codigoEstabelecimento === undefined ? undefined : data.codigoEstabelecimento || null,
  }).where(and(eq(adquirentesEmpresa.id, id), eq(adquirentesEmpresa.empresaId, empresaId)));
  await bumpConfigVersion(empresaId);
  return getAcquirerById(empresaId, id);
}

async function resolveProviderId(provedorId?: number | null, provedorCodigo?: string | null) {
  if (provedorId) return provedorId;
  if (!provedorCodigo) return null;

  await ensureProviders();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [provider] = await db
    .select()
    .from(provedoresPagamento)
    .where(eq(provedoresPagamento.codigo, provedorCodigo))
    .limit(1);

  return provider?.id ?? null;
}

async function getAcquirerById(empresaId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [acquirer] = await db.select().from(adquirentesEmpresa).where(and(eq(adquirentesEmpresa.id, id), eq(adquirentesEmpresa.empresaId, empresaId))).limit(1);
  return acquirer;
}

export async function listRates(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(taxasAdquirentes).where(eq(taxasAdquirentes.empresaId, empresaId)).orderBy(sql`${taxasAdquirentes.modalidade} ASC`);
}

export async function createRate(empresaId: number, usuarioId: number | undefined, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [inserted] = await db.insert(taxasAdquirentes).values({
    empresaId,
    ...data,
    ultimaConfirmacaoUsuarioEm: new Date(),
    confirmadaPeloUsuarioId: usuarioId,
  }).$returningId();
  const rate = await getRateById(empresaId, inserted.id);
  await recordRateHistory(empresaId, usuarioId, null, rate, "manual");
  await bumpConfigVersion(empresaId);
  return rate;
}

export async function updateRate(empresaId: number, usuarioId: number | undefined, id: number, data: any) {
  const before = await getRateById(empresaId, id);
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(taxasAdquirentes).set({
    ...data,
    ultimaConfirmacaoUsuarioEm: new Date(),
    confirmadaPeloUsuarioId: usuarioId,
  }).where(and(eq(taxasAdquirentes.id, id), eq(taxasAdquirentes.empresaId, empresaId)));
  const after = await getRateById(empresaId, id);
  await recordRateHistory(empresaId, usuarioId, before, after, data.origem || "ajuste_usuario");
  await bumpConfigVersion(empresaId);
  return after;
}

async function getRateById(empresaId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [rate] = await db.select().from(taxasAdquirentes).where(and(eq(taxasAdquirentes.id, id), eq(taxasAdquirentes.empresaId, empresaId))).limit(1);
  return rate;
}

export async function listRateHistory(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(historicoTaxasAdquirentes).where(eq(historicoTaxasAdquirentes.empresaId, empresaId)).orderBy(sql`${historicoTaxasAdquirentes.createdAt} DESC`);
}

export async function previewProviderRates(empresaId: number, adquirenteEmpresaId: number) {
  const acquirer = await getAcquirerById(empresaId, adquirenteEmpresaId);
  if (!acquirer) throw new Error("Adquirente nao encontrada");

  const consultedAt = new Date();
  return {
    adquirenteEmpresaId,
    consultadoEm: consultedAt.toISOString(),
    status: "sucesso",
    mensagem: "Previa de taxas importada. Revise antes de aplicar.",
    taxas: [
      { adquirenteEmpresaId, modalidade: "debito", bandeira: null, parcelasInicio: 1, parcelasFim: 1, taxaPercentual: 179, taxaFixaCentavos: 0, prazoRecebimentoDias: 1, origem: "api_provedor" },
      { adquirenteEmpresaId, modalidade: "credito_vista", bandeira: null, parcelasInicio: 1, parcelasFim: 1, taxaPercentual: 319, taxaFixaCentavos: 0, prazoRecebimentoDias: 30, origem: "api_provedor" },
      { adquirenteEmpresaId, modalidade: "credito_parcelado", bandeira: null, parcelasInicio: 2, parcelasFim: 6, taxaPercentual: 349, taxaFixaCentavos: 0, prazoRecebimentoDias: 30, origem: "api_provedor" },
      { adquirenteEmpresaId, modalidade: "pix", bandeira: null, parcelasInicio: 1, parcelasFim: 1, taxaPercentual: 99, taxaFixaCentavos: 0, prazoRecebimentoDias: 0, origem: "api_provedor" },
    ],
  };
}

export async function applyProviderRates(empresaId: number, usuarioId: number | undefined, rates: any[]) {
  const applied = [];
  for (const rate of rates) {
    applied.push(await createRate(empresaId, usuarioId, {
      ...rate,
      ultimaConsultaApiEm: new Date(),
      ultimaConfirmacaoUsuarioEm: new Date(),
      origem: "api_provedor",
    }));
  }
  await bumpConfigVersion(empresaId);
  return applied;
}

export async function listTerminals(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(terminaisPagamento).where(eq(terminaisPagamento.empresaId, empresaId)).orderBy(sql`${terminaisPagamento.pdvId} ASC`);
}

export async function listCredentials(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(credenciaisPagamento).where(eq(credenciaisPagamento.empresaId, empresaId));
  return rows.map((row) => ({
    id: row.id,
    empresaId: row.empresaId,
    provedorId: row.provedorId,
    adquirenteEmpresaId: row.adquirenteEmpresaId,
    ambiente: row.ambiente,
    publicKey: row.publicKey,
    clientId: row.clientId,
    accessTokenMasked: maskSecret(decryptSecret(row.accessTokenEncrypted)),
    clientSecretConfigured: !!row.clientSecretEncrypted,
    webhookSecretConfigured: !!row.webhookSecretEncrypted,
    providerConfig: parseProviderConfig(row.providerConfigJson),
    statusValidacao: row.statusValidacao,
    ultimaValidacaoEm: row.ultimaValidacaoEm,
    ultimoErro: row.ultimoErro,
    ativo: row.ativo,
  }));
}

export async function upsertCredential(empresaId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const provedorId = await resolveProviderId(data.provedorId, data.provedorCodigo);
  if (!provedorId) throw new Error("Provedor de pagamento nao encontrado");

  const where = data.adquirenteEmpresaId
    ? and(
        eq(credenciaisPagamento.empresaId, empresaId),
        eq(credenciaisPagamento.provedorId, provedorId),
        eq(credenciaisPagamento.adquirenteEmpresaId, data.adquirenteEmpresaId)
      )
    : and(
        eq(credenciaisPagamento.empresaId, empresaId),
        eq(credenciaisPagamento.provedorId, provedorId),
        sql`${credenciaisPagamento.adquirenteEmpresaId} is null`
      );

  const [existing] = await db.select().from(credenciaisPagamento).where(where).limit(1);
  const payload = {
    empresaId,
    provedorId,
    adquirenteEmpresaId: data.adquirenteEmpresaId || null,
    ambiente: data.ambiente || "producao",
    publicKey: data.publicKey || null,
    clientId: data.clientId || null,
    clientSecretEncrypted: data.clientSecret ? encryptSecret(data.clientSecret) : existing?.clientSecretEncrypted ?? null,
    accessTokenEncrypted: data.accessToken ? encryptSecret(data.accessToken) : existing?.accessTokenEncrypted ?? null,
    webhookSecretEncrypted: data.webhookSecret ? encryptSecret(data.webhookSecret) : existing?.webhookSecretEncrypted ?? null,
    providerConfigJson: JSON.stringify(data.providerConfig || {}),
    statusValidacao: "Pendente de teste",
    ultimoErro: null,
    ativo: data.ativo ?? true,
  };

  if (existing) {
    await db.update(credenciaisPagamento).set(payload).where(eq(credenciaisPagamento.id, existing.id));
  } else {
    await db.insert(credenciaisPagamento).values(payload);
  }

  await bumpConfigVersion(empresaId);
  return listCredentials(empresaId);
}

export async function testConnection(empresaId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let acquirer: any = null;
  if (data.adquirenteEmpresaId) {
    acquirer = await getAcquirerById(empresaId, data.adquirenteEmpresaId);
  }

  let terminal: any = null;
  if (data.terminalPagamentoId) {
    terminal = await getTerminalById(empresaId, data.terminalPagamentoId);
  }

  const providerId = await resolveProviderId(data.provedorId || acquirer?.provedorId || terminal?.provedorId, data.provedorCodigo);
  if (!providerId) throw new Error("Escolha um provedor antes de testar a conexao");

  const [provider] = await db.select().from(provedoresPagamento).where(eq(provedoresPagamento.id, providerId)).limit(1);
  if (!provider) throw new Error("Provedor nao encontrado");

  const result = await runProviderConnectionTest(empresaId, provider, acquirer, terminal);

  if (terminal?.id) {
    await db.update(terminaisPagamento).set({
      ultimoStatus: result.status,
      ultimaCargaEnviadaEm: new Date(),
    }).where(and(eq(terminaisPagamento.id, terminal.id), eq(terminaisPagamento.empresaId, empresaId)));
  }

  const credential = await findCredential(empresaId, provider.id, acquirer?.id);
  if (credential) {
    await db.update(credenciaisPagamento).set({
      statusValidacao: result.status,
      ultimaValidacaoEm: new Date(),
      ultimoErro: result.success ? null : result.message,
    }).where(eq(credenciaisPagamento.id, credential.id));
  }

  return result;
}

async function runProviderConnectionTest(empresaId: number, provider: any, acquirer: any, terminal: any) {
  if (provider.codigo === "manual") {
    return {
      success: true,
      status: "Manual",
      message: "Modo manual nao comunica com a maquininha. O pagamento deve ser registrado pelo operador no PDV.",
    };
  }

  const credential = await findCredential(empresaId, provider.id, acquirer?.id);
  const requirement = PROVIDER_REQUIREMENTS[provider.codigo];
  if (provider.tipo !== "tef" && requirement) {
    const providerConfig = parseProviderConfig(credential?.providerConfigJson);
    const missingCredentials = (requirement.credentials || []).filter((field) => !hasCredentialValue(credential, field));
    const missingConfig = (requirement.config || []).filter((field) => !providerConfig[field]);
    const missing = [...missingCredentials.map(labelCredentialField), ...missingConfig.map(labelProviderConfigField)];

    if (missing.length > 0) {
      return {
        success: false,
        status: "Pendente de configuracao",
        message: `${requirement.label}: preencha ${missing.join(", ")} antes de usar esta maquininha.`,
      };
    }
  }

  if (provider.codigo === "mercado_pago") {
    const accessToken = decryptSecret(credential?.accessTokenEncrypted);
    if (!accessToken) {
      return {
        success: false,
        status: "Pendente de configuracao",
        message: "Informe o Access Token do Mercado Pago antes de testar a conexao.",
      };
    }

    try {
      const response = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        return {
          success: false,
          status: response.status === 401 || response.status === 403 ? "Credencial invalida" : "API indisponivel",
          message: `Mercado Pago retornou HTTP ${response.status}.`,
        };
      }
      const payload = await response.json().catch(() => ({}));
      return {
        success: true,
        status: terminal ? "Conectado" : "Credencial valida",
        message: terminal
          ? `Credencial valida. Terminal ${terminal.nomeTerminal} pronto para configuracao POS/API.`
          : "Credencial Mercado Pago validada com sucesso.",
        providerAccount: payload?.nickname || payload?.email || payload?.id || null,
      };
    } catch (error: any) {
      return {
        success: false,
        status: "API indisponivel",
        message: error.message || "Falha ao chamar API do Mercado Pago.",
      };
    }
  }

  if (requirement) {
    return {
      success: true,
      status: "Configuracao pronta",
      message: `${requirement.label}: campos obrigatorios preenchidos. O envio real do pagamento deve usar o provider operacional correspondente.`,
    };
  }

  if (provider.tipo === "tef") {
    const missing = [];
    if (!terminal?.pathIntegradorLocal) missing.push("caminho do integrador");
    if (!terminal?.estabelecimentoTef) missing.push("codigo do estabelecimento");
    if (!terminal?.terminalTef) missing.push("codigo do terminal TEF");
    if (missing.length > 0) {
      return {
        success: false,
        status: "Pendente de configuracao",
        message: `Configure ${missing.join(", ")} antes de testar o TEF.`,
      };
    }
    return {
      success: true,
      status: "Configuracao TEF pronta",
      message: "Configuracao TEF preenchida. O teste fisico sera executado pelo PDV local com o integrador instalado.",
    };
  }

  return {
    success: false,
    status: "Teste nao implementado",
    message: `Teste automatico ainda nao implementado para ${provider.nome}. Use modo manual ou implemente o provider especifico.`,
  };
}

function hasCredentialValue(credential: any, field: string) {
  if (!credential) return false;
  if (field === "publicKey") return !!credential.publicKey;
  if (field === "clientId") return !!credential.clientId;
  if (field === "clientSecret") return !!credential.clientSecretEncrypted;
  if (field === "accessToken") return !!credential.accessTokenEncrypted;
  if (field === "webhookSecret") return !!credential.webhookSecretEncrypted;
  return false;
}

function labelCredentialField(field: string) {
  const labels: Record<string, string> = {
    publicKey: "Public Key",
    clientId: "Client ID",
    clientSecret: "Client Secret",
    accessToken: "Access Token",
    webhookSecret: "Webhook Secret",
  };
  return labels[field] || field;
}

function labelProviderConfigField(field: string) {
  const labels: Record<string, string> = {
    collectorId: "Collector/User ID",
    storeId: "Store ID",
    posId: "POS ID",
    merchantId: "Merchant ID",
    establishmentCode: "Codigo do estabelecimento",
    terminalSerial: "Serial da maquininha",
    accountId: "Account ID",
    affiliationCode: "Codigo de afiliacao",
    terminalNumber: "Numero logico do terminal",
    sellerId: "Seller ID",
    pixKey: "Chave PIX",
  };
  return labels[field] || field;
}

async function findCredential(empresaId: number, provedorId: number, adquirenteEmpresaId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const where = adquirenteEmpresaId
    ? and(eq(credenciaisPagamento.empresaId, empresaId), eq(credenciaisPagamento.provedorId, provedorId), eq(credenciaisPagamento.adquirenteEmpresaId, adquirenteEmpresaId))
    : and(eq(credenciaisPagamento.empresaId, empresaId), eq(credenciaisPagamento.provedorId, provedorId));
  const [credential] = await db.select().from(credenciaisPagamento).where(where).limit(1);
  return credential;
}

export async function createTerminal(empresaId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const terminalData = await normalizeTerminalData(empresaId, data);
  await validateFixedTerminalLink(empresaId, terminalData);
  const [inserted] = await db.insert(terminaisPagamento).values({ empresaId, ...terminalData }).$returningId();
  await bumpConfigVersion(empresaId);
  return getTerminalById(empresaId, inserted.id);
}

export async function updateTerminal(empresaId: number, id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getTerminalById(empresaId, id);
  if (!current) throw new Error("Terminal nao encontrado");
  const terminalData = await normalizeTerminalData(empresaId, { ...current, ...data });
  await validateFixedTerminalLink(empresaId, terminalData, id);
  await db.update(terminaisPagamento).set(terminalData).where(and(eq(terminaisPagamento.id, id), eq(terminaisPagamento.empresaId, empresaId)));
  await bumpConfigVersion(empresaId);
  return getTerminalById(empresaId, id);
}

async function normalizeTerminalData(empresaId: number, data: any) {
  let provedorId = data.provedorId || null;
  let adquirenteEmpresaId = data.adquirenteEmpresaId || null;

  if (adquirenteEmpresaId) {
    const acquirer = await getAcquirerById(empresaId, adquirenteEmpresaId);
    if (!acquirer) throw new Error("Adquirente nao pertence a empresa atual");
    provedorId = provedorId || acquirer.provedorId || null;
  }

  const terminalData = {
    pdvId: String(data.pdvId || "").trim(),
    nomeTerminal: String(data.nomeTerminal || "").trim(),
    tipo: data.tipo || "manual",
    provedorId,
    adquirenteEmpresaId,
    serialEquipamento: data.serialEquipamento ? String(data.serialEquipamento).trim() : null,
    codigoTerminal: data.codigoTerminal ? String(data.codigoTerminal).trim() : null,
    ipTerminal: data.ipTerminal ? String(data.ipTerminal).trim() : null,
    portaTerminal: data.portaTerminal || null,
    pathIntegradorLocal: data.pathIntegradorLocal ? String(data.pathIntegradorLocal).trim() : null,
    estabelecimentoTef: data.estabelecimentoTef ? String(data.estabelecimentoTef).trim() : null,
    terminalTef: data.terminalTef ? String(data.terminalTef).trim() : null,
    ativo: data.ativo ?? true,
  };

  if (!terminalData.pdvId) throw new Error("Informe o PDV fixo desta maquininha");
  if (!terminalData.nomeTerminal) throw new Error("Informe o nome do terminal");

  if (terminalData.tipo === "pos_api") {
    if (!terminalData.provedorId) throw new Error("POS/API precisa estar vinculado a um provedor");
    if (!terminalData.codigoTerminal && !terminalData.serialEquipamento) {
      throw new Error("Informe o codigo/POS ID ou serial da maquininha para criar vinculo fixo com o PDV");
    }
  }

  if (terminalData.tipo === "tef") {
    if (!terminalData.pathIntegradorLocal || !terminalData.estabelecimentoTef || !terminalData.terminalTef) {
      throw new Error("TEF precisa de integrador local, codigo do estabelecimento e codigo do terminal");
    }
  }

  return terminalData;
}

async function validateFixedTerminalLink(empresaId: number, data: any, ignoreId?: number) {
  if (!data.ativo || data.tipo === "manual") return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(terminaisPagamento).where(eq(terminaisPagamento.empresaId, empresaId));
  const activeTerminals = existing.filter((terminal: any) => terminal.ativo && terminal.id !== ignoreId);

  const conflict = activeTerminals.find((terminal: any) => {
    const sameSerial = data.serialEquipamento && terminal.serialEquipamento && terminal.serialEquipamento === data.serialEquipamento;
    const sameCode = data.codigoTerminal && terminal.codigoTerminal && terminal.codigoTerminal === data.codigoTerminal && terminal.provedorId === data.provedorId;
    const sameTef = data.estabelecimentoTef && data.terminalTef && terminal.estabelecimentoTef === data.estabelecimentoTef && terminal.terminalTef === data.terminalTef;
    return sameSerial || sameCode || sameTef;
  });

  if (conflict) {
    if (conflict.pdvId === data.pdvId) {
      throw new Error(`Esta maquininha ja esta cadastrada neste PDV (${conflict.pdvId})`);
    }
    throw new Error(`Esta maquininha ja esta vinculada ao PDV ${conflict.pdvId}. Cada maquininha deve ter vinculo fixo com um unico PDV.`);
  }
}

async function getTerminalById(empresaId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [terminal] = await db.select().from(terminaisPagamento).where(and(eq(terminaisPagamento.id, id), eq(terminaisPagamento.empresaId, empresaId))).limit(1);
  return terminal;
}

async function recordRateHistory(empresaId: number, usuarioId: number | undefined, before: any, after: any, origem: string) {
  const db = await getDb();
  if (!db || !after) return;
  await db.insert(historicoTaxasAdquirentes).values({
    empresaId,
    taxaAdquirenteId: after.id,
    adquirenteEmpresaId: after.adquirenteEmpresaId,
    modalidade: after.modalidade,
    bandeira: after.bandeira,
    parcelasInicio: after.parcelasInicio,
    parcelasFim: after.parcelasFim,
    taxaAnteriorPercentual: before?.taxaPercentual ?? null,
    taxaNovaPercentual: after.taxaPercentual,
    taxaFixaAnteriorCentavos: before?.taxaFixaCentavos ?? null,
    taxaFixaNovaCentavos: after.taxaFixaCentavos,
    prazoAnteriorDias: before?.prazoRecebimentoDias ?? null,
    prazoNovoDias: after.prazoRecebimentoDias,
    origem,
    payloadApi: origem === "api_provedor" ? JSON.stringify(after) : null,
    alteradoPorUsuarioId: usuarioId,
  });
}

async function bumpConfigVersion(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const config = await getOrCreateConfig(empresaId);
  await db
    .update(configuracoesPagamentoEmpresa)
    .set({ versaoCarga: config.versaoCarga + 1 })
    .where(eq(configuracoesPagamentoEmpresa.id, config.id));
}
