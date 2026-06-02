import { createHmac } from "crypto";
import {
  buildPixPaymentPayload,
  buildCheckoutPaymentPayload,
  calculateCommercialCheckoutPrice,
  extractMercadoPagoTransactionData,
  extractWebhookPaymentId,
  mapMercadoPagoStatus,
  verifyMercadoPagoWebhookSignature,
} from "../../src/services/mercado-pago-checkout.service";

describe("mercado pago checkout", () => {
  it("builds a PIX payment with a normalized payer and external reference", () => {
    expect(buildPixPaymentPayload({
      checkoutUuid: "checkout-123",
      planoNome: "Profissional",
      valorCentavos: 19900,
      nomeResponsavel: "Ana Souza",
      email: " ANA@EXEMPLO.COM ",
      cpfCnpj: "12.345.678/0001-90",
    })).toEqual(expect.objectContaining({
      transaction_amount: 199,
      payment_method_id: "pix",
      external_reference: "checkout-123",
      payer: {
        email: "ana@exemplo.com",
        first_name: "Ana",
        last_name: "Souza",
        identification: { type: "CNPJ", number: "12345678000190" },
      },
    }));
  });

  it("maps Mercado Pago statuses to the commercial checkout", () => {
    expect(mapMercadoPagoStatus("approved")).toBe("APROVADO");
    expect(mapMercadoPagoStatus("rejected")).toBe("REJEITADO");
    expect(mapMercadoPagoStatus("cancelled")).toBe("CANCELADO");
    expect(mapMercadoPagoStatus("expired")).toBe("EXPIRADO");
    expect(mapMercadoPagoStatus("in_process")).toBe("PENDENTE");
  });

  it("calculates only supported commercial subscription periods", () => {
    const starter = { valorMensalCentavos: 10000, valorMensalPadraoCentavos: 15000 };
    const profissional = { valorMensalCentavos: 20000, valorMensalPadraoCentavos: 25000 };
    expect(calculateCommercialCheckoutPrice(starter, 1)).toBe(15000);
    expect(calculateCommercialCheckoutPrice(starter, 6)).toBe(90000);
    expect(calculateCommercialCheckoutPrice(starter, 12)).toBe(120000);
    expect(calculateCommercialCheckoutPrice(profissional, 1)).toBe(25000);
    expect(calculateCommercialCheckoutPrice(profissional, 6)).toBe(150000);
    expect(calculateCommercialCheckoutPrice(profissional, 12)).toBe(240000);
    expect(() => calculateCommercialCheckoutPrice(starter, 3)).toThrow("Periodo comercial invalido");
  });

  it("builds a server-priced card payment from the tokenized Brick payload", () => {
    expect(buildCheckoutPaymentPayload({
      checkoutUuid: "checkout-card-123",
      planoNome: "Starter",
      valorCentavos: 9900,
      periodoMeses: 6,
      nomeResponsavel: "Joao Silva",
      payment: {
        token: "card-token-generated-by-mercado-pago",
        issuer_id: "123",
        payment_method_id: "master",
        installments: "2",
        payer: { email: " JOAO@EXEMPLO.COM " },
      },
    })).toEqual(expect.objectContaining({
      transaction_amount: 99,
      description: "Assinatura Trakto ERP - Plano Starter - 6 mes(es)",
      external_reference: "checkout-card-123",
      token: "card-token-generated-by-mercado-pago",
      payment_method_id: "master",
      installments: 2,
      payer: expect.objectContaining({
        email: "joao@exemplo.com",
        first_name: "Joao",
        last_name: "Silva",
      }),
    }));
  });

  it("validates the Mercado Pago webhook HMAC manifest", () => {
    const secret = "checkout-webhook-secret";
    const manifest = "id:999999;request-id:req-123;ts:1704908010;";
    const signature = createHmac("sha256", secret).update(manifest).digest("hex");

    expect(verifyMercadoPagoWebhookSignature({
      dataId: "999999",
      requestId: "req-123",
      signature: `ts=1704908010,v1=${signature}`,
      secret,
    })).toBe(true);
    expect(verifyMercadoPagoWebhookSignature({
      dataId: "999999",
      requestId: "req-123",
      signature: "ts=1704908010,v1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      secret,
    })).toBe(false);
  });

  it("extracts the payment id from query or body notifications", () => {
    expect(extractWebhookPaymentId({ queryDataId: "query-id", bodyDataId: "body-id" })).toBe("query-id");
    expect(extractWebhookPaymentId({ bodyDataId: 123 })).toBe("123");
  });

  it("reads PIX QR data from point of interaction responses", () => {
    expect(extractMercadoPagoTransactionData({
      id: "payment-123",
      point_of_interaction: {
        transaction_data: {
          qr_code: "pix-copy-and-paste",
          qr_code_base64: "base64-image",
          ticket_url: "https://example.com/pix",
        },
      },
    })).toEqual({
      qr_code: "pix-copy-and-paste",
      qr_code_base64: "base64-image",
      ticket_url: "https://example.com/pix",
    });
  });
});
