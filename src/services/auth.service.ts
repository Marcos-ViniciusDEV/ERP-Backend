/**
 * Serviço de Autenticação JWT
 *
 * Gerencia autenticação de usuários usando JSON Web Tokens (JWT).
 * Utiliza a biblioteca 'jose' para geração e validação de tokens seguros.
 *
 * Funcionalidades:
 * - Criação de tokens JWT com payload do usuário
 * - Verificação e validação de tokens
 * - Renovação de tokens próximos da expiração
 * - Middleware para proteção de rotas
 *
 * Segurança:
 * - Algoritmo HS256 para assinatura
 * - Secret key configurável via variável de ambiente
 * - Tempo de expiração configurável (padrão: 7 dias)
 */

import { SignJWT, jwtVerify } from "jose";
import { eq, and, sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import type { User } from "../../drizzle/schema";
import { users, empresas, loginHistorico, refreshTokens } from "../../drizzle/schema";
import { getDb } from "../libs/db";
import { ENV } from "../libs/env";
import { hashPassword, verifyPassword } from "../libs/password";
import type { Request } from "express";

/**
 * Payload armazenado no token JWT
 */
export type TokenPayload = {
  userId: number;
  openId: string;
  email: string | null;
  name: string | null;
  role: string;
  empresaId: number | null; // null = trakto_admin do SaaS
  scope?: string | null;
};

/**
 * Request do Express estendido com informações do usuário autenticado
 */
export type AuthRequest = Request & {
  user?: User;
};

/**
 * Classe principal do serviço de autenticação
 */
/**
 * Obtém a chave secreta para assinatura de tokens
 * @throws Error se JWT_SECRET não estiver configurado
 */
function getTokenSecret() {
  const secret = ENV.jwtSecret;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const isDefaultSecret = secret.includes("change-in-production") || secret === "your-secret-key-change-in-production";
  if (ENV.isProduction && (isDefaultSecret || secret.length < 64)) {
    throw new Error("JWT_SECRET must be strong, unique and at least 64 characters long in production");
  }

  if (!ENV.isProduction && secret.length < 32) {
    console.warn("[Security] JWT_SECRET should have at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}

/**
 * Obtém o tempo de expiração configurado para tokens
 */
function getExpirationTime(): string {
  return ENV.jwtExpiresIn;
}

/**
 * Cria um token JWT para o usuário
 * @param user - Dados do usuário autenticado
 * @returns Token JWT assinado
 */
export async function createToken(user: User): Promise<string> {
  const secretKey = getTokenSecret();
  const expiresIn = getExpirationTime();

  return new SignJWT({
    userId: user.id,
    openId: user.openId,
    email: user.email,
    name: user.name,
    role: user.role,
    empresaId: user.empresaId ?? null,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function createCheckoutCompanyToken(empresa: {
  id: number;
  nomeFantasia: string | null;
  razaoSocial: string;
}) {
  const secretKey = getTokenSecret();

  return new SignJWT({
    userId: 0,
    openId: `checkout_empresa_${empresa.id}`,
    email: null,
    name: empresa.nomeFantasia || empresa.razaoSocial,
    role: "checkout_company",
    empresaId: empresa.id,
    scope: "checkout",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secretKey);
}

/**
 * Cria um token estavel para sincronizacao do PDV desktop.
 *
 * Diferente do token de login do usuario, este token nao recebe iat/exp.
 * Com o mesmo JWT_SECRET, empresaId e pdvId, o valor gerado permanece igual.
 */
export async function createStablePdvToken(input: {
  empresaId: number;
  pdvId: string;
  name?: string | null;
}): Promise<string> {
  const secretKey = getTokenSecret();
  const cleanPdvId = input.pdvId.trim();

  return new SignJWT({
    userId: 0,
    openId: `pdv_${input.empresaId}_${cleanPdvId}`,
    email: `pdv-${cleanPdvId}@empresa-${input.empresaId}.internal`,
    name: input.name || `PDV ${cleanPdvId}`,
    role: "pdv_operator",
    empresaId: input.empresaId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secretKey);
}

/**
 * Verifica e valida um token JWT
 * @param token - Token JWT a ser verificado
 * @returns Payload do token se válido, null se inválido ou expirado
 */
export async function verifyToken(token: string | null | undefined): Promise<TokenPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const secretKey = getTokenSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    return {
      userId: payload.userId as number,
      openId: payload.openId as string,
      email: payload.email as string | null,
      name: payload.name as string | null,
      role: payload.role as string,
      empresaId: (payload.empresaId as number | null) ?? null,
      scope: (payload.scope as string | null) ?? null,
    };
  } catch (error) {
    console.warn("[Auth] Token verification failed:", String(error));
    return null;
  }
}

/**
 * Extrai o token do header Authorization (Bearer token)
 * @param req - Request do Express
 * @returns Token extraído ou null se não encontrado
 */
export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7);
}

/**
 * Autentica a requisição e anexa o usuário ao objeto request
 * @param req - Request do Express (será modificado com req.user)
 * @returns Usuário autenticado ou null
 */
export async function authenticateRequest(req: AuthRequest): Promise<User | null> {
  const token = extractTokenFromRequest(req);
  const payload = await verifyToken(token);

  if (!payload) {
    return null;
  }

  const db = await getDb();
  if (!db) return null;

  let userResult = await db.select().from(users).where(eq(users.openId, payload.openId)).limit(1);

  let user = userResult[0];

  // Fallback: if user not found by openId, try by email
  if (!user && payload.email) {
    userResult = await db.select().from(users).where(eq(users.email, payload.email)).limit(1);
    user = userResult[0];
  }

  if (user) {
    req.user = user;
  }

  return user || null;
}

/**
 * Valida os dados da empresa (CNPJ e Senha de Acesso)
 */
export async function validateCompany(cnpj: string, senhaAcesso: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cnpjDigits = cnpj.replace(/\D/g, "");
  const [empresa] = await db
    .select({
      id: empresas.id,
      razaoSocial: empresas.razaoSocial,
      nomeFantasia: empresas.nomeFantasia,
      cnpj: empresas.cnpj,
      codigoAcesso: empresas.codigoAcesso,
      senhaAtivacao: empresas.senhaAtivacao,
      plano: empresas.plano,
      ativo: empresas.ativo,
      bloqueado: empresas.bloqueado,
      motivoBloqueio: empresas.motivoBloqueio,
    })
    .from(empresas)
    .where(and(
      sql`REPLACE(REPLACE(REPLACE(${empresas.cnpj}, '.', ''), '/', ''), '-', '') = ${cnpjDigits}`,
      eq(empresas.ativo, true)
    ))
    .limit(1);

  if (!empresa) {
    throw new Error("Empresa não encontrada com este CNPJ");
  }

  // Validamos a senha de acesso (senhaAtivacao)
  // Aceitamos texto plano, hash verificado ou se o usuário digitou o código de acesso diretamente
  const isPasswordValid = 
    verifyPassword(senhaAcesso, empresa.senhaAtivacao) ||
    empresa.senhaAtivacao === senhaAcesso ||
    empresa.codigoAcesso === senhaAcesso;

  if (!isPasswordValid) {
    throw new Error("Senha de acesso da empresa incorreta");
  }

  const { senhaAtivacao: _senhaAtivacao, ...safeEmpresa } = empresa;
  return safeEmpresa;
}

/**
 * Realiza login com identifier (id ou email), senha e código da empresa.
 * O codigoEmpresa é obrigatório para usuários normais.
 * Super admins (role=trakto_admin) não precisam informar empresa.
 */
export async function login(identifier: string, password: string, codigoEmpresa?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Busca por ID (numérico) ou email
  const isNumericId = /^\d+$/.test(identifier);
  let userResult;
  if (isNumericId) {
    userResult = await db.select().from(users).where(eq(users.id, parseInt(identifier))).limit(1);
  } else {
    userResult = await db.select().from(users).where(eq(users.email, identifier)).limit(1);
  }
  const user = userResult[0];

  if (!user || !user.password) {
    throw new Error("Usuário não encontrado ou sem senha configurada");
  }

  if (!verifyPassword(password, user.password)) {
    throw new Error("Senha incorreta");
  }

  // Super admin não precisa de empresa
  if (user.role === "trakto_admin") {
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
    const token = await createToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    return { user, token, refreshToken };
  }

  // Usuários normais precisam informar o código da empresa
  if (!codigoEmpresa) {
    throw new Error("Código da empresa é obrigatório");
  }

  const empresaResult = await db
    .select({
      id: empresas.id,
      razaoSocial: empresas.razaoSocial,
      nomeFantasia: empresas.nomeFantasia,
      cnpj: empresas.cnpj,
      codigoAcesso: empresas.codigoAcesso,
      plano: empresas.plano,
      ativo: empresas.ativo,
      bloqueado: empresas.bloqueado,
      motivoBloqueio: empresas.motivoBloqueio,
    })
    .from(empresas)
    .where(and(eq(empresas.codigoAcesso, codigoEmpresa), eq(empresas.ativo, true)))
    .limit(1);

  const empresa = empresaResult[0];
  if (!empresa) {
    throw new Error("Empresa não encontrada ou inativa");
  }

  // Verificar se o usuário pertence à empresa informada
  if (user.empresaId !== empresa.id) {
    throw new Error("Usuário não pertence a esta empresa");
  }

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  const token = await createToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  return { user, empresa, token, refreshToken };
}

export async function refreshSession(rawRefreshToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const [stored] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
  if (!stored || stored.revogadoEm || new Date(stored.expiraEm).getTime() <= Date.now()) {
    throw new Error("Refresh token invalido ou expirado");
  }

  const [user] = await db.select().from(users).where(eq(users.id, stored.usuarioId)).limit(1);
  if (!user) throw new Error("Usuario do refresh token nao encontrado");

  await db.update(refreshTokens).set({ revogadoEm: new Date() }).where(eq(refreshTokens.id, stored.id));
  return {
    user,
    token: await createToken(user),
    refreshToken: await issueRefreshToken(user.id),
  };
}

export async function revokeRefreshToken(rawRefreshToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(refreshTokens)
    .set({ revogadoEm: new Date() })
    .where(eq(refreshTokens.tokenHash, hashRefreshToken(rawRefreshToken)));
}

async function issueRefreshToken(usuarioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rawToken = randomBytes(48).toString("base64url");
  const expiraEm = new Date(Date.now() + ENV.refreshTokenDays * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    usuarioId,
    tokenHash: hashRefreshToken(rawToken),
    expiraEm,
  });
  return rawToken;
}

function hashRefreshToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function recordLoginAttempt(input: {
  usuarioId?: number | null;
  identificador: string;
  codigoEmpresa?: string | null;
  sucesso: boolean;
  ip?: string | null;
  userAgent?: string | null;
  motivo?: string | null;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(loginHistorico).values({
      usuarioId: input.usuarioId || null,
      identificador: input.identificador.slice(0, 320),
      codigoEmpresa: input.codigoEmpresa?.slice(0, 120) || null,
      sucesso: input.sucesso,
      ip: input.ip?.slice(0, 80) || null,
      userAgent: input.userAgent?.slice(0, 500) || null,
      motivo: input.motivo?.slice(0, 255) || null,
    });
  } catch (error) {
    console.warn("[Auth] Nao foi possivel registrar historico de login:", String(error));
  }
}

/**
 * Registra novo usuário
 */
export async function register(email: string, name: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existingUser.length > 0) {
    throw new Error("Este e-mail já está registrado");
  }

  const { nanoid } = await import("nanoid");
  const openId = `user_${nanoid()}`;
  const passwordHash = hashPassword(password);

  const [result] = await db.insert(users).values({
    openId,
    email,
    name,
    password: passwordHash,
    loginMethod: "local",
    role: "user",
    lastSignedIn: new Date(),
  });

  const newUserResult = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(result.insertId)))
    .limit(1);

  const user = newUserResult[0];
  const token = await createToken(user);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    user,
    token,
    refreshToken,
  };
}

/**
 * Busca um usuário pelo openId (OAuth)
 */
export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Busca um usuário pelo email
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Cria ou atualiza um usuário baseado no openId (upsert)
 */
export async function upsertUser(user: Partial<User> & { openId: string; email: string }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values = {
    openId: user.openId,
    email: user.email,
    name: user.name,
    loginMethod: user.loginMethod,
    role: user.role || (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    lastSignedIn: user.lastSignedIn || new Date(),
  };

  const updateSet: any = {
    email: user.email,
    lastSignedIn: user.lastSignedIn || new Date(),
  };

  if (user.name) updateSet.name = user.name;
  if (user.loginMethod) updateSet.loginMethod = user.loginMethod;
  if (user.password) updateSet.password = user.password;
  if (user.role) updateSet.role = user.role;
  else if (user.openId === ENV.ownerOpenId) updateSet.role = "admin";

  await db.insert(users).values(values as any).onDuplicateKeyUpdate({
    set: updateSet,
  });
}
