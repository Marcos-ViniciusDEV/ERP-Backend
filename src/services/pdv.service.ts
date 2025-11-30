import { getDb } from "../libs/db";
import {
  produtos,
  users,
  vendas,
  itensVenda,
  movimentacoesCaixa,
  movimentacoesEstoque,
} from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import type { VendaPDV, MovimentoCaixaPDV } from "../zod/pdv.schema";

/**
 * Retorna dados para carga inicial do PDV
 */
export async function getCargaInicial() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Atualizar precoPdv para igualar ao precoVenda, pois estamos enviando a carga agora
  // Isso confirma que o PDV recebeu (ou está recebendo) os novos preços
  await db.execute(sql`UPDATE produtos SET precoPdv = precoVenda WHERE ativo = 1`);


  // Buscar produtos ativos
  const produtosAtivos = await db
    .select({
      id: produtos.id,
      codigo: produtos.codigo,
      codigoBarras: produtos.codigoBarras,
      descricao: produtos.descricao,
      precoVenda: produtos.precoVenda,
      unidade: produtos.unidade,
      estoque: produtos.estoque,
    })
    .from(produtos)
    .where(eq(produtos.ativo, true));

  // Buscar usuários ativos (apenas operadores e admins)
  const usuariosAtivos = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      password: users.password,
      role: users.role,
    })
    .from(users);

  // Formatar usuários com hash de senha
  const usuariosFormatados = usuariosAtivos.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    passwordHash: u.password, // Já está hasheado no banco
    role: u.role,
  }));

  return {
    produtos: produtosAtivos,
    usuarios: usuariosFormatados,
    formasPagamento: [
      { id: 1, nome: "Dinheiro", tipo: "DINHEIRO" },
      { id: 2, nome: "Débito", tipo: "DEBITO" },
      { id: 3, nome: "Crédito", tipo: "CREDITO" },
      { id: 4, nome: "PIX", tipo: "PIX" },
    ],
  };
}

/**
 * Processa sincronização de vendas e movimentos do PDV
 * Implementa idempotência por numeroVenda único
 */
export async function sincronizar(data: {
  vendas: VendaPDV[];
  movimentosCaixa: MovimentoCaixaPDV[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const resultado = {
    vendasProcessadas: 0,
    vendasDuplicadas: 0,
    movimentosProcessados: 0,
    erros: [] as string[],
  };

  // Processar vendas
  for (const venda of data.vendas) {
    try {
      // Verificar se venda já existe (idempotência)
      const vendaExistente = await db
        .select()
        .from(vendas)
        .where(eq(vendas.numeroVenda, venda.numeroVenda))
        .limit(1);

      if (vendaExistente.length > 0) {
        resultado.vendasDuplicadas++;
        continue;
      }

      // Inserir venda
      const [vendaInserida] = await db
        .insert(vendas)
        .values({
          uuid: venda.uuid,
          numeroVenda: venda.numeroVenda,
          ccf: venda.ccf,
          coo: venda.coo,
          pdvId: venda.pdvId,
          dataVenda: new Date(venda.dataVenda),
          valorTotal: venda.valorTotal,
          valorDesconto: venda.valorDesconto,
          valorLiquido: venda.valorLiquido,
          formaPagamento: venda.formaPagamento,
          status: "CONCLUIDA",
          nfceNumero: venda.nfceNumero,
          nfceChave: venda.nfceChave,
          operadorId: venda.operadorId,
          operadorNome: venda.operadorNome,
          observacao: venda.observacao,
        })
        .$returningId();

      // Inserir itens da venda
      for (const item of venda.itens) {
        await db.insert(itensVenda).values({
          vendaId: vendaInserida.id,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          valorTotal: item.valorTotal,
          valorDesconto: item.valorDesconto,
        });

        // Atualizar estoque (movimentação)
        const produto = await db
          .select()
          .from(produtos)
          .where(eq(produtos.id, item.produtoId))
          .limit(1);

        if (produto.length > 0) {
          const saldoAnterior = produto[0].estoque;
          const novoSaldo = saldoAnterior - item.quantidade;

          console.log(`[SYNC] Updating stock for product ${item.produtoId}: ${saldoAnterior} -> ${novoSaldo}`);

          // Registrar movimentação de estoque
          await db.insert(movimentacoesEstoque).values({
            produtoId: item.produtoId,
            tipo: "VENDA_PDV",
            quantidade: -item.quantidade,
            saldoAnterior: saldoAnterior,
            saldoAtual: novoSaldo,
            custoUnitario: item.precoUnitario,
            documentoReferencia: venda.numeroVenda,
            usuarioId: venda.operadorId,
          });

          // Atualizar saldo do produto
          await db
            .update(produtos)
            .set({ estoque: novoSaldo })
            .where(eq(produtos.id, item.produtoId));
        } else {
          console.warn(`[SYNC] Product ${item.produtoId} not found for stock update`);
        }
      }

      resultado.vendasProcessadas++;
    } catch (error: any) {
      resultado.erros.push(
        `Erro ao processar venda ${venda.numeroVenda}: ${error.message}`
      );
    }
  }

  // Processar movimentos de caixa
  for (const movimento of data.movimentosCaixa) {
    try {
      // Verificar duplicação (por UUID ou combinação de dados)
      const movimentoExistente = await db
        .select()
        .from(movimentacoesCaixa)
        .where(
          and(
            eq(movimentacoesCaixa.tipo, movimento.tipo),
            eq(movimentacoesCaixa.valor, movimento.valor),
            eq(movimentacoesCaixa.operadorId, movimento.operadorId),
            eq(
              movimentacoesCaixa.dataMovimento,
              new Date(movimento.dataMovimento)
            )
          )
        )
        .limit(1);

      if (movimentoExistente.length > 0) {
        continue; // Pular duplicados
      }

      await db.insert(movimentacoesCaixa).values({
        tipo: movimento.tipo,
        valor: movimento.valor,
        dataMovimento: new Date(movimento.dataMovimento),
        operadorId: movimento.operadorId,
        observacao: movimento.observacao,
        pdvId: movimento.pdvId,
      });

      resultado.movimentosProcessados++;
    } catch (error: any) {
      resultado.erros.push(
        `Erro ao processar movimento ${movimento.tipo}: ${error.message}`
      );
    }
  }

  return resultado;
}

/**
 * Lista movimentações de caixa com filtros
 */
export async function listMovements(filters?: {
  pdvId?: string;
  operadorId?: number;
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.pdvId) conditions.push(eq(movimentacoesCaixa.pdvId, filters.pdvId));
  if (filters?.operadorId)
    conditions.push(eq(movimentacoesCaixa.operadorId, filters.operadorId));
  if (filters?.tipo)
    conditions.push(eq(movimentacoesCaixa.tipo, filters.tipo as any));
  
  if (filters?.dataInicio) {
     const start = `${filters.dataInicio} 00:00:00`;
     conditions.push(sql`${movimentacoesCaixa.dataMovimento} >= ${start}`);
  }
  
  if (filters?.dataFim) {
    const end = `${filters.dataFim} 23:59:59`;
    conditions.push(sql`${movimentacoesCaixa.dataMovimento} <= ${end}`);
  }

  let query = db
    .select({
      id: movimentacoesCaixa.id,
      tipo: movimentacoesCaixa.tipo,
      valor: movimentacoesCaixa.valor,
      dataMovimento: movimentacoesCaixa.dataMovimento,
      observacao: movimentacoesCaixa.observacao,
      pdvId: movimentacoesCaixa.pdvId,
      operadorNome: users.name,
    })
    .from(movimentacoesCaixa)
    .leftJoin(users, eq(movimentacoesCaixa.operadorId, users.id));

  if (conditions.length > 0) {
    // @ts-ignore
    query.where(and(...conditions));
  }

  // @ts-ignore
  return query.orderBy(sql`${movimentacoesCaixa.dataMovimento} DESC`);
}
