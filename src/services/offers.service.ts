import { eq, and, lte, gte, desc } from "drizzle-orm";
import { getDb } from "../libs/db";
import { offers, produtos, type InsertOffer } from "../../drizzle/schema";

// Tipo de oferta com dados do produto
export type OfferWithProduct = typeof offers.$inferSelect & {
  produto?: {
    id: number;
    descricao: string;
    precoVenda: number;
    codigo: string;
  } | null;
};

/**
 * Verifica se a hora atual está no intervalo de hora da oferta (se definido)
 */
function isWithinTimeRange(horaInicio?: string | null, horaFim?: string | null): boolean {
  if (!horaInicio || !horaFim) return true; // sem restrição de hora = sempre válido
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = horaInicio.split(":").map(Number);
  const [endH, endM] = horaFim.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Calcula o desconto de uma oferta dado o preço original e a quantidade
 * Retorna: { precoFinal, descontoTotal, descricaoDesconto }
 */
export function calcularDesconto(
  offer: typeof offers.$inferSelect,
  precoOriginal: number,
  quantidade: number
): { precoFinal: number; descontoTotal: number; descricaoDesconto: string } {
  switch (offer.tipoDesconto) {
    case "PRECO_FIXO": {
      const precoFinal = offer.precoOferta;
      const descontoTotal = Math.max(0, (precoOriginal - precoFinal) * quantidade);
      return {
        precoFinal,
        descontoTotal,
        descricaoDesconto: `Preço especial: R$ ${(precoFinal / 100).toFixed(2)}`,
      };
    }

    case "PERCENTUAL": {
      const desconto = Math.round(precoOriginal * (offer.percentualDesconto / 100));
      const precoFinal = precoOriginal - desconto;
      return {
        precoFinal,
        descontoTotal: desconto * quantidade,
        descricaoDesconto: `${offer.percentualDesconto}% OFF`,
      };
    }

    case "LEVE_X_PAGUE_Y": {
      const qtdLeve = offer.qtdLeve || 3;
      const qtdPague = offer.qtdPague || 2;
      // Quantas vezes o ciclo se repete
      const ciclos = Math.floor(quantidade / qtdLeve);
      const resto = quantidade % qtdLeve;
      // Total pago = ciclos * qtdPague * preço + resto * preço
      const totalPago = (ciclos * qtdPague + resto) * precoOriginal;
      const totalSemDesconto = quantidade * precoOriginal;
      const descontoTotal = totalSemDesconto - totalPago;
      return {
        precoFinal: precoOriginal, // preço unitário não muda — o desconto é no total
        descontoTotal,
        descricaoDesconto: `Leve ${qtdLeve} Pague ${qtdPague}`,
      };
    }

    case "DESCONTO_SEGUNDO": {
      if (quantidade < 2) {
        return { precoFinal: precoOriginal, descontoTotal: 0, descricaoDesconto: `${offer.percentualDesconto}% no 2º item` };
      }
      // Desconto aplicado nos itens pares (2º, 4º, etc.)
      const itensComDesconto = Math.floor(quantidade / 2);
      const desconto = Math.round(precoOriginal * (offer.percentualDesconto / 100));
      const descontoTotal = desconto * itensComDesconto;
      return {
        precoFinal: precoOriginal,
        descontoTotal,
        descricaoDesconto: `${offer.percentualDesconto}% no 2º item`,
      };
    }

    default:
      return { precoFinal: precoOriginal, descontoTotal: 0, descricaoDesconto: "" };
  }
}

export const offersService = {
  async create(empresaId: number, data: any) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    if (new Date(data.dataInicio) >= new Date(data.dataFim)) {
      throw new Error("A data de início deve ser anterior à data de fim.");
    }

    // Validação por tipo
    if (data.tipoDesconto === "PRECO_FIXO" && (!data.precoOferta || data.precoOferta <= 0)) {
      throw new Error("Informe o preço de oferta para desconto por preço fixo.");
    }
    if ((data.tipoDesconto === "PERCENTUAL" || data.tipoDesconto === "DESCONTO_SEGUNDO") && (!data.percentualDesconto || data.percentualDesconto <= 0)) {
      throw new Error("Informe o percentual de desconto.");
    }
    if (data.tipoDesconto === "LEVE_X_PAGUE_Y" && (!data.qtdLeve || !data.qtdPague || data.qtdLeve <= data.qtdPague)) {
      throw new Error("Para 'Leve X Pague Y', a quantidade leve deve ser maior que a quantidade pague.");
    }

    const [result] = await db.insert(offers).values({
      ...data,
      empresaId,
      dataInicio: new Date(data.dataInicio),
      dataFim: new Date(data.dataFim),
    }).$returningId();

    const [offer] = await db
      .select()
      .from(offers)
      .where(and(eq(offers.id, result.id), eq(offers.empresaId, empresaId)));

    return offer;
  },

  async getAll(empresaId: number): Promise<OfferWithProduct[]> {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        id: offers.id,
        empresaId: offers.empresaId,
        produtoId: offers.produtoId,
        nome: offers.nome,
        tipoDesconto: offers.tipoDesconto,
        precoOferta: offers.precoOferta,
        percentualDesconto: offers.percentualDesconto,
        qtdLeve: offers.qtdLeve,
        qtdPague: offers.qtdPague,
        dataInicio: offers.dataInicio,
        dataFim: offers.dataFim,
        horaInicio: offers.horaInicio,
        horaFim: offers.horaFim,
        aplicacaoAutomatica: offers.aplicacaoAutomatica,
        ativo: offers.ativo,
        createdAt: offers.createdAt,
        updatedAt: offers.updatedAt,
        produto: {
          id: produtos.id,
          descricao: produtos.descricao,
          precoVenda: produtos.precoVenda,
          codigo: produtos.codigo,
        },
      })
      .from(offers)
      .leftJoin(produtos, eq(offers.produtoId, produtos.id))
      .where(eq(offers.empresaId, empresaId))
      .orderBy(desc(offers.createdAt));

    return result;
  },

  async getActive(empresaId: number): Promise<OfferWithProduct[]> {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();

    const result = await db
      .select({
        id: offers.id,
        empresaId: offers.empresaId,
        produtoId: offers.produtoId,
        nome: offers.nome,
        tipoDesconto: offers.tipoDesconto,
        precoOferta: offers.precoOferta,
        percentualDesconto: offers.percentualDesconto,
        qtdLeve: offers.qtdLeve,
        qtdPague: offers.qtdPague,
        dataInicio: offers.dataInicio,
        dataFim: offers.dataFim,
        horaInicio: offers.horaInicio,
        horaFim: offers.horaFim,
        aplicacaoAutomatica: offers.aplicacaoAutomatica,
        ativo: offers.ativo,
        createdAt: offers.createdAt,
        updatedAt: offers.updatedAt,
        produto: {
          id: produtos.id,
          descricao: produtos.descricao,
          precoVenda: produtos.precoVenda,
          codigo: produtos.codigo,
        },
      })
      .from(offers)
      .leftJoin(produtos, eq(offers.produtoId, produtos.id))
      .where(
        and(
          eq(offers.empresaId, empresaId),
          eq(offers.ativo, true),
          lte(offers.dataInicio, now),
          gte(offers.dataFim, now)
        )
      );

    // Filtrar por horário (feito em JS para flexibilidade)
    return result.filter((o) => isWithinTimeRange(o.horaInicio, o.horaFim));
  },

  async update(empresaId: number, id: number, data: any) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [existing] = await db
      .select()
      .from(offers)
      .where(and(eq(offers.id, id), eq(offers.empresaId, empresaId)));

    if (!existing) throw new Error("Oferta não encontrada.");

    const updateData: any = { ...data };
    if (data.dataInicio) updateData.dataInicio = new Date(data.dataInicio);
    if (data.dataFim) updateData.dataFim = new Date(data.dataFim);

    await db.update(offers).set(updateData).where(and(eq(offers.id, id), eq(offers.empresaId, empresaId)));

    const [updated] = await db.select().from(offers).where(eq(offers.id, id));
    return updated;
  },

  async toggleAtivo(empresaId: number, id: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [existing] = await db
      .select()
      .from(offers)
      .where(and(eq(offers.id, id), eq(offers.empresaId, empresaId)));

    if (!existing) throw new Error("Oferta não encontrada.");

    await db
      .update(offers)
      .set({ ativo: !existing.ativo })
      .where(and(eq(offers.id, id), eq(offers.empresaId, empresaId)));

    return { ativo: !existing.ativo };
  },

  async delete(empresaId: number, id: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(offers).where(and(eq(offers.id, id), eq(offers.empresaId, empresaId)));
  },
};
