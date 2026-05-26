const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "supervisorPassword",
  "senhaAtivacao",
  "certificadoDigitalSenha",
  "csc",
  "tokenAutenticacao",
]);

export function sanitizeResponse<T>(value: T, depth = 0): T {
  if (value === null || value === undefined) return value;
  if (depth > 8) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeResponse(item, depth + 1)) as T;
  }

  if (value instanceof Date) return value;

  if (typeof value === "object") {
    const safe: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      safe[key] = sanitizeResponse(nestedValue, depth + 1);
    }
    return safe as T;
  }

  return value;
}

export function sanitizeUser<T extends Record<string, unknown> | null | undefined>(user: T) {
  return sanitizeResponse(user);
}
