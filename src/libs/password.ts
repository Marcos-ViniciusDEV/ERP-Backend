/**
 * @module Password
 * @description Utilitários para hash e verificação de senhas usando PBKDF2
 *
 * Utiliza o algoritmo PBKDF2 com SHA-256 e salt aleatório para armazenamento
 * seguro de senhas. Nunca armazene senhas em texto plano!
 *
 * Formato do hash: `{salt}:{hash}`
 * - Salt: 16 bytes aleatórios em hexadecimal
 * - Hash: PBKDF2 com 1000 iterações, 64 bytes de comprimento
 */

import crypto from "crypto";

/**
 * Gera hash de senha com salt aleatório usando PBKDF2
 *
 * @param password - Senha em texto plano
 * @returns String no formato "salt:hash" para armazenamento no banco
 *
 * @example
 * const hashedPassword = hashPassword("senha123");
 * // Retorna algo como: "a1b2c3d4....:e5f6g7h8...."
 * await db.insert(users).values({ email, password: hashedPassword });
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifica se uma senha corresponde ao hash armazenado
 *
 * @param password - Senha em texto plano fornecida pelo usuário
 * @param hash - Hash armazenado no formato "salt:hash"
 * @returns true se a senha está correta, false caso contrário
 *
 * @example
 * const user = await getUserByEmail(email);
 * const isValid = verifyPassword(passwordInput, user.password);
 * if (!isValid) throw new Error("Senha incorreta");
 */
export function verifyPassword(password: string, hash: string): boolean {
  const [salt, originalHash] = hash.split(":");
  if (!salt || !originalHash) {
    return false;
  }

  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");

  return verifyHash === originalHash;
}
