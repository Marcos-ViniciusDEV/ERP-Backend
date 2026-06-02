import { createHmac, timingSafeEqual } from "crypto";
import { ENV } from "../libs/env";

const MERCADO_PAGO_API_URL = "https://api.mercadopago.com";

export type CommercialPlan = {
  codigo: string;
  nome: string;
  descricao: string;
  valorMensalCentavos: number;
  valorMensalPadraoCentavos: number;
  destaque?: boolean;
  beneficios: string[];
};

export const COMMERCIAL_PLANS: CommercialPlan[] = [
  {
    codigo: "starter",
    nome: "Starter",
    descricao: "Ideal para pequenos negocios que querem organizar a operacao.",
    valorMensalCentavos: 10000,
    valorMensalPadraoCentavos: 15000,
    beneficios: [
      "1 usuario ativo",
      "PDVs ilimitados",
      "Controle de estoque e financeiro",
      "Emissao de NFC-e preparada",
      "Suporte em horario comercial",
    ],
  },
  {
    codigo: "profissional",
    nome: "Profissional",
    descricao: "Para lojas em crescimento que precisam de mais autonomia.",
    valorMensalCentavos: 20000,
    valorMensalPadraoCentavos: 25000,
    destaque: true,
    beneficios: [
      "Usuarios ilimitados",
      "PDVs ilimitados",
      "PDV offline",
      "Coletor mobile para conferencia",
      "Gestao de estoque avancada",
      "Suporte via WhatsApp",
    ],
  },
];

export type CheckoutStatus = "PENDENTE" | "APROVADO" | "REJEITADO" | "CANCELADO" | "EXPIRADO" | "ERRO";

export type MercadoPagoPayment = {
  id: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  transaction_data?: {
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
  };
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  transaction_details?: {
    external_resource_url?: string;
  };
};

export function extractMercadoPagoTransactionData(payment: MercadoPagoPayment) {
  return payment.transaction_data ?? payment.point_of_interaction?.transaction_data;
}

export function findCommercialPlan(codigo: string) {
  return COMMERCIAL_PLANS.find((plan) => plan.codigo === codigo);
}

export const COMMERCIAL_PERIODS = [1, 6, 12] as const;

export function calculateCommercialCheckoutPrice(plan: Pick<CommercialPlan, "valorMensalCentavos" | "valorMensalPadraoCentavos">, periodoMeses: number) {
  if (!COMMERCIAL_PERIODS.includes(periodoMeses as typeof COMMERCIAL_PERIODS[number])) {
    throw Object.assign(new Error("Periodo comercial invalido"), { status: 400 });
  }
  const valorMensal = periodoMeses === 12 ? plan.valorMensalCentavos : plan.valorMensalPadraoCentavos;
  return valorMensal * periodoMeses;
}

export function mapMercadoPagoStatus(status?: string): CheckoutStatus {
  if (status === "approved") return "APROVADO";
  if (status === "rejected") return "REJEITADO";
  if (status === "cancelled" || status === "refunded" || status === "charged_back") return "CANCELADO";
  if (status === "expired") return "EXPIRADO";
  return "PENDENTE";
}

export function buildPixPaymentPayload(input: {
  checkoutUuid: string;
  planoNome: string;
  valorCentavos: number;
  periodoMeses?: number;
  nomeResponsavel: string;
  email: string;
  cpfCnpj?: string | null;
}) {
  const cpfCnpj = String(input.cpfCnpj ?? "").replace(/\D/g, "");
  const [firstName, ...lastNameParts] = input.nomeResponsavel.trim().split(/\s+/);
  return {
    transaction_amount: input.valorCentavos / 100,
    description: `Assinatura Trakto ERP - Plano ${input.planoNome} - ${input.periodoMeses ?? 1} mes(es)`,
    payment_method_id: "pix",
    external_reference: input.checkoutUuid,
    notification_url: ENV.mercadoPagoWebhookUrl || undefined,
    payer: {
      email: input.email.trim().toLowerCase(),
      first_name: firstName,
      last_name: lastNameParts.join(" ") || undefined,
      identification: cpfCnpj
        ? { type: cpfCnpj.length > 11 ? "CNPJ" : "CPF", number: cpfCnpj }
        : undefined,
    },
  };
}

export function buildCheckoutPaymentPayload(input: {
  checkoutUuid: string;
  planoNome: string;
  valorCentavos: number;
  periodoMeses: number;
  nomeResponsavel: string;
  payment: {
    token?: string;
    issuer_id?: string | number;
    payment_method_id: string;
    installments?: string | number;
    payer: {
      email: string;
      identification?: { type?: string; number?: string };
      address?: {
        zip_code?: string;
        street_name?: string;
        street_number?: string;
        neighborhood?: string;
        city?: string;
        federal_unit?: string;
      };
    };
  };
}) {
  const [firstName, ...lastNameParts] = input.nomeResponsavel.trim().split(/\s+/);
  return {
    transaction_amount: input.valorCentavos / 100,
    description: `Assinatura Trakto ERP - Plano ${input.planoNome} - ${input.periodoMeses} mes(es)`,
    external_reference: input.checkoutUuid,
    notification_url: ENV.mercadoPagoWebhookUrl || undefined,
    token: input.payment.token || undefined,
    issuer_id: input.payment.issuer_id || undefined,
    payment_method_id: input.payment.payment_method_id,
    installments: input.payment.installments ? Number(input.payment.installments) : undefined,
    payer: {
      email: input.payment.payer.email.trim().toLowerCase(),
      first_name: firstName,
      last_name: lastNameParts.join(" ") || undefined,
      identification: input.payment.payer.identification,
      address: input.payment.payer.address,
    },
  };
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!ENV.mercadoPagoAccessToken) {
    throw Object.assign(new Error("MERCADO_PAGO_ACCESS_TOKEN nao configurado"), { status: 503 });
  }

  const response = await fetch(`${MERCADO_PAGO_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ENV.mercadoPagoAccessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    let paymentMethodId: string | undefined;
    if (typeof init?.body === "string") {
      try {
        paymentMethodId = (JSON.parse(init.body) as { payment_method_id?: string }).payment_method_id;
      } catch {
        // Keep the upstream error even if a future caller sends a non-JSON body.
      }
    }
    const causes = Array.isArray(payload?.cause)
      ? payload.cause
        .map((cause: { code?: string | number; description?: string }) => cause.description || cause.code)
        .filter(Boolean)
      : [];
    const summary = payload?.message || payload?.error || `Mercado Pago retornou HTTP ${response.status}`;
    const message = causes.length > 0 ? `${summary}: ${causes.join(", ")}` : summary;
    const pixWithTestCredentials =
      paymentMethodId === "pix"
      && ENV.mercadoPagoAccessToken.startsWith("TEST-");
    throw Object.assign(new Error(message), {
      status: response.status >= 500 ? 502 : 422,
      publicMessage: pixWithTestCredentials
        ? "PIX indisponivel com as credenciais de teste atuais. Configure as credenciais de producao do Mercado Pago para gerar o QR Code."
        : response.status >= 500
        ? "Mercado Pago indisponivel no momento. Tente novamente em alguns instantes."
        : "O Mercado Pago recusou os dados do pagamento. Confira os campos e tente novamente.",
    });
  }
  return payload as T;
}

export function createMercadoPagoPixPayment(
  checkoutUuid: string,
  payload: ReturnType<typeof buildPixPaymentPayload>,
) {
  return mercadoPagoRequest<MercadoPagoPayment>("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": checkoutUuid },
    body: JSON.stringify(payload),
  });
}

export function createMercadoPagoCheckoutPayment(
  checkoutUuid: string,
  payload: ReturnType<typeof buildCheckoutPaymentPayload>,
) {
  return mercadoPagoRequest<MercadoPagoPayment>("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": checkoutUuid },
    body: JSON.stringify(payload),
  });
}

export function getMercadoPagoPayment(paymentId: string) {
  return mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);
}

export function extractWebhookPaymentId(input: {
  queryDataId?: unknown;
  bodyDataId?: unknown;
  bodyId?: unknown;
}) {
  const value = input.queryDataId ?? input.bodyDataId ?? input.bodyId;
  return value === undefined || value === null ? "" : String(value);
}

export function verifyMercadoPagoWebhookSignature(input: {
  dataId: string;
  requestId?: string;
  signature?: string;
  secret?: string;
}) {
  const secret = input.secret ?? ENV.mercadoPagoWebhookSecret;
  if (!secret) return true;
  if (!input.signature || !input.requestId || !input.dataId) return false;

  const parts = Object.fromEntries(
    input.signature.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(parts.v1, "hex");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
