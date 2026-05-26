import { Request, Response } from "express";
import { and, desc, eq, like, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../libs/db";
import {
  assinaturas,
  empresas,
  licencas,
  pdvsAtivos,
  planosSaas,
  supportTickets,
  supportTutorials,
  users,
} from "../../drizzle/schema";
import { hashPassword } from "../libs/password";

const handleError = (res: Response, error: unknown) => {
  const message = error instanceof Error ? error.message : "Erro interno";
  console.error("[SaaS Controller]", error);
  res.status(500).json({ error: message });
};

const requireDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
};

const extractYouTubeVideoId = (url?: string | null) => {
  if (!url) return null;
  const value = String(url).trim();
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1].slice(0, 32);
  }
  return value.length <= 32 && /^[a-zA-Z0-9_-]+$/.test(value) ? value : null;
};

export const saasController = {
  async dashboard(_req: Request, res: Response) {
    try {
      const db = await requireDb();
      const [empresasList, assinaturasList, pdvsList, licencasList, planosList] =
        await Promise.all([
          db.select().from(empresas),
          db.select().from(assinaturas),
          db.select().from(pdvsAtivos),
          db.select().from(licencas),
          db.select().from(planosSaas),
        ]);

      const planoPorId = new Map(planosList.map((plano) => [plano.id, plano]));
      const ativas = empresasList.filter((empresa) => empresa.ativo && !empresa.bloqueado);
      const inadimplentes = assinaturasList.filter((assinatura) =>
        ["INADIMPLENTE", "SUSPENSA"].includes(assinatura.status)
      );
      const receitaMensal = assinaturasList
        .filter((assinatura) => assinatura.status === "ATIVA")
        .reduce((total, assinatura) => {
          const plano = planoPorId.get(assinatura.planoId);
          return total + (assinatura.valorMensal ?? plano?.precoMensal ?? 0);
        }, 0);

      const hoje = new Date();
      const trialExpirando = assinaturasList.filter((assinatura) => {
        if (assinatura.status !== "TRIAL" || !assinatura.dataProximoVencimento) return false;
        const diff = new Date(assinatura.dataProximoVencimento).getTime() - hoje.getTime();
        return diff >= 0 && diff <= 2 * 24 * 60 * 60 * 1000;
      }).length;

      const crescimentoPorMes = Array.from({ length: 6 }).map((_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - index));
        const month = date.getMonth();
        const year = date.getFullYear();
        return {
          mes: date.toLocaleDateString("pt-BR", { month: "short" }),
          total: empresasList.filter((empresa) => {
            const createdAt = new Date(empresa.createdAt);
            return createdAt.getMonth() === month && createdAt.getFullYear() === year;
          }).length,
        };
      });

      const distribuicaoPlanos = planosList.map((plano) => ({
        nome: plano.nome,
        total: assinaturasList.filter((assinatura) => assinatura.planoId === plano.id).length,
      }));

      res.json({
        totalEmpresas: empresasList.length,
        empresasAtivas: ativas.length,
        empresasInadimplentes: inadimplentes.length,
        receitaMensal,
        pdvsAtivos: pdvsList.filter((pdv) => pdv.ativo).length,
        licencasEmitidas: licencasList.length,
        trialExpirando,
        crescimentoPorMes,
        distribuicaoPlanos,
        ultimasEmpresas: empresasList
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5),
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listEmpresas(_req: Request, res: Response) {
    try {
      const db = await requireDb();
      const rows = await db
        .select({
          empresa: empresas,
          assinatura: assinaturas,
          plano: planosSaas,
        })
        .from(empresas)
        .leftJoin(assinaturas, eq(assinaturas.empresaId, empresas.id))
        .leftJoin(planosSaas, eq(planosSaas.id, assinaturas.planoId))
        .orderBy(desc(empresas.createdAt));

      const pdvs = await db.select().from(pdvsAtivos);
      res.json(rows.map((row) => ({
        ...row.empresa,
        assinatura: row.assinatura,
        planoSaas: row.plano,
        pdvsAtivos: pdvs.filter((pdv) => pdv.empresaId === row.empresa.id && pdv.ativo).length,
      })));
    } catch (error) {
      handleError(res, error);
    }
  },

  async getEmpresa(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const id = Number(req.params.id);
      const [empresa] = await db.select().from(empresas).where(eq(empresas.id, id)).limit(1);
      if (!empresa) {
        res.status(404).json({ error: "Empresa não encontrada" });
        return;
      }

      const [assinatura] = await db.select().from(assinaturas).where(eq(assinaturas.empresaId, id)).limit(1);
      const [plano] = assinatura
        ? await db.select().from(planosSaas).where(eq(planosSaas.id, assinatura.planoId)).limit(1)
        : [];
      const [usuarios, pdvs, licencasList] = await Promise.all([
        db.select().from(users).where(eq(users.empresaId, id)),
        db.select().from(pdvsAtivos).where(eq(pdvsAtivos.empresaId, id)),
        db.select().from(licencas).where(eq(licencas.empresaId, id)),
      ]);

      res.json({ ...empresa, assinatura, planoSaas: plano, usuarios, pdvs, licencas: licencasList });
    } catch (error) {
      handleError(res, error);
    }
  },

  async createEmpresa(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const {
        razaoSocial,
        nomeFantasia,
        cnpj,
        codigoAcesso,
        senhaAtivacao,
        planoId,
        limiteUsuarios,
        limitePdvs,
        limiteProdutos,
      } = req.body;

      if (!razaoSocial || !cnpj || !codigoAcesso || !senhaAtivacao) {
        res.status(400).json({ error: "razaoSocial, cnpj, codigoAcesso e senhaAtivacao são obrigatórios" });
        return;
      }

      const [result] = await db.insert(empresas).values({
        razaoSocial,
        nomeFantasia,
        cnpj,
        codigoAcesso: String(codigoAcesso).toUpperCase(),
        senhaAtivacao: hashPassword(senhaAtivacao),
        plano: "TRIAL",
        limiteUsuarios,
        limitePdvs,
        limiteProdutos,
        ativo: true,
      } as any);

      const empresaId = result.insertId;
      if (planoId) {
        const [plano] = await db.select().from(planosSaas).where(eq(planosSaas.id, Number(planoId))).limit(1);
        if (plano) {
          await db.insert(assinaturas).values({
            empresaId,
            planoId: plano.id,
            status: "TRIAL",
            valorMensal: plano.precoMensal,
            dataProximoVencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }
      }

      res.status(201).json({ success: true, empresaId });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateEmpresa(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const id = Number(req.params.id);
      const {
        razaoSocial,
        nomeFantasia,
        cnpj,
        codigoAcesso,
        ativo,
        limiteUsuarios,
        limitePdvs,
        limiteProdutos,
      } = req.body;

      await db.update(empresas).set({
        razaoSocial,
        nomeFantasia,
        cnpj,
        codigoAcesso,
        ativo,
        limiteUsuarios,
        limitePdvs,
        limiteProdutos,
      } as any).where(eq(empresas.id, id));

      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },

  async bloquearEmpresa(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const id = Number(req.params.id);
      const motivo = req.body.motivo ?? "Bloqueio administrativo";

      await db.update(empresas).set({
        bloqueado: true,
        motivoBloqueio: motivo,
        dataBloqueio: new Date(),
      }).where(eq(empresas.id, id));

      await db.update(assinaturas).set({ status: "SUSPENSA" }).where(eq(assinaturas.empresaId, id));
      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },

  async desbloquearEmpresa(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const id = Number(req.params.id);

      await db.update(empresas).set({
        bloqueado: false,
        motivoBloqueio: null,
        dataDesbloqueio: new Date(),
      }).where(eq(empresas.id, id));

      await db.update(assinaturas)
        .set({ status: "ATIVA" })
        .where(and(eq(assinaturas.empresaId, id), eq(assinaturas.status, "SUSPENSA")));

      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listPlanos(_req: Request, res: Response) {
    try {
      const db = await requireDb();
      res.json(await db.select().from(planosSaas).orderBy(desc(planosSaas.createdAt)));
    } catch (error) {
      handleError(res, error);
    }
  },

  async createPlano(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const [result] = await db.insert(planosSaas).values(req.body);
      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updatePlano(req: Request, res: Response) {
    try {
      const db = await requireDb();
      await db.update(planosSaas).set(req.body).where(eq(planosSaas.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },

  async deletePlano(req: Request, res: Response) {
    try {
      const db = await requireDb();
      await db.update(planosSaas).set({ ativo: false }).where(eq(planosSaas.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listAssinaturas(_req: Request, res: Response) {
    try {
      const db = await requireDb();
      const rows = await db
        .select({ assinatura: assinaturas, empresa: empresas, plano: planosSaas })
        .from(assinaturas)
        .leftJoin(empresas, eq(empresas.id, assinaturas.empresaId))
        .leftJoin(planosSaas, eq(planosSaas.id, assinaturas.planoId))
        .orderBy(desc(assinaturas.createdAt));
      res.json(rows);
    } catch (error) {
      handleError(res, error);
    }
  },

  async createAssinatura(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const [result] = await db.insert(assinaturas).values(req.body);
      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateAssinatura(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const id = Number(req.params.id);
      await db.update(assinaturas).set(req.body).where(eq(assinaturas.id, id));

      if (["INADIMPLENTE", "SUSPENSA"].includes(req.body.status)) {
        const [assinatura] = await db.select().from(assinaturas).where(eq(assinaturas.id, id)).limit(1);
        if (assinatura) {
          await db.update(empresas).set({
            bloqueado: true,
            motivoBloqueio: "Assinatura inadimplente ou suspensa",
            dataBloqueio: new Date(),
          }).where(eq(empresas.id, assinatura.empresaId));
        }
      }

      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listPdvs(_req: Request, res: Response) {
    try {
      const db = await requireDb();
      const rows = await db
        .select({ pdv: pdvsAtivos, empresa: empresas })
        .from(pdvsAtivos)
        .leftJoin(empresas, eq(empresas.id, pdvsAtivos.empresaId))
        .orderBy(desc(pdvsAtivos.createdAt));
      res.json(rows);
    } catch (error) {
      handleError(res, error);
    }
  },

  async updatePdv(req: Request, res: Response) {
    try {
      const db = await requireDb();
      await db.update(pdvsAtivos).set(req.body).where(eq(pdvsAtivos.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listLicencas(_req: Request, res: Response) {
    try {
      const db = await requireDb();
      const rows = await db
        .select({ licenca: licencas, empresa: empresas })
        .from(licencas)
        .leftJoin(empresas, eq(empresas.id, licencas.empresaId))
        .orderBy(desc(licencas.createdAt));
      res.json(rows);
    } catch (error) {
      handleError(res, error);
    }
  },

  async createLicenca(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const chave = `LIC-${nanoid(32).toUpperCase()}`;
      const [result] = await db.insert(licencas).values({
        empresaId: Number(req.body.empresaId),
        tipo: req.body.tipo,
        chave,
        dispositivoNome: req.body.dispositivoNome,
        dispositivoId: req.body.dispositivoId,
        dataExpiracao: req.body.dataExpiracao ? new Date(req.body.dataExpiracao) : null,
      });

      res.status(201).json({ success: true, id: result.insertId, chave });
    } catch (error) {
      handleError(res, error);
    }
  },

  async revogarLicenca(req: Request, res: Response) {
    try {
      const db = await requireDb();
      await db.update(licencas).set({ status: "REVOGADA" }).where(eq(licencas.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listSupportTickets(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const q = String(req.query.q ?? "").trim();
      const tipo = req.query.tipo ? String(req.query.tipo) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;

      const filters = [];
      if (tipo && tipo !== "TODOS") filters.push(eq(supportTickets.tipo, tipo as any));
      if (status && status !== "TODOS") filters.push(eq(supportTickets.status, status as any));
      if (q) {
        const pattern = `%${q}%`;
        filters.push(or(
          like(supportTickets.titulo, pattern),
          like(supportTickets.descricao, pattern),
          like(supportTickets.categoria, pattern),
          like(supportTickets.modulo, pattern)
        ));
      }

      const rows = await db
        .select({
          ticket: supportTickets,
          empresa: empresas,
          usuario: users,
        })
        .from(supportTickets)
        .leftJoin(empresas, eq(empresas.id, supportTickets.empresaId))
        .leftJoin(users, eq(users.id, supportTickets.usuarioId))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(supportTickets.createdAt));

      res.json(rows);
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateSupportTicket(req: Request, res: Response) {
    try {
      const db = await requireDb();
      await db
        .update(supportTickets)
        .set({
          status: req.body.status,
          prioridade: req.body.prioridade,
          resposta: req.body.resposta,
        })
        .where(eq(supportTickets.id, Number(req.params.id)));

      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listSupportTutorials(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const q = String(req.query.q ?? "").trim();
      const modulo = req.query.modulo ? String(req.query.modulo) : undefined;

      const filters = [];
      if (modulo && modulo !== "TODOS") filters.push(eq(supportTutorials.modulo, modulo));
      if (q) {
        const pattern = `%${q}%`;
        filters.push(or(
          like(supportTutorials.titulo, pattern),
          like(supportTutorials.descricao, pattern),
          like(supportTutorials.conteudo, pattern),
          like(supportTutorials.modulo, pattern)
        ));
      }

      const rows = await db
        .select({
          tutorial: supportTutorials,
          empresa: empresas,
        })
        .from(supportTutorials)
        .leftJoin(empresas, eq(empresas.id, supportTutorials.empresaId))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(supportTutorials.fixado), desc(supportTutorials.ordem), desc(supportTutorials.createdAt));

      res.json(rows);
    } catch (error) {
      handleError(res, error);
    }
  },

  async createSupportTutorial(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const youtubeVideoId = extractYouTubeVideoId(req.body.youtubeUrl ?? req.body.youtubeVideoId);
      if (!req.body.titulo || !youtubeVideoId) {
        res.status(400).json({ error: "Titulo e URL do YouTube sao obrigatorios" });
        return;
      }

      const [result] = await db.insert(supportTutorials).values({
        empresaId: req.body.empresaId ? Number(req.body.empresaId) : null,
        titulo: req.body.titulo,
        descricao: req.body.descricao,
        conteudo: req.body.conteudo || req.body.descricao || "Video tutorial",
        youtubeUrl: req.body.youtubeUrl,
        youtubeVideoId,
        modulo: req.body.modulo,
        tempoEstimado: req.body.tempoEstimado,
        fixado: Boolean(req.body.fixado),
        ordem: req.body.ordem ? Number(req.body.ordem) : 0,
        ativo: req.body.ativo ?? true,
      } as any);

      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateSupportTutorial(req: Request, res: Response) {
    try {
      const db = await requireDb();
      const youtubeVideoId = req.body.youtubeUrl || req.body.youtubeVideoId
        ? extractYouTubeVideoId(req.body.youtubeUrl ?? req.body.youtubeVideoId)
        : undefined;

      if ((req.body.youtubeUrl || req.body.youtubeVideoId) && !youtubeVideoId) {
        res.status(400).json({ error: "URL do YouTube invalida" });
        return;
      }

      await db
        .update(supportTutorials)
        .set({
          empresaId: req.body.empresaId ? Number(req.body.empresaId) : null,
          titulo: req.body.titulo,
          descricao: req.body.descricao,
          conteudo: req.body.conteudo || req.body.descricao || "Video tutorial",
          youtubeUrl: req.body.youtubeUrl,
          youtubeVideoId,
          modulo: req.body.modulo,
          tempoEstimado: req.body.tempoEstimado,
          fixado: req.body.fixado,
          ordem: req.body.ordem ? Number(req.body.ordem) : 0,
          ativo: req.body.ativo,
        } as any)
        .where(eq(supportTutorials.id, Number(req.params.id)));

      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },

  async deleteSupportTutorial(req: Request, res: Response) {
    try {
      const db = await requireDb();
      await db
        .update(supportTutorials)
        .set({ ativo: false })
        .where(eq(supportTutorials.id, Number(req.params.id)));

      res.json({ success: true });
    } catch (error) {
      handleError(res, error);
    }
  },
};
