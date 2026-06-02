export type RegimeTributario = "SIMPLES_NACIONAL" | "LUCRO_PRESUMIDO" | "LUCRO_REAL";

export interface ProdutoFiscalInput {
  id?: number;
  codigo?: string | null;
  descricao?: string | null;
  unidade?: string | null;
  ncm?: string | null;
  cest?: string | null;
  origem?: number | null;
  cstIcms?: string | null;
  csosnIcms?: string | null;
  cfopPadraoVenda?: string | null;
  pisCst?: string | null;
  cofinsCst?: string | null;
}

export interface ProdutoFiscalIssue {
  code: string;
  field: string;
  message: string;
}

export function validateProdutoFiscal(product: ProdutoFiscalInput, regime: RegimeTributario): ProdutoFiscalIssue[] {
  const issues: ProdutoFiscalIssue[] = [];
  const label = `${product.codigo || "sem codigo"} - ${product.descricao || "produto"}`;

  if (!product.ncm || !/^\d{8}$/.test(product.ncm)) {
    issues.push({ code: "NCM_INVALIDO", field: "ncm", message: `Produto ${label} precisa de NCM com 8 digitos.` });
  }
  if (!product.cfopPadraoVenda || !/^\d{4}$/.test(product.cfopPadraoVenda)) {
    issues.push({ code: "CFOP_INVALIDO", field: "cfopPadraoVenda", message: `Produto ${label} precisa de CFOP padrao de venda com 4 digitos.` });
  }
  if (product.origem === null || product.origem === undefined || product.origem < 0 || product.origem > 8) {
    issues.push({ code: "ORIGEM_INVALIDA", field: "origem", message: `Produto ${label} precisa de origem fiscal entre 0 e 8.` });
  }
  if (!product.unidade?.trim()) {
    issues.push({ code: "UNIDADE_AUSENTE", field: "unidade", message: `Produto ${label} precisa de unidade comercial.` });
  }
  if (product.cest && !/^\d{7}$/.test(product.cest)) {
    issues.push({ code: "CEST_INVALIDO", field: "cest", message: `Produto ${label} possui CEST invalido. Informe 7 digitos ou deixe vazio quando nao aplicavel.` });
  }
  if (regime === "SIMPLES_NACIONAL" && !product.csosnIcms) {
    issues.push({ code: "CSOSN_AUSENTE", field: "csosnIcms", message: `Produto ${label} precisa de CSOSN ICMS para Simples Nacional.` });
  }
  if (regime !== "SIMPLES_NACIONAL" && !product.cstIcms) {
    issues.push({ code: "CST_ICMS_AUSENTE", field: "cstIcms", message: `Produto ${label} precisa de CST ICMS para o regime tributario configurado.` });
  }
  if (!product.pisCst) {
    issues.push({ code: "PIS_AUSENTE", field: "pisCst", message: `Produto ${label} precisa de CST de PIS.` });
  }
  if (!product.cofinsCst) {
    issues.push({ code: "COFINS_AUSENTE", field: "cofinsCst", message: `Produto ${label} precisa de CST de COFINS.` });
  }

  return issues;
}
