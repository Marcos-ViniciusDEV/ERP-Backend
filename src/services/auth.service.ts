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
import { eq, and } from "drizzle-orm";
import type { User } from "../../drizzle/schema";
import { users, empresas } from "../../drizzle/schema";
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
  empresaId: number | null; // null = super_admin do SaaS
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

  const [empresa] = await db
    .select()
    .from(empresas)
    .where(and(eq(empresas.cnpj, cnpj), eq(empresas.ativo, true)))
    .limit(1);

  if (!empresa) {
    throw new Error("Empresa não encontrada com este CNPJ");
  }

  // Validamos a senha de acesso (senhaAtivacao)
  // No momento aceitamos texto plano ou se o usuário digitou o código de acesso
  if (empresa.senhaAtivacao !== senhaAcesso && empresa.codigoAcesso !== senhaAcesso) {
    throw new Error("Senha de acesso da empresa incorreta");
  }

  return empresa;
}

/**
 * Realiza login com identifier (id ou email), senha e código da empresa.
 * O codigoEmpresa é obrigatório para usuários normais.
 * Super admins (role=super_admin) não precisam informar empresa.
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
  if (user.role === "super_admin") {
    const token = await createToken(user);
    return { user, token };
  }

  // Usuários normais precisam informar o código da empresa
  if (!codigoEmpresa) {
    throw new Error("Código da empresa é obrigatório");
  }

  const empresaResult = await db
    .select()
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

  const token = await createToken(user);
  return { user, empresa, token };
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

  return {
    user,
    token,
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
