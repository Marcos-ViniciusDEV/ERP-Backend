import forge from "node-forge";

export type CertificateA1Info = {
  validade: Date;
  cnpj: string | null;
  razaoSocial: string | null;
};

export function inspectCertificateA1(buffer: Buffer, password?: string | null): CertificateA1Info {
  try {
    const asn1 = forge.asn1.fromDer(buffer.toString("binary"));
    const pkcs12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password || "");
    const bags = pkcs12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    const certificate = bags.find((bag) => bag.cert)?.cert;
    if (!certificate) throw new Error("Certificado A1 nao encontrado no arquivo");

    const subjectValues = certificate.subject.attributes
      .map((attribute) => String(attribute.value || ""))
      .filter(Boolean);
    const subjectText = subjectValues.join(" ");
    const cnpj = extractCnpj(subjectText);
    const commonName = certificate.subject.getField("CN")?.value;

    return {
      validade: certificate.validity.notAfter,
      cnpj,
      razaoSocial: commonName ? String(commonName).replace(/:\s*\d{14}\b/, "").trim() : null,
    };
  } catch (error: any) {
    throw new Error(`Certificado A1 invalido ou senha incorreta: ${error.message}`);
  }
}

function extractCnpj(value: string) {
  const matches = value.match(/\d{14}/g) || [];
  return matches.find((candidate) => isValidCnpj(candidate)) || null;
}

function isValidCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  return checkDigit(digits.slice(0, 12)) === digits[12] && checkDigit(digits.slice(0, 13)) === digits[13];
}

function checkDigit(base: string) {
  const weights = base.length === 12
    ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = base.split("").reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
  const remainder = sum % 11;
  return String(remainder < 2 ? 0 : 11 - remainder);
}
