import { Request, Response } from "express";
import { ZodError } from "zod";
import * as whatsappService from "../services/whatsapp.service";
import { sendWhatsappMessageSchema, upsertWhatsappConfigSchema } from "../zod";

const sendZodError = (res: Response, error: ZodError) => {
  res.status(400).json({ error: error.issues });
};

export const getConfig = async (req: Request, res: Response) => {
  try {
    const result = await whatsappService.getConfig(req.empresaId!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const upsertConfig = async (req: Request, res: Response) => {
  try {
    const data = upsertWhatsappConfigSchema.parse(req.body);
    const result = await whatsappService.upsertConfig(req.empresaId!, data);
    res.json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      sendZodError(res, error);
      return;
    }
    res.status(500).json({ error: error.message });
  }
};

export const buildMessageLink = async (req: Request, res: Response) => {
  try {
    const data = sendWhatsappMessageSchema.partial().parse(req.body);
    const result = await whatsappService.buildMessageLink(
      req.empresaId!,
      data.phoneNumber,
      data.message
    );
    res.json(result);
  } catch (error: any) {
    if (error instanceof ZodError) {
      sendZodError(res, error);
      return;
    }
    res.status(500).json({ error: error.message });
  }
};

