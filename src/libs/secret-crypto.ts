import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { ENV } from "./env";

const PREFIX = "aes256gcm-v1";

function encryptionKey() {
  return createHash("sha256")
    .update(ENV.secretsEncryptionKey || ENV.jwtSecret)
    .digest();
}

export function encryptSecret(value?: string | null) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(value?: string | null, options: { legacyBase64?: boolean } = {}) {
  if (!value) return null;

  const parts = value.split(":");
  const encryptedParts = parts[0] === PREFIX ? parts.slice(1) : parts;
  if (encryptedParts.length === 3) {
    const [ivRaw, tagRaw, encryptedRaw] = encryptedParts;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64")), decipher.final()]).toString("utf8");
  }

  if (options.legacyBase64) {
    return Buffer.from(value, "base64").toString("utf8");
  }

  return null;
}
