import { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../libs/db";
import {
  assinaturas,
  empresas,
  licencas,
  pdvsAtivos,
  planosSaas,
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
};
