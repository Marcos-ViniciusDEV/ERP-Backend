/**
 * @module ProdutoController
 * @description Controller para endpoints de Produtos
 *
 * Responsabilidades:
 * - Receber e validar requests
 * - Chamar services apropriados
 * - Formatar respostas
 * - Tratamento de erros
 */

import { Request, Response } from "express";
import * as produtoService from "../services/produto.service";
import * as kardexService from "../services/kardex.service";
import * as vendaService from "../services/venda.service";
import * as produtoImportacaoService from "../services/produto-importacao.service";
import type { CreateProdutoInput, UpdateProdutoInput } from "../models/produto.model";

/**
 * GET /produtos
 * Lista todos os produtos
 */
export async function list(req: Request, res: Response) {
  try {
    const produtos = await produtoService.list(req.empresaId!);
    res.json(produtos);
  } catch (error: any) {
    console.error("Error in ProdutoController.list:", error);
    res.status(500).json({ error: "Erro ao buscar produtos", details: error.message });
  }
}

/**
 * GET /produtos/fiscal/pendencias
 * Lista produtos que ainda nao estao prontos para emissao fiscal.
 */
export async function listFiscalPendencias(req: Request, res: Response) {
  try {
    res.json(await produtoService.listFiscalPendencias(req.empresaId!));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao buscar pendencias fiscais" });
  }
}

/**
 * GET /produtos/importacao/template
 * Baixa o template CSV para importacao inicial.
 */
export async function downloadImportTemplate(_req: Request, res: Response) {
  const csv = produtoImportacaoService.createProdutoImportTemplateCsv();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="template-importacao-produtos.csv"');
  res.send(csv);
}

/**
 * POST /produtos/importacao
 * Importa produtos a partir de um arquivo CSV ou XLSX.
 */
export async function importProdutos(req: Request, res: Response) {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Envie um arquivo CSV ou XLSX." });
      return;
    }
    const filename = decodeURIComponent(String(req.header("x-file-name") || ""));
    if (!filename) {
      res.status(400).json({ error: "Nome do arquivo nao informado." });
      return;
    }
    const result = await produtoImportacaoService.importProdutos(req.empresaId!, req.body, filename);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao importar produtos";
    res.status(400).json({ error: message });
  }
}

/**
 * GET /produtos/:id
 * Busca produto por ID
 */
export async function getById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const produto = await produtoService.getById(req.empresaId!, id);
    if (!produto) {
      res.status(404).json({ error: `Produto ${id} não encontrado` });
      return;
    }
    res.json(produto);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
}

/**
 * POST /produtos
 * Cria novo produto
 */
export async function create(req: Request, res: Response) {
  try {
    const data: CreateProdutoInput = req.body;
    const produto = await produtoService.create(req.empresaId!, data);
    res.status(201).json(produto);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar produto" });
  }
}

/**
 * PUT /produtos/:id
 * Atualiza produto existente
 */
export async function update(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const data: UpdateProdutoInput = { id, ...req.body };
    await produtoService.update(req.empresaId!, data);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error in ProdutoController.update:", error);
    res.status(400).json({ error: error.message || "Erro ao atualizar produto" });
  }
}

/**
 * DELETE /produtos/:id
 * Deleta produto
 */
export async function deleteProduto(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await produtoService.deleteProduto(req.empresaId!, id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error in ProdutoController.delete:", error);
    res.status(400).json({ error: error.message || "Erro ao deletar produto" });
  }
}

/**
 * PUT /produtos/:id/precos
 * Atualiza preços do produto
 */
export async function updatePrecos(req: Request, res: Response) {
  try {
    const produtoId = parseInt(req.params.id);
    const { precoCusto } = req.body;
    const result = await produtoService.updatePrecos(req.empresaId!, produtoId, precoCusto);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar preços" });
  }
}

/**
 * GET /produtos/estoque-baixo
 * Lista produtos com estoque abaixo do mínimo
 */
export async function produtosEstoqueBaixo(req: Request, res: Response) {
  try {
    const produtos = await produtoService.produtosEstoqueBaixo(req.empresaId!);
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar produtos com estoque baixo" });
  }
}

/**
 * POST /produtos/backfill-last-purchase
 * Preenche dados da última compra
 */
export async function backfillLastPurchaseData(req: Request, res: Response) {
  try {
    const result = await produtoService.backfillLastPurchaseData(req.empresaId!);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao preencher dados da última compra" });
  }
}

/**
 * GET /produtos/:id/movimentos
 * Lista movimentações de estoque do produto
 */
export async function getMovimentos(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const result = await kardexService.listByProduto(req.empresaId!, id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /produtos/:id/historico-vendas
 * Lista histórico de vendas do produto
 */
export async function getHistoricoVendas(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const result = await vendaService.getByProduto(req.empresaId!, id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
