import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horario deve estar no formato HH:mm")
  .optional()
  .nullable();

export const upsertWhatsappConfigSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  defaultMessage: z.string().max(1000).optional().nullable(),
  businessHoursStart: timeSchema,
  businessHoursEnd: timeSchema,
  enabled: z.boolean().optional(),
});

export const sendWhatsappMessageSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  message: z.string().min(1).max(1000),
});

