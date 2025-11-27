import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../libs/db";
import {
  conferenciasMercadoria,
  movimentacoesEstoque,
  produtos,
} from "../../drizzle/schema";
import {
  CreateConferenciaInput,
  UpdateConferenciaInput,
} from "../models/conferencia.model";

/**
 * Listar NFes pendentes de conferência
 */
export async function listPendentes() {
  const db = await getDb();
  if (!db) return [];

  const movs = await db
    .select()
    .from(movimentacoesEstoque)
    .where(
      inArray(movimentacoesEstoque.statusConferencia, [
        "PENDENTE_CONFERENCIA",
        "EM_CONFERENCIA",
        "CONFERIDO_COM_DIVERGENCIA",
      ])
    );

  // Agrupar por documentoReferencia
  const grouped = movs.reduce((acc: any, mov) => {
    const doc = mov.documentoReferencia || "S/N";
    if (!acc[doc]) {
      acc[doc] = {
        id: mov.id, // Usar ID da primeira movimentação como referência se necessário
        documentoReferencia: doc,
        fornecedor: mov.observacao?.split(" - ")[1] || "Fornecedor Desconhecido",
        data: mov.createdAt,
        itens: [],
        totalItens: 0,
        status: mov.statusConferencia,
      };
    }
    acc[doc].itens.push(mov);
    acc[doc].totalItens++;
    // Se algum item estiver em conferência ou com divergência, o status geral reflete isso
    if (mov.statusConferencia !== "PENDENTE_CONFERENCIA") {
      acc[doc].status = mov.statusConferencia;
    }
    return acc;
  }, {});

  return Object.values(grouped);
}

/**
 * Listar conferências de uma movimentação específica
 */
export async function listByMovimentacao(movimentacaoId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: conferenciasMercadoria.id,
      movimentacaoEstoqueId: conferenciasMercadoria.movimentacaoEstoqueId,
      produtoId: conferenciasMercadoria.produtoId,
      quantidadeEsperada: conferenciasMercadoria.quantidadeEsperada,
      quantidadeConferida: conferenciasMercadoria.quantidadeConferida,
      divergencia: conferenciasMercadoria.divergencia,
      tipoDivergencia: conferenciasMercadoria.tipoDivergencia,
      status: conferenciasMercadoria.status,
      produto: {
        id: produtos.id,
        descricao: produtos.descricao,
        codigoBarras: produtos.codigoBarras,
      }
    })
    .from(conferenciasMercadoria)
    .leftJoin(produtos, eq(conferenciasMercadoria.produtoId, produtos.id))
    .where(eq(conferenciasMercadoria.movimentacaoEstoqueId, movimentacaoId));
}

/**
 * Iniciar conferência de uma NFe
 */
export async function iniciarConferencia(movimentacaoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Atualizar status da movimentação para EM_CONFERENCIA
  await db
    .update(movimentacoesEstoque)
    .set({ statusConferencia: "EM_CONFERENCIA" })
    .where(eq(movimentacoesEstoque.id, movimentacaoId));

  return { success: true, movimentacaoId };
}

/**
 * Criar conferência de um item
 */
export async function create(data: CreateConferenciaInput, usuarioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calcular divergência
  const divergencia = data.quantidadeConferida
    ? data.quantidadeConferida - data.quantidadeEsperada
    : 0;

  // Determinar tipo de divergência
  let tipoDivergencia: "FALTA" | "SOBRA" | "OK" | undefined;
  if (data.quantidadeConferida !== undefined) {
    if (divergencia < 0) tipoDivergencia = "FALTA";
    else if (divergencia > 0) tipoDivergencia = "SOBRA";
    else tipoDivergencia = "OK";
  }

  // Gerar observação automática se houver divergência
  let observacao = data.observacao || "";
  if (divergencia !== 0 && data.quantidadeConferida !== undefined) {
    const tipoMsg = divergencia < 0 ? "Faltando" : "Sobrando";
    const qtdMsg = Math.abs(divergencia);
    observacao = `${tipoMsg} ${qtdMsg} unidade(s). Esperado: ${data.quantidadeEsperada}, Conferido: ${data.quantidadeConferida}`;
  }

  // Definir status
  const status = divergencia !== 0 ? "DIVERGENCIA" : "CONFERIDO";

  // Converter dataValidade e dataChegada para Date se for string
  const dataValidadeProcessed = data.dataValidade
    ? typeof data.dataValidade === "string"
      ? new Date(data.dataValidade)
      : data.dataValidade
    : undefined;

  const dataChegadaProcessed = data.dataChegada
    ? typeof data.dataChegada === "string"
      ? new Date(data.dataChegada)
      : data.dataChegada
    : undefined;

  // Inserir conferência
  const [result] = await db.insert(conferenciasMercadoria).values({
    movimentacaoEstoqueId: data.movimentacaoEstoqueId,
    produtoId: data.produtoId,
    quantidadeEsperada: data.quantidadeEsperada,
    quantidadeConferida: data.quantidadeConferida,
    divergencia,
    tipoDivergencia,
    dataValidade: dataValidadeProcessed,
    dataChegada: dataChegadaProcessed,
    codigoBarrasLido: data.codigoBarrasLido,
    observacao,
    status,
    usuarioId,
  });

  return result;
}

/**
 * Atualizar conferência existente
 */
export async function update(id: number, data: UpdateConferenciaInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar conferência existente para pegar quantidadeEsperada
  const [conferencia] = await db
    .select()
    .from(conferenciasMercadoria)
    .where(eq(conferenciasMercadoria.id, id));

  if (!conferencia) throw new Error("Conferência não encontrada");

  // Recalcular divergência
  const divergencia = data.quantidadeConferida
    ? data.quantidadeConferida - conferencia.quantidadeEsperada
    : conferencia.divergencia ?? 0;

  // Determinar tipo de divergência
  let tipoDivergencia: "FALTA" | "SOBRA" | "OK" | undefined;
  if (data.quantidadeConferida !== undefined) {
    if (divergencia < 0) tipoDivergencia = "FALTA";
    else if (divergencia > 0) tipoDivergencia = "SOBRA";
    else tipoDivergencia = "OK";
  }

  // Gerar observação automática se houver divergência
  let observacao = data.observacao || conferencia.observacao || "";
  if (divergencia !== 0 && data.quantidadeConferida !== undefined) {
    const tipoMsg = divergencia < 0 ? "Faltando" : "Sobrando";
    const qtdMsg = Math.abs(divergencia ?? 0);
    observacao = `${tipoMsg} ${qtdMsg} unidade(s). Esperado: ${conferencia.quantidadeEsperada}, Conferido: ${data.quantidadeConferida}`;
  }

  // Definir status
  const status = divergencia !== 0 ? "DIVERGENCIA" : "CONFERIDO";

  // Converter dataValidade e dataChegada para Date se for string
  const dataValidadeProcessed = data.dataValidade
    ? typeof data.dataValidade === "string"
      ? new Date(data.dataValidade)
      : data.dataValidade
    : undefined;

  const dataChegadaProcessed = data.dataChegada
    ? typeof data.dataChegada === "string"
      ? new Date(data.dataChegada)
      : data.dataChegada
    : undefined;

  // Atualizar conferência
  await db
    .update(conferenciasMercadoria)
    .set({
      quantidadeConferida: data.quantidadeConferida,
      dataValidade: dataValidadeProcessed,
      dataChegada: dataChegadaProcessed,
      codigoBarrasLido: data.codigoBarrasLido,
      divergencia,
      tipoDivergencia,
      observacao,
      status,
    })
    .where(eq(conferenciasMercadoria.id, id));

  return { success: true, id };
}

/**
 * Buscar produto por código de barras dentro de uma movimentação
 */
export async function getByCodigoBarras(codigoBarras: string, movimentacaoId: number) {
  const db = await getDb();
  if (!db) return null;

  // Buscar produto pelo código de barras
  const [produto] = await db
    .select()
    .from(produtos)
    .where(eq(produtos.codigoBarras, codigoBarras));

  if (!produto) return null;

  // Verificar se esse produto está na movimentação
  const [movimentacao] = await db
    .select()
    .from(movimentacoesEstoque)
    .where(
      and(
        eq(movimentacoesEstoque.id, movimentacaoId),
        eq(movimentacoesEstoque.produtoId, produto.id)
      )
    );

  if (!movimentacao) return null;

  return { produto, movimentacao };
}

/**
 * Finalizar conferência de uma NFe
 */
export async function finalizarConferencia(movimentacaoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar todas as conferências da movimentação
  const conferencias = await db
    .select()
    .from(conferenciasMercadoria)
    .where(eq(conferenciasMercadoria.movimentacaoEstoqueId, movimentacaoId));

  // Verificar se há divergências
  const hasDivergencias = conferencias.some((c) => c.status === "DIVERGENCIA");

  // Definir status final da movimentação
  const statusFinal = hasDivergencias
    ? "CONFERIDO_COM_DIVERGENCIA"
    : "CONFERIDO";

  // Atualizar status da movimentação
  await db
    .update(movimentacoesEstoque)
    .set({ statusConferencia: statusFinal })
    .where(eq(movimentacoesEstoque.id, movimentacaoId));

  // Atualizar estoque com as quantidades conferidas
  for (const conf of conferencias) {
    if (conf.quantidadeConferida !== null) {
      const [produto] = await db
        .select()
        .from(produtos)
        .where(eq(produtos.id, conf.produtoId));

      if (produto) {
        const novoEstoque = produto.estoque + conf.quantidadeConferida;
        await db
          .update(produtos)
          .set({ estoque: novoEstoque })
          .where(eq(produtos.id, conf.produtoId));
      }
    }
  }

  // Retornar resumo
  const resumo = {
    totalItens: conferencias.length,
    itensConferidos: conferencias.filter((c) => c.status === "CONFERIDO")
      .length,
    itensDivergentes: conferencias.filter((c) => c.status === "DIVERGENCIA")
      .length,
    divergencias: conferencias
      .filter((c) => c.status === "DIVERGENCIA")
      .map((c) => ({
        produtoId: c.produtoId,
        quantidadeEsperada: c.quantidadeEsperada,
        quantidadeConferida: c.quantidadeConferida,
        divergencia: c.divergencia,
        tipoDivergencia: c.tipoDivergencia,
        observacao: c.observacao,
      })),
  };

  return { success: true, statusFinal, resumo };
}

/**
 * Resetar conferência de um item (permite recontar)
 */
export async function resetConferencia(conferenciaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Resetar status da conferência para PENDENTE
  await db
    .update(conferenciasMercadoria)
    .set({
      quantidadeConferida: null,
      divergencia: 0,
      status: "PENDENTE",
      dataConferencia: new Date(),
    })
    .where(eq(conferenciasMercadoria.id, conferenciaId));

  return { success: true, message: "Conferência resetada com sucesso" };
}

/**
 * Deletar conferência de um item
 */
export async function deleteConferencia(conferenciaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar a conferência antes de deletar
  const [conferencia] = await db
    .select()
    .from(conferenciasMercadoria)
    .where(eq(conferenciasMercadoria.id, conferenciaId));

  if (!conferencia) {
    throw new Error("Conferência não encontrada");
  }

  // Deletar a conferência
  await db
    .delete(conferenciasMercadoria)
    .where(eq(conferenciasMercadoria.id, conferenciaId));

  return { success: true, message: "Conferência removida com sucesso" };
}
