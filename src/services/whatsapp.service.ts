import { and, eq } from "drizzle-orm";
import { whatsappConfigs } from "../../drizzle/schema";
import { getDb } from "../libs/db";

type WhatsappConfigInput = {
  phoneNumber: string;
  defaultMessage?: string | null;
  businessHoursStart?: string | null;
  businessHoursEnd?: string | null;
  enabled?: boolean;
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export async function getConfig(empresaId: number) {
  const db = await getDb();
  if (!db) return null;

  const [config] = await db
    .select()
    .from(whatsappConfigs)
    .where(eq(whatsappConfigs.empresaId, empresaId))
    .limit(1);

  return config ?? null;
}

export async function upsertConfig(empresaId: number, data: WhatsappConfigInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedPhone = onlyDigits(data.phoneNumber);
  if (normalizedPhone.length < 10 || normalizedPhone.length > 20) {
    throw new Error("Numero de WhatsApp invalido");
  }

  const payload = {
    phoneNumber: normalizedPhone,
    defaultMessage: data.defaultMessage || null,
    businessHoursStart: data.businessHoursStart || null,
    businessHoursEnd: data.businessHoursEnd || null,
    enabled: data.enabled ?? true,
  };

  const [existing] = await db
    .select({ id: whatsappConfigs.id })
    .from(whatsappConfigs)
    .where(eq(whatsappConfigs.empresaId, empresaId))
    .limit(1);

  if (existing) {
    await db
      .update(whatsappConfigs)
      .set(payload)
      .where(and(eq(whatsappConfigs.id, existing.id), eq(whatsappConfigs.empresaId, empresaId)));
  } else {
    await db.insert(whatsappConfigs).values({ empresaId, ...payload });
  }

  return getConfig(empresaId);
}

export async function buildMessageLink(empresaId: number, phoneNumber?: string, message?: string) {
  const config = await getConfig(empresaId);
  const targetPhone = onlyDigits(phoneNumber || config?.phoneNumber || "");
  const text = message || config?.defaultMessage || "";

  if (!targetPhone) {
    throw new Error("Nenhum numero de WhatsApp configurado");
  }

  return {
    phoneNumber: targetPhone,
    message: text,
    url: `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`,
    enabled: config?.enabled ?? true,
  };
}

