import { decryptSecret, encryptSecret } from "../../src/libs/secret-crypto";

describe("secret crypto", () => {
  it("encrypts and decrypts a secret with the versioned AES format", () => {
    const encrypted = encryptSecret("token-fiscal-secreto");

    expect(encrypted).toMatch(/^aes256gcm-v1:/);
    expect(encrypted).not.toContain("token-fiscal-secreto");
    expect(decryptSecret(encrypted)).toBe("token-fiscal-secreto");
  });

  it("reads the previous unversioned AES payment format", () => {
    const encrypted = encryptSecret("token-pagamento")!;
    const legacyPaymentEncrypted = encrypted.replace(/^aes256gcm-v1:/, "");

    expect(decryptSecret(legacyPaymentEncrypted)).toBe("token-pagamento");
  });

  it("reads legacy fiscal Base64 only when explicitly enabled", () => {
    const legacyFiscalEncrypted = Buffer.from("token-focus", "utf8").toString("base64");

    expect(decryptSecret(legacyFiscalEncrypted)).toBeNull();
    expect(decryptSecret(legacyFiscalEncrypted, { legacyBase64: true })).toBe("token-focus");
  });
});
