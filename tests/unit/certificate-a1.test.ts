import forge from "node-forge";
import { inspectCertificateA1 } from "../../src/libs/certificate-a1";

describe("inspectCertificateA1", () => {
  const password = "senha-segura";
  let p12Buffer: Buffer;

  beforeAll(() => {
    const keys = forge.pki.rsa.generateKeyPair(512);
    const certificate = forge.pki.createCertificate();
    certificate.publicKey = keys.publicKey;
    certificate.serialNumber = "01";
    certificate.validity.notBefore = new Date(Date.now() - 60_000);
    certificate.validity.notAfter = new Date(Date.now() + 86_400_000);
    certificate.setSubject([{ name: "commonName", value: "Empresa Teste:11222333000181" }]);
    certificate.setIssuer([{ name: "commonName", value: "Empresa Teste:11222333000181" }]);
    certificate.sign(keys.privateKey);

    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, certificate, password);
    p12Buffer = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), "binary");
  });

  it("extracts certificate metadata with the correct password", () => {
    const result = inspectCertificateA1(p12Buffer, password);

    expect(result.cnpj).toBe("11222333000181");
    expect(result.razaoSocial).toBe("Empresa Teste");
    expect(result.validade.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects an invalid password", () => {
    expect(() => inspectCertificateA1(p12Buffer, "senha-incorreta"))
      .toThrow("Certificado A1 invalido ou senha incorreta");
  });
});
