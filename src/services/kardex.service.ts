import { getMovimentacoesByProdutoId, createMovimentacaoEstoque } from "../legacy_db";
import { CreateKardexInput } from "../models/kardex.model";

export class KardexService {
  async listByProduto(produtoId: number) {
    return await getMovimentacoesByProdutoId(produtoId);
  }

  async create(data: CreateKardexInput, usuarioId: number) {
    return await createMovimentacaoEstoque({
      ...data,
      usuarioId,
    });
  }
}

export const kardexService = new KardexService();
