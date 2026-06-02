import { describe, expect, it } from "@jest/globals";
import { validateProdutoFiscal } from "../../src/services/produto-fiscal.service";

const completeProduct = {
  codigo: "001",
  descricao: "Produto completo",
  unidade: "UN",
  ncm: "12345678",
  cest: "",
  origem: 0,
  cstIcms: "00",
  csosnIcms: "102",
  cfopPadraoVenda: "5102",
  pisCst: "49",
  cofinsCst: "49",
};

describe("ProdutoFiscalService", () => {
  it("aceita produto completo do Simples Nacional", () => {
    expect(validateProdutoFiscal(completeProduct, "SIMPLES_NACIONAL")).toEqual([]);
  });

  it("exige CSOSN para Simples Nacional", () => {
    const issues = validateProdutoFiscal({ ...completeProduct, csosnIcms: "" }, "SIMPLES_NACIONAL");

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "CSOSN_AUSENTE", field: "csosnIcms" }),
    ]));
  });

  it("exige CST ICMS fora do Simples Nacional", () => {
    const issues = validateProdutoFiscal({ ...completeProduct, cstIcms: "" }, "LUCRO_PRESUMIDO");

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "CST_ICMS_AUSENTE", field: "cstIcms" }),
    ]));
  });

  it("bloqueia os campos fiscais essenciais ausentes", () => {
    const issues = validateProdutoFiscal({
      codigo: "002",
      descricao: "Produto incompleto",
      unidade: "",
      origem: null,
    }, "SIMPLES_NACIONAL");
    const codes = issues.map((issue) => issue.code);

    expect(codes).toEqual(expect.arrayContaining([
      "NCM_INVALIDO",
      "CFOP_INVALIDO",
      "ORIGEM_INVALIDA",
      "UNIDADE_AUSENTE",
      "CSOSN_AUSENTE",
      "PIS_AUSENTE",
      "COFINS_AUSENTE",
    ]));
  });
});
