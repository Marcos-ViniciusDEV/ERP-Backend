import { describe, expect, it } from "@jest/globals";
import ExcelJS from "exceljs";
import {
  createProdutoImportTemplateCsv,
  normalizeProdutoImportRow,
  parseCsv,
  parseProdutoImportFile,
} from "../../src/services/produto-importacao.service";

describe("ProdutoImportacaoService", () => {
  it("gera template CSV com cabecalho e exemplo", () => {
    const template = createProdutoImportTemplateCsv();

    expect(template).toContain("codigo;descricao;preco_custo;preco_venda");
    expect(template).toContain("001;Produto exemplo;10,50;15,90");
  });

  it("interpreta CSV com separador ponto e virgula e moeda brasileira", () => {
    const rows = parseCsv(Buffer.from([
      "codigo;descricao;preco_custo;preco_venda;estoque;ncm;cfop_venda;aliquota_icms",
      "ABC-1;Cafe torrado;10,50;15,90;12;09012100;5102;18,00",
    ].join("\n")));

    const product = normalizeProdutoImportRow(rows[0]);

    expect(product).toMatchObject({
      codigo: "ABC-1",
      descricao: "Cafe torrado",
      precoCusto: 1050,
      precoVenda: 1590,
      estoque: 12,
      ncm: "09012100",
      cfopPadraoVenda: "5102",
      aliquotaIcms: 1800,
    });
  });

  it("mantem delimitador dentro de campo CSV entre aspas", () => {
    const rows = parseCsv(Buffer.from([
      "codigo;descricao;preco_custo;preco_venda",
      'ABC-2;"Cafe; pacote 500g";12,00;18,00',
    ].join("\n")));

    expect(normalizeProdutoImportRow(rows[0]).descricao).toBe("Cafe; pacote 500g");
  });

  it("interpreta planilha XLSX", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Produtos");
    worksheet.addRow(["codigo", "descricao", "preco_custo", "preco_venda"]);
    worksheet.addRow(["ABC-4", "Acucar cristal", "4,50", "6,90"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const rows = await parseProdutoImportFile(buffer, "produtos.xlsx");

    expect(normalizeProdutoImportRow(rows[0])).toMatchObject({
      codigo: "ABC-4",
      descricao: "Acucar cristal",
      precoCusto: 450,
      precoVenda: 690,
    });
  });

  it("rejeita produto sem descricao", () => {
    expect(() => normalizeProdutoImportRow({
      codigo: "ABC-3",
      descricao: "",
      preco_custo: "10,00",
      preco_venda: "15,00",
    })).toThrow("descricao obrigatoria");
  });
});
