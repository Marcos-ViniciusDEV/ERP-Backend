import { Request, Response } from "express";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../libs/db";
import {
  supportArticles,
  supportTickets,
  supportTutorials,
  whatsappConfigs,
} from "../../drizzle/schema";

const requireDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
};

const sendError = (res: Response, error: unknown) => {
  const message = error instanceof Error ? error.message : "Erro interno";
  console.error("[Support Controller]", error);
  res.status(500).json({ error: message });
};

const activeForTenant = (table: any, empresaId: number) =>
  or(eq(table.empresaId, empresaId), sql`${table.empresaId} is null`);

export const supportController = {
  async overview(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const empresaId = req.empresaId!;
      const [tickets, articles, tutorials] = await Promise.all([
        db.select().from(supportTickets).where(eq(supportTickets.empresaId, empresaId)),
        db.select().from(supportArticles).where(and(activeForTenant(supportArticles, empresaId), eq(supportArticles.ativo, true))),
        db.select().from(supportTutorials).where(and(activeForTenant(supportTutorials, empresaId), eq(supportTutorials.ativo, true))),
      ]);

      res.json({
        totalTickets: tickets.length,
        abertos: tickets.filter((ticket) => ticket.status === "ABERTO").length,
        bugs: tickets.filter((ticket) => ticket.tipo === "BUG").length,
        melhorias: tickets.filter((ticket) => ticket.tipo === "MELHORIA").length,
        artigos: articles.length,
        tutoriais: tutorials.length,
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  async search(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const empresaId = req.empresaId!;
      const q = String(req.query.q ?? "").trim();
      if (!q) {
        res.json([]);
        return;
      }

      const pattern = `%${q}%`;
      const [tickets, articles, tutorials] = await Promise.all([
        db
          .select()
          .from(supportTickets)
          .where(and(
            eq(supportTickets.empresaId, empresaId),
            or(
              like(supportTickets.titulo, pattern),
              like(supportTickets.descricao, pattern),
              like(supportTickets.categoria, pattern),
              like(supportTickets.modulo, pattern)
            )
          ))
          .limit(10),
        db
          .select()
          .from(supportArticles)
          .where(and(
            activeForTenant(supportArticles, empresaId),
            eq(supportArticles.ativo, true),
            or(
              like(supportArticles.titulo, pattern),
              like(supportArticles.resumo, pattern),
              like(supportArticles.conteudo, pattern),
              like(supportArticles.categoria, pattern),
              like(supportArticles.tags, pattern)
            )
          ))
          .limit(10),
        db
          .select()
          .from(supportTutorials)
          .where(and(
            activeForTenant(supportTutorials, empresaId),
            eq(supportTutorials.ativo, true),
            or(
              like(supportTutorials.titulo, pattern),
              like(supportTutorials.descricao, pattern),
              like(supportTutorials.conteudo, pattern),
              like(supportTutorials.modulo, pattern)
            )
          ))
          .limit(10),
      ]);

      res.json([
        ...tickets.map((item) => ({ tipoResultado: "CHAMADO", ...item })),
        ...articles.map((item) => ({ tipoResultado: "ARTIGO", ...item })),
        ...tutorials.map((item) => ({ tipoResultado: "TUTORIAL", ...item })),
      ]);
    } catch (error) {
      sendError(res, error);
    }
  },

  async listTickets(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const empresaId = req.empresaId!;
      const tipo = req.query.tipo ? String(req.query.tipo) : undefined;
      const where = tipo
        ? and(eq(supportTickets.empresaId, empresaId), eq(supportTickets.tipo, tipo as any))
        : eq(supportTickets.empresaId, empresaId);

      res.json(await db.select().from(supportTickets).where(where).orderBy(desc(supportTickets.createdAt)));
    } catch (error) {
      sendError(res, error);
    }
  },

  async createTicket(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const { titulo, descricao, tipo, categoria, prioridade, modulo, passosReproducao } = req.body;
      if (!titulo || !descricao) {
        res.status(400).json({ error: "titulo e descricao são obrigatórios" });
        return;
      }

      const [result] = await db.insert(supportTickets).values({
        empresaId: req.empresaId!,
        usuarioId: req.user?.id,
        tipo: tipo ?? "SUPORTE",
        titulo,
        descricao,
        categoria,
        prioridade: prioridade ?? "MEDIA",
        modulo,
        passosReproducao,
      });

      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      sendError(res, error);
    }
  },

  async updateTicket(req: Request, res: Response) {
    try {
      const db = await requireDb();
      await db
        .update(supportTickets)
        .set(req.body)
        .where(and(eq(supportTickets.id, Number(req.params.id)), eq(supportTickets.empresaId, req.empresaId!)));
      res.json({ success: true });
    } catch (error) {
      sendError(res, error);
    }
  },

  async listArticles(req: Request, res: Response) {
    try {
      const db = await requireDb();
      res.json(
        await db
          .select()
          .from(supportArticles)
          .where(and(activeForTenant(supportArticles, req.empresaId!), eq(supportArticles.ativo, true)))
          .orderBy(desc(supportArticles.createdAt))
      );
    } catch (error) {
      sendError(res, error);
    }
  },

  async createArticle(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const [result] = await db.insert(supportArticles).values({
        empresaId: req.empresaId!,
        ...req.body,
      });
      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      sendError(res, error);
    }
  },

  async updateArticle(req: Request, res: Response) {
    try {
      const db = await requireDb();
      await db
        .update(supportArticles)
        .set(req.body)
        .where(and(eq(supportArticles.id, Number(req.params.id)), activeForTenant(supportArticles, req.empresaId!)));
      res.json({ success: true });
    } catch (error) {
      sendError(res, error);
    }
  },

  async listTutorials(req: Request, res: Response) {
    try {
      const db = await requireDb();
      res.json(
        await db
          .select()
          .from(supportTutorials)
          .where(and(activeForTenant(supportTutorials, req.empresaId!), eq(supportTutorials.ativo, true)))
          .orderBy(desc(supportTutorials.fixado), desc(supportTutorials.ordem), desc(supportTutorials.createdAt))
      );
    } catch (error) {
      sendError(res, error);
    }
  },

  async createTutorial(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const [result] = await db.insert(supportTutorials).values({
        empresaId: req.empresaId!,
        ...req.body,
      });
      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      sendError(res, error);
    }
  },

  async updateTutorial(req: Request, res: Response) {
    try {
      const db = await requireDb();
      await db
        .update(supportTutorials)
        .set(req.body)
        .where(and(eq(supportTutorials.id, Number(req.params.id)), activeForTenant(supportTutorials, req.empresaId!)));
      res.json({ success: true });
    } catch (error) {
      sendError(res, error);
    }
  },

  async whatsappLink(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const [config] = await db
        .select()
        .from(whatsappConfigs)
        .where(and(eq(whatsappConfigs.empresaId, req.empresaId!), eq(whatsappConfigs.enabled, true)))
        .limit(1);

      const phone = req.body.phoneNumber ?? config?.phoneNumber;
      if (!phone) {
        res.status(400).json({ error: "Nenhum WhatsApp configurado para suporte" });
        return;
      }

      const message = req.body.message ?? `Olá, preciso de suporte no ERP. Empresa ID: ${req.empresaId}. Usuário: ${req.user?.name ?? "-"}.`;
      const cleanPhone = String(phone).replace(/\D/g, "");
      res.json({
        url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
      });
    } catch (error) {
      sendError(res, error);
    }
  },
};
