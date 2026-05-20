import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "../libs/db";
import { producao, receitas, materiais, produtos, movimentacoesEstoque } from "../../drizzle/schema";

export const productionService = {
  /**
   * Preview a production before confirming.
   * Returns cost breakdown, total cost, and stock availability.
   */
  async preview(empresaId: number, produtoId: number, quantidade: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 1. Buscar receita do produto
    const productRecipes = await db
      .select({
        id: receitas.id,
        materialId: receitas.materialId,
        quantidade: receitas.quantidade,
        materialNome: materiais.nome,
        materialUnidade: materiais.unidade,
        custoUnitario: materiais.custoUnitario,
        estoqueDisponivel: materiais.estoque,
      })
      .from(receitas)
      .innerJoin(materiais, eq(receitas.materialId, materiais.id))
      .where(eq(receitas.produtoId, produtoId));

    if (productRecipes.length === 0) {
      throw new Error("Este produto não possui ficha técnica (receita). Cadastre os ingredientes primeiro.");
    }

    // 2. Calcular consumo e custos
    const ingredientes = productRecipes.map(recipe => {
      const consumoTotal = recipe.quantidade * quantidade;
      const custoTotal = Math.round((recipe.custoUnitario / 1) * (consumoTotal / 1)); // custoUnitario já em centavos por unidade
      const estoqueInsuficiente = recipe.estoqueDisponivel < consumoTotal;

      return {
        materialId: recipe.materialId,
        materialNome: recipe.materialNome,
        materialUnidade: recipe.materialUnidade,
        quantidadePorUnidade: recipe.quantidade,
        consumoTotal,
        custoUnitario: recipe.custoUnitario,
        custoTotal,
        estoqueDisponivel: recipe.estoqueDisponivel,
        estoqueInsuficiente,
      };
    });

    const custoTotalProducao = ingredientes.reduce((sum, i) => sum + i.custoTotal, 0);
    const custoPorUnidade = Math.round(custoTotalProducao / quantidade);
    const temEstoqueSuficiente = ingredientes.every(i => !i.estoqueInsuficiente);

    return {
      produtoId,
      quantidade,
      ingredientes,
      custoTotalProducao,
      custoPorUnidade,
      temEstoqueSuficiente,
      margemSugerida30: Math.round(custoPorUnidade * 1.3), // 30% de margem
      margemSugerida50: Math.round(custoPorUnidade * 1.5), // 50% de margem
    };
  },

  /**
   * Register a production: deduct materials, add product stock, record in Kardex.
   */
  async registerProduction(empresaId: number, data: {
    produtoId: number;
    quantidade: number;
    observacao?: string;
    usuarioId?: number;
  }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db.transaction(async (tx) => {
      // 1. Verificar que o produto existe e pertence à empresa
      const [produto] = await tx.select().from(produtos)
        .where(and(eq(produtos.id, data.produtoId), eq(produtos.empresaId, empresaId)))
        .limit(1);
      if (!produto) throw new Error("Produto não encontrado");

      // 2. Buscar receita
      const productRecipes = await tx
        .select({
          materialId: receitas.materialId,
          quantidade: receitas.quantidade,
          custoUnitario: materiais.custoUnitario,
          estoqueDisponivel: materiais.estoque,
          materialNome: materiais.nome,
        })
        .from(receitas)
        .innerJoin(materiais, eq(receitas.materialId, materiais.id))
        .where(eq(receitas.produtoId, data.produtoId));

      if (productRecipes.length === 0) {
        throw new Error("Este produto não possui ficha técnica (receita).");
      }

      // 3. Verificar estoque de insumos e calcular custo
      let custoTotal = 0;
      for (const recipe of productRecipes) {
        const consumo = recipe.quantidade * data.quantidade;
        if (recipe.estoqueDisponivel < consumo) {
          throw new Error(
            `Estoque insuficiente de "${recipe.materialNome}". ` +
            `Necessário: ${consumo}, Disponível: ${recipe.estoqueDisponivel}`
          );
        }
        custoTotal += Math.round((recipe.custoUnitario / 1) * (consumo / 1));
      }

      // 4. Baixar estoque dos materiais/insumos
      for (const recipe of productRecipes) {
        const amountToDeduct = recipe.quantidade * data.quantidade;
        await tx
          .update(materiais)
          .set({ estoque: sql`${materiais.estoque} - ${amountToDeduct}` })
          .where(eq(materiais.id, recipe.materialId));
      }

      // 5. Dar entrada no estoque do produto final
      const saldoAnterior = produto.estoque || 0;
      const saldoAtual = saldoAnterior + data.quantidade;
      await tx
        .update(produtos)
        .set({ estoque: saldoAtual })
        .where(and(eq(produtos.id, data.produtoId), eq(produtos.empresaId, empresaId)));

      // 6. Registrar movimentação no Kardex
      await tx.insert(movimentacoesEstoque).values({
        empresaId,
        produtoId: data.produtoId,
        tipo: "ENTRADA_NFE", // Usando tipo existente para entrada de produção
        quantidade: data.quantidade,
        saldoAnterior,
        saldoAtual,
        custoUnitario: Math.round(custoTotal / data.quantidade),
        documentoReferencia: `PRODUCAO`,
        observacao: data.observacao || `Produção de ${data.quantidade}x ${produto.descricao}`,
        usuarioId: data.usuarioId || null,
      });

      // 7. Registrar produção
      const custoPorUnidade = Math.round(custoTotal / data.quantidade);
      const [result] = await tx.insert(producao).values({
        empresaId,
        produtoId: data.produtoId,
        quantidade: data.quantidade,
        observacao: data.observacao || null,
        usuarioId: data.usuarioId || null,
      }).$returningId();

      return {
        id: result.id,
        produtoId: data.produtoId,
        produtoDescricao: produto.descricao,
        quantidade: data.quantidade,
        custoTotal,
        custoPorUnidade,
        saldoAnterior,
        saldoAtual,
      };
    });
  },

  /**
   * List production history for a company.
   */
  async list(empresaId: number) {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        id: producao.id,
        produtoId: producao.produtoId,
        produtoDescricao: produtos.descricao,
        quantidade: producao.quantidade,
        dataProducao: producao.dataProducao,
        observacao: producao.observacao,
        createdAt: producao.createdAt,
      })
      .from(producao)
      .innerJoin(produtos, eq(producao.produtoId, produtos.id))
      .where(eq(producao.empresaId, empresaId))
      .orderBy(desc(producao.createdAt));

    return result;
  },
};
