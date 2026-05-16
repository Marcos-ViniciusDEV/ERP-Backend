import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { getDb } from "../libs/db";
import { empresas, pdvsAtivos, users } from "../../drizzle/schema";
import { createToken } from "../services/auth.service";
import { verifyPassword, hashPassword } from "../libs/password";
import { nanoid } from "nanoid";
import { authenticate } from "../middleware/auth.middleware";
import { requireSuperAdmin } from "../middleware/tenant.middleware";

export const empresasRouter = Router();

/**
 * POST /empresas/pdv/ativar
 * Endpoint público chamado pelo PDV na primeira instalação.
 * Valida o código e senha da empresa e retorna um JWT de longa duração.
 */
empresasRouter.post("/pdv/ativar", async (req: Request, res: Response) => {
  try {
    const { codigoEmpresa, senhaAtivacao, pdvId, apelido } = req.body;

    if (!codigoEmpresa || !senhaAtivacao || !pdvId) {
      res.status(400).json({ error: "codigoEmpresa, senhaAtivacao e pdvId são obrigatórios" });
      return;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Buscar empresa pelo código de acesso
    const empresaResult = await db
      .select()
      .from(empresas)
      .where(and(eq(empresas.codigoAcesso, codigoEmpresa), eq(empresas.ativo, true)))
      .limit(1);

    const empresa = empresaResult[0];
    if (!empresa) {
      res.status(404).json({ error: "Empresa não encontrada ou inativa" });
      return;
    }

    // Validar senha de ativação
    if (!verifyPassword(senhaAtivacao, empresa.senhaAtivacao)) {
      res.status(401).json({ error: "Senha de ativação incorreta" });
      return;
    }

    // Verificar se o pdvId já está registrado para essa empresa
    const pdvExistente = await db
      .select()
      .from(pdvsAtivos)
      .where(and(eq(pdvsAtivos.empresaId, empresa.id), eq(pdvsAtivos.pdvId, pdvId)))
      .limit(1);

    if (pdvExistente.length > 0) {
      // Atualizar último acesso
      await db
        .update(pdvsAtivos)
        .set({ ultimoAcesso: new Date(), ativo: true })
        .where(and(eq(pdvsAtivos.empresaId, empresa.id), eq(pdvsAtivos.pdvId, pdvId)));
    } else {
      // Registrar novo PDV
      await db.insert(pdvsAtivos).values({
        empresaId: empresa.id,
        pdvId,
        apelido: apelido ?? `PDV - ${pdvId}`,
        ultimoAcesso: new Date(),
        ativo: true,
      });
    }

    // Criar um token especial para o PDV (sem vínculo com usuário individual)
    // Usamos um "usuário de sistema" gerado a partir da empresa
    const pdvUser = {
      id: 0, // ID simbólico para PDV
      empresaId: empresa.id,
      openId: `pdv_${empresa.id}_${pdvId}`,
      name: apelido ?? `PDV ${pdvId}`,
      email: `pdv-${pdvId}@empresa-${empresa.id}.internal`,
      password: null,
      supervisorPassword: null,
      loginMethod: "pdv_activation",
      role: "pdv_operator" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const token = await createToken(pdvUser as any);

    res.json({
      success: true,
      message: "PDV ativado com sucesso",
      token,
      empresa: {
        id: empresa.id,
        nomeFantasia: empresa.nomeFantasia,
        razaoSocial: empresa.razaoSocial,
        codigoAcesso: empresa.codigoAcesso,
      },
      pdvId,
    });
  } catch (error: any) {
    console.error("[PDV Ativação] Erro:", error);
    res.status(500).json({ error: error.message ?? "Erro interno" });
  }
});

/**
 * POST /empresas/trial
 * Registro de nova empresa no plano TRIAL via Landing Page.
 */
empresasRouter.post("/trial", async (req: Request, res: Response) => {
  try {
    const { name, companyName, cnpj, email, password } = req.body;

    if (!name || !companyName || !cnpj || !email || !password) {
      res.status(400).json({ error: "Todos os campos são obrigatórios" });
      return;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verificar se CNPJ ou Email já existem
    const cnpjExiste = await db.select().from(empresas).where(eq(empresas.cnpj, cnpj)).limit(1);
    if (cnpjExiste.length > 0) {
      res.status(400).json({ error: "CNPJ já cadastrado" });
      return;
    }
    const emailExiste = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (emailExiste.length > 0) {
      res.status(400).json({ error: "E-mail já cadastrado" });
      return;
    }

    const senhaHash = hashPassword(password);
    const codigoAcesso = `TRL-${nanoid(6).toUpperCase()}`;

    // 1. Criar Empresa
    const [empresaResult] = await db.insert(empresas).values({
      razaoSocial: companyName,
      nomeFantasia: companyName,
      cnpj,
      codigoAcesso,
      senhaAtivacao: senhaHash,
      plano: "TRIAL",
      ativo: true,
    });
    const empresaId = empresaResult.insertId;

    // 2. Criar Usuário Admin
    const [userResult] = await db.insert(users).values({
      empresaId,
      name,
      email,
      password: senhaHash,
      openId: `user_${nanoid(10)}`,
      role: "super_admin",
    });

    const user = {
      id: userResult.insertId,
      empresaId,
      name,
      email,
      role: "super_admin",
    };

    const token = await createToken(user as any);

    res.status(201).json({
      success: true,
      message: "Conta trial criada com sucesso!",
      token,
      user,
    });
  } catch (error: any) {
    console.error("[Trial Registration] Erro:", error);
    res.status(500).json({ error: error.message ?? "Erro interno" });
  }
});

/**
 * PUT /empresas/crm
 * Atualiza dados de CRM (Qualificação de Lead)
 */
empresasRouter.put("/crm", authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !user.empresaId) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const { tipoVarejo, faturamentoMensal } = req.body;

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(empresas)
      .set({ tipoVarejo, faturamentoMensal })
      .where(eq(empresas.id, user.empresaId));

    res.json({ success: true, message: "Dados atualizados com sucesso" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ========== ROTAS DE SUPER ADMIN ==========
 * Gerenciamento de empresas do SaaS (acesso restrito ao dono do sistema)
 */

// GET /empresas — lista todas as empresas
empresasRouter.get("/", authenticate, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const lista = await db
      .select({
        id: empresas.id,
        razaoSocial: empresas.razaoSocial,
        nomeFantasia: empresas.nomeFantasia,
        cnpj: empresas.cnpj,
        codigoAcesso: empresas.codigoAcesso,
        plano: empresas.plano,
        ativo: empresas.ativo,
        createdAt: empresas.createdAt,
      })
      .from(empresas);

    res.json(lista);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /empresas — cadastra nova empresa
empresasRouter.post("/", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { razaoSocial, nomeFantasia, cnpj, codigoAcesso, senhaAtivacao, plano } = req.body;

    if (!razaoSocial || !cnpj || !codigoAcesso || !senhaAtivacao) {
      res.status(400).json({ error: "razaoSocial, cnpj, codigoAcesso e senhaAtivacao são obrigatórios" });
      return;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { hashPassword } = await import("../libs/password");
    const senhaHash = hashPassword(senhaAtivacao);

    await db.insert(empresas).values({
      razaoSocial,
      nomeFantasia,
      cnpj,
      codigoAcesso: codigoAcesso.toUpperCase(),
      senhaAtivacao: senhaHash,
      plano: plano ?? "BASICO",
      ativo: true,
    });

    res.status(201).json({ success: true, message: "Empresa cadastrada com sucesso" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /empresas/:id — ativa ou desativa uma empresa
empresasRouter.patch("/:id", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(empresas).set({ ativo }).where(eq(empresas.id, Number(id)));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /empresas/pdvs — lista PDVs ativos de todas as empresas
empresasRouter.get("/pdvs", authenticate, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const lista = await db.select().from(pdvsAtivos);
    res.json(lista);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
