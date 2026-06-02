import { randomUUID } from "crypto";
import { and, eq, or } from "drizzle-orm";
import type { Request, Response } from "express";
import { z } from "zod";
import { assinaturas, checkoutAssinaturas, empresas, planosSaas } from "../../drizzle/schema";
import { getDb } from "../libs/db";
import { ENV } from "../libs/env";
import {
  buildPixPaymentPayload,
  buildCheckoutPaymentPayload,
  calculateCommercialCheckoutPrice,
  COMMERCIAL_PLANS,
  createMercadoPagoCheckoutPayment,
  createMercadoPagoPixPayment,
  extractMercadoPagoTransactionData,
  extractWebhookPaymentId,
  findCommercialPlan,
  getMercadoPagoPayment,
  mapMercadoPagoStatus,
  type MercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from "../services/mercado-pago-checkout.service";

const createCheckoutSchema = z.object({
  planoCodigo: z.string().trim().min(1).max(30),
  periodoMeses: z.union([z.literal(1), z.literal(6), z.literal(12)]).default(1),
  nomeResponsavel: z.string().trim().min(3).max(255),
  email: z.string().trim().email().max(320),
  telefone: z.string().trim().max(20).optional(),
  cpfCnpj: z.string().trim().max(20).optional(),
});

const createPaymentSchema = z.object({
  planoCodigo: z.string().trim().min(1).max(30),
  periodoMeses: z.union([z.literal(1), z.literal(6), z.literal(12)]),
  nomeResponsavel: z.string().trim().min(3).max(255),
  telefone: z.string().trim().max(20).optional(),
  payment: z.object({
    token: z.string().trim().optional(),
    issuer_id: z.union([z.string(), z.number()]).optional(),
    payment_method_id: z.string().trim().min(1).max(40),
    installments: z.union([z.string(), z.number()]).optional(),
    payer: z.object({
      email: z.string().trim().email().max(320),
      identification: z.object({
        type: z.string().trim().max(10).optional(),
        number: z.string().trim().max(30).optional(),
      }).optional(),
      address: z.object({
        zip_code: z.string().trim().max(12).optional(),
        street_name: z.string().trim().max(255).optional(),
        street_number: z.string().trim().max(30).optional(),
        neighborhood: z.string().trim().max(120).optional(),
        city: z.string().trim().max(120).optional(),
        federal_unit: z.string().trim().max(2).optional(),
      }).optional(),
    }),
  }),
});

async function requireDb() {
  const db = await getDb();
  if (!db) throw Object.assign(new Error("Database not available"), { status: 503 });
  return db;
}

function serializeCheckout(checkout: typeof checkoutAssinaturas.$inferSelect) {
  return {
    uuid: checkout.uuid,
    planoCodigo: checkout.planoCodigo,
    planoNome: checkout.planoNome,
    valorCentavos: checkout.valorCentavos,
    periodoMeses: checkout.periodoMeses,
    formaPagamento: checkout.formaPagamento,
    status: checkout.status,
    qrCodePix: checkout.qrCodePix,
    qrCodeBase64: checkout.qrCodeBase64,
    ticketUrl: checkout.ticketUrl,
    aprovadoEm: checkout.aprovadoEm,
  };
}

function paymentUpdate(payment: MercadoPagoPayment) {
  const status = mapMercadoPagoStatus(payment.status);
  const transactionData = extractMercadoPagoTransactionData(payment);
  return {
    mercadoPagoPaymentId: String(payment.id),
    mercadoPagoStatusDetail: payment.status_detail ?? null,
    status,
    qrCodePix: transactionData?.qr_code ?? null,
    qrCodeBase64: transactionData?.qr_code_base64 ?? null,
    ticketUrl: transactionData?.ticket_url ?? payment.transaction_details?.external_resource_url ?? null,
    payloadOriginal: JSON.stringify(payment),
    aprovadoEm: status === "APROVADO" ? new Date() : null,
  };
}

async function reconcilePayment(payment: MercadoPagoPayment) {
  const db = await requireDb();
  const update = paymentUpdate(payment);
  await db.update(checkoutAssinaturas)
    .set(update)
    .where(or(
      eq(checkoutAssinaturas.mercadoPagoPaymentId, String(payment.id)),
      eq(checkoutAssinaturas.uuid, String(payment.external_reference ?? "")),
    ));
  await activateApprovedCheckout(payment, update.status);
  return update.status;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function activateApprovedCheckout(payment: MercadoPagoPayment, status: ReturnType<typeof mapMercadoPagoStatus>) {
  if (status !== "APROVADO") return;

  const db = await requireDb();
  const [checkout] = await db.select().from(checkoutAssinaturas)
    .where(or(
      eq(checkoutAssinaturas.mercadoPagoPaymentId, String(payment.id)),
      eq(checkoutAssinaturas.uuid, String(payment.external_reference ?? "")),
    ))
    .limit(1);
  if (!checkout?.empresaId) return;

  const [plano] = await db.select().from(planosSaas)
    .where(eq(planosSaas.codigo, checkout.planoCodigo))
    .limit(1);
  if (!plano) {
    throw Object.assign(new Error(`Plano SaaS nao cadastrado: ${checkout.planoCodigo}`), { status: 503 });
  }

  const [assinatura] = await db.select().from(assinaturas)
    .where(eq(assinaturas.empresaId, checkout.empresaId))
    .limit(1);
  const checkoutMarker = `Checkout Mercado Pago ${checkout.uuid}`;
  if (assinatura?.observacao === checkoutMarker) return;

  const now = new Date();
  const periodoInicio = assinatura?.dataFim && assinatura.dataFim > now ? assinatura.dataFim : now;
  const dataFim = addMonths(periodoInicio, checkout.periodoMeses);
  const assinaturaData = {
    planoId: plano.id,
    status: "ATIVA" as const,
    dataFim,
    dataProximoVencimento: dataFim,
    valorMensal: Math.round(checkout.valorCentavos / checkout.periodoMeses),
    diasTrial: 0,
    observacao: checkoutMarker,
  };

  if (assinatura) {
    await db.update(assinaturas).set(assinaturaData).where(eq(assinaturas.id, assinatura.id));
  } else {
    await db.insert(assinaturas).values({
      empresaId: checkout.empresaId,
      ...assinaturaData,
    });
  }

  const planoEmpresa = checkout.planoCodigo === "starter" ? "STARTER" : "PROFESSIONAL";
  await db.update(empresas).set({
    plano: planoEmpresa,
    limiteUsuarios: plano.limiteUsuarios,
    limitePdvs: plano.limitePdvs,
    limiteProdutos: plano.limiteProdutos,
    bloqueado: false,
    motivoBloqueio: null,
    dataDesbloqueio: now,
  }).where(eq(empresas.id, checkout.empresaId));
}

async function findCheckoutByUuid(uuid: string, empresaId?: number) {
  const db = await requireDb();
  const [checkout] = await db.select().from(checkoutAssinaturas)
    .where(empresaId
      ? and(eq(checkoutAssinaturas.uuid, uuid), eq(checkoutAssinaturas.empresaId, empresaId))
      : eq(checkoutAssinaturas.uuid, uuid))
    .limit(1);
  return checkout;
}

export const checkoutController = {
  configuration(_req: Request, res: Response) {
    res.json({ publicKey: ENV.mercadoPagoPublicKey });
  },

  listPlans(_req: Request, res: Response) {
    res.json(COMMERCIAL_PLANS);
  },

  async createPix(req: Request, res: Response) {
    const input = createCheckoutSchema.parse(req.body);
    const plano = findCommercialPlan(input.planoCodigo);
    if (!plano) {
      res.status(400).json({ error: "Plano comercial invalido" });
      return;
    }

    const db = await requireDb();
    const uuid = randomUUID();
    const valorCentavos = calculateCommercialCheckoutPrice(plano, input.periodoMeses);
    await db.insert(checkoutAssinaturas).values({
      uuid,
      empresaId: req.empresaId!,
      usuarioId: req.user!.id || null,
      planoCodigo: plano.codigo,
      planoNome: plano.nome,
      nomeResponsavel: input.nomeResponsavel,
      email: input.email.toLowerCase(),
      telefone: input.telefone || null,
      cpfCnpj: input.cpfCnpj || null,
      valorCentavos,
      periodoMeses: input.periodoMeses,
      status: "PENDENTE",
    });

    try {
      const payload = buildPixPaymentPayload({
        checkoutUuid: uuid,
        planoNome: plano.nome,
        valorCentavos,
        periodoMeses: input.periodoMeses,
        nomeResponsavel: input.nomeResponsavel,
        email: input.email,
        cpfCnpj: input.cpfCnpj,
      });
      const payment = await createMercadoPagoPixPayment(uuid, payload);
      await db.update(checkoutAssinaturas).set(paymentUpdate(payment))
        .where(eq(checkoutAssinaturas.uuid, uuid));
      await activateApprovedCheckout(payment, mapMercadoPagoStatus(payment.status));
      const checkout = await findCheckoutByUuid(uuid, req.empresaId);
      res.status(201).json(checkout && serializeCheckout(checkout));
    } catch (error) {
      await db.update(checkoutAssinaturas).set({ status: "ERRO" })
        .where(eq(checkoutAssinaturas.uuid, uuid));
      throw error;
    }
  },

  async createPayment(req: Request, res: Response) {
    const input = createPaymentSchema.parse(req.body);
    const plano = findCommercialPlan(input.planoCodigo);
    if (!plano) {
      res.status(400).json({ error: "Plano comercial invalido" });
      return;
    }

    const db = await requireDb();
    const uuid = randomUUID();
    const valorCentavos = calculateCommercialCheckoutPrice(plano, input.periodoMeses);
    await db.insert(checkoutAssinaturas).values({
      uuid,
      empresaId: req.empresaId!,
      usuarioId: req.user!.id || null,
      planoCodigo: plano.codigo,
      planoNome: plano.nome,
      nomeResponsavel: input.nomeResponsavel,
      email: input.payment.payer.email.toLowerCase(),
      telefone: input.telefone || null,
      cpfCnpj: input.payment.payer.identification?.number || null,
      valorCentavos,
      periodoMeses: input.periodoMeses,
      formaPagamento: input.payment.payment_method_id,
      status: "PENDENTE",
    });

    try {
      const payload = buildCheckoutPaymentPayload({
        checkoutUuid: uuid,
        planoNome: plano.nome,
        valorCentavos,
        periodoMeses: input.periodoMeses,
        nomeResponsavel: input.nomeResponsavel,
        payment: input.payment,
      });
      const payment = await createMercadoPagoCheckoutPayment(uuid, payload);
      await db.update(checkoutAssinaturas).set(paymentUpdate(payment))
        .where(eq(checkoutAssinaturas.uuid, uuid));
      await activateApprovedCheckout(payment, mapMercadoPagoStatus(payment.status));
      const checkout = await findCheckoutByUuid(uuid, req.empresaId);
      res.status(201).json(checkout && serializeCheckout(checkout));
    } catch (error) {
      await db.update(checkoutAssinaturas).set({ status: "ERRO" })
        .where(eq(checkoutAssinaturas.uuid, uuid));
      throw error;
    }
  },

  async status(req: Request, res: Response) {
    let checkout = await findCheckoutByUuid(req.params.uuid, req.empresaId);
    if (!checkout) {
      res.status(404).json({ error: "Checkout nao encontrado" });
      return;
    }

    if (checkout.status === "PENDENTE" && checkout.mercadoPagoPaymentId) {
      const payment = await getMercadoPagoPayment(checkout.mercadoPagoPaymentId);
      await reconcilePayment(payment);
      checkout = await findCheckoutByUuid(req.params.uuid, req.empresaId);
    }
    res.json(checkout && serializeCheckout(checkout));
  },

  async mercadoPagoWebhook(req: Request, res: Response) {
    const paymentId = extractWebhookPaymentId({
      queryDataId: req.query["data.id"],
      bodyDataId: req.body?.data?.id,
      bodyId: req.body?.id,
    });
    const signatureValid = verifyMercadoPagoWebhookSignature({
      dataId: paymentId,
      requestId: req.header("x-request-id") ?? undefined,
      signature: req.header("x-signature") ?? undefined,
    });
    if (!signatureValid) {
      res.status(401).json({ error: "Assinatura do webhook invalida" });
      return;
    }
    if (!paymentId) {
      res.status(200).json({ received: true });
      return;
    }

    const payment = await getMercadoPagoPayment(paymentId);
    await reconcilePayment(payment);
    res.status(200).json({ received: true });
  },
};
