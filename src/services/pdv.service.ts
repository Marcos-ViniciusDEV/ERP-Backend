import { getDb } from "../libs/db";
import {
  produtos,
  users,
  vendas,
  itensVenda,
  movimentacoesCaixa,
  movimentacoesEstoque,
  configuracoesFiscais,
  empresas,
  pinpadPareamentoKeys,
  terminaisPagamento,
} from "../../drizzle/schema";
import { createHash, randomBytes } from "crypto";
import { eq, and, sql } from "drizzle-orm";
import type { VendaPDV, MovimentoCaixaPDV } from "../zod/pdv.schema";
import * as pagamentosService from "./pagamentos.service";

/**
 * Retorna dados para carga inicial do PDV
 */
export async function getCargaInicial(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Atualizar precoPdv para igualar ao precoVenda, pois estamos enviando a carga agora
  // Isso confirma que o PDV recebeu (ou está recebendo) os novos preços
  await db.execute(sql`UPDATE produtos SET precoPdv = precoVenda WHERE ativo = 1 AND empresaId = ${empresaId}`);


  // Buscar produtos ativos
  const produtosAtivos = await db
    .select({
      id: produtos.id,
      codigo: produtos.codigo,
      codigoBarras: produtos.codigoBarras,
      descricao: produtos.descricao,
      precoVenda: produtos.precoPdv,
      unidade: produtos.unidade,
      estoque: produtos.estoque,
      ativo: produtos.ativo,
      ncm: produtos.ncm,
      cest: produtos.cest,
      origem: produtos.origem,
      cstIcms: produtos.cstIcms,
      csosnIcms: produtos.csosnIcms,
      cfopPadraoVenda: produtos.cfopPadraoVenda,
      aliquotaIcms: produtos.aliquotaIcms,
      aliquotaPis: produtos.aliquotaPis,
      aliquotaCofins: produtos.aliquotaCofins,
      pisCst: produtos.pisCst,
      cofinsCst: produtos.cofinsCst,
    })
    .from(produtos)
    .where(eq(produtos.empresaId, empresaId));

  // Buscar usuários ativos (apenas operadores e admins)
  const usuariosAtivos = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      password: users.password,
      role: users.role,
    })
    .from(users)
    .where(eq(users.empresaId, empresaId));

  // Formatar usuários com hash de senha
  const usuariosFormatados = usuariosAtivos.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    passwordHash: u.password, // Já está hasheado no banco
    role: u.role,
  }));

  const [configuracaoFiscal] = await db
    .select({
      habilitarNfce: configuracoesFiscais.habilitarNfce,
      ambiente: configuracoesFiscais.ambiente,
      regimeTributario: configuracoesFiscais.regimeTributario,
      serieNfce: configuracoesFiscais.serieNfce,
      serieNfe: configuracoesFiscais.serieNfe,
      proximoNumeroNfce: configuracoesFiscais.proximoNumeroNfce,
      proximoNumeroNfe: configuracoesFiscais.proximoNumeroNfe,
      idTokenIsc: configuracoesFiscais.idTokenIsc,
      cscConfigurado: sql<boolean>`case when ${configuracoesFiscais.csc} is null or ${configuracoesFiscais.csc} = '' then false else true end`,
      certificadoConfigurado: sql<boolean>`case when ${configuracoesFiscais.certificadoDigitalCaminho} is null or ${configuracoesFiscais.certificadoDigitalCaminho} = '' then false else true end`,
      certificadoValidade: configuracoesFiscais.certificadoValidade,
    })
    .from(configuracoesFiscais)
    .where(eq(configuracoesFiscais.empresaId, empresaId))
    .limit(1);

  const [empresa] = await db
    .select({
      id: empresas.id,
      cnpj: empresas.cnpj,
      razaoSocial: empresas.razaoSocial,
      nomeFantasia: empresas.nomeFantasia,
    })
    .from(empresas)
    .where(eq(empresas.id, empresaId))
    .limit(1);

  const configuracoesPagamento = await pagamentosService.getPaymentConfigBundle(empresaId);
  const formasPagamentoPdv = configuracoesPagamento.formasPagamento
    .filter((forma: any) => forma.ativo)
    .map((forma: any) => ({
      id: forma.id,
      nome: forma.nome,
      tipo: String(forma.tipo).toUpperCase(),
      codigo: forma.codigo,
      modoCaptura: forma.modoCaptura,
      permiteTroco: forma.permiteTroco,
      permiteParcelamento: forma.permiteParcelamento,
      maxParcelas: forma.maxParcelas,
      exigirAutorizacao: forma.exigirAutorizacao,
      ordem: forma.ordem,
    }));

  return {
    empresa: empresa || null,
    produtos: produtosAtivos,
    usuarios: usuariosFormatados,
    configuracaoFiscal: configuracaoFiscal || {
      habilitarNfce: false,
      ambiente: "HOMOLOGACAO",
      regimeTributario: "SIMPLES_NACIONAL",
      serieNfce: 1,
      serieNfe: 1,
      proximoNumeroNfce: 1,
      proximoNumeroNfe: 1,
      idTokenIsc: null,
      cscConfigurado: false,
      certificadoConfigurado: false,
      certificadoValidade: null,
    },
    fiscalCargaGeradaEm: new Date().toISOString(),
    configuracoesPagamento: {
      empresaId,
      cnpjEmpresa: empresa?.cnpj || null,
      versaoCarga: configuracoesPagamento.versaoCarga,
      habilitarPagamentosManuais: configuracoesPagamento.habilitarPagamentosManuais,
      habilitarTef: configuracoesPagamento.habilitarTef,
      habilitarPosApi: configuracoesPagamento.habilitarPosApi,
      habilitarPixIntegrado: configuracoesPagamento.habilitarPixIntegrado,
      modoPadraoCartao: configuracoesPagamento.modoPadraoCartao,
      exigirNsuNoManual: configuracoesPagamento.exigirNsuNoManual,
      permitirVendaOfflineCartaoManual: configuracoesPagamento.permitirVendaOfflineCartaoManual,
      permitirVendaOfflineTef: configuracoesPagamento.permitirVendaOfflineTef,
      formasPagamento: formasPagamentoPdv,
      terminaisPagamento: configuracoesPagamento.terminaisPagamento,
      adquirentes: configuracoesPagamento.adquirentes,
      taxas: configuracoesPagamento.taxas,
    },
    formasPagamento: formasPagamentoPdv,
    formasPagamentoLegado: [
      { id: 1, nome: "Dinheiro", tipo: "DINHEIRO" },
      { id: 2, nome: "Débito", tipo: "DEBITO" },
      { id: 3, nome: "Crédito", tipo: "CREDITO" },
      { id: 4, nome: "PIX", tipo: "PIX" },
    ],
  };
}

export async function getEmpresaIdentity(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [empresa] = await db
    .select({ id: empresas.id, cnpj: empresas.cnpj, nomeFantasia: empresas.nomeFantasia, razaoSocial: empresas.razaoSocial })
    .from(empresas)
    .where(eq(empresas.id, empresaId))
    .limit(1);
  return empresa || null;
}

export async function generatePinpadPairingKey(empresaId: number, pdvId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cleanPdvId = String(pdvId || "").trim();
  if (!cleanPdvId) throw new Error("pdvId e obrigatorio");

  const [empresa] = await db
    .select({ id: empresas.id, cnpj: empresas.cnpj, nomeFantasia: empresas.nomeFantasia })
    .from(empresas)
    .where(eq(empresas.id, empresaId))
    .limit(1);

  if (!empresa?.cnpj) throw new Error("Empresa/CNPJ nao encontrado para gerar chave do PinPad");

  const [terminal] = await db
    .select()
    .from(terminaisPagamento)
    .where(and(eq(terminaisPagamento.empresaId, empresaId), eq(terminaisPagamento.pdvId, cleanPdvId), eq(terminaisPagamento.ativo, true)))
    .limit(1);

  await db
    .update(pinpadPareamentoKeys)
    .set({ ativo: false })
    .where(and(eq(pinpadPareamentoKeys.empresaId, empresaId), eq(pinpadPareamentoKeys.pdvId, cleanPdvId), eq(pinpadPareamentoKeys.ativo, true)));

  const cnpjDigits = empresa.cnpj.replace(/\D/g, "");
  const key = `PIN-${cnpjDigits.slice(-6)}-${cleanPdvId.toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.insert(pinpadPareamentoKeys).values({
    empresaId,
    pdvId: cleanPdvId,
    terminalPagamentoId: terminal?.id || null,
    cnpjEmpresa: empresa.cnpj,
    chaveHash: hash,
    chavePrefixo: key.slice(0, Math.min(24, key.length)),
    expiraEm: expiresAt,
    ativo: true,
  });

  return {
    pdvId: cleanPdvId,
    cnpjEmpresa: empresa.cnpj,
    nomeEmpresa: empresa.nomeFantasia,
    terminal: terminal
      ? {
          id: terminal.id,
          nomeTerminal: terminal.nomeTerminal,
          tipo: terminal.tipo,
          identificador: terminal.serialEquipamento || terminal.codigoTerminal || terminal.terminalTef || null,
        }
      : null,
    pinpadKey: key,
    expiraEm: expiresAt.toISOString(),
    validadeMinutos: 30,
    aviso: "A chave completa aparece somente agora. Depois sera exibido apenas o prefixo.",
  };
}

export async function listPinpadPairingKeyStatus(empresaId: number, pdvIds: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (pdvIds.length === 0) return [];

  const keys = await db.select().from(pinpadPareamentoKeys).where(eq(pinpadPareamentoKeys.empresaId, empresaId));
  const now = Date.now();

  return pdvIds.map((pdvId) => {
    const key = keys
      .filter((item) => item.pdvId === pdvId && item.ativo && !item.usadaEm)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];

    if (!key) {
      return { pdvId, possuiChaveAtiva: false, status: "Sem chave ativa" };
    }

    const expiraEm = new Date(key.expiraEm);
    const expired = expiraEm.getTime() <= now;
    return {
      pdvId,
      possuiChaveAtiva: !expired,
      status: expired ? "Chave expirada" : "Chave ativa",
      chavePrefixo: key.chavePrefixo,
      expiraEm: expiraEm.toISOString(),
    };
  });
}

/**
 * Processa sincronização de vendas e movimentos do PDV
 * Implementa idempotência por numeroVenda único
 */
export async function sincronizar(empresaId: number, data: {
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
          empresaId,
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
            empresaId,
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
        empresaId,
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
export async function listMovements(empresaId: number, filters?: {
  pdvId?: string;
  operadorId?: number;
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(movimentacoesCaixa.empresaId, empresaId)];
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
