import { Router } from "express";
import { authRouter } from "./auth.routes";
import { clientesRouter } from "./clientes.routes";
import { produtosRouter } from "./produtos.routes";
import { vendasRouter } from "./vendas.routes";
import { fornecedoresRouter } from "./fornecedores.routes";
import { departamentosRouter } from "./departamentos.routes";
import { pedidosCompraRouter } from "./pedidos-compra.routes";
import { contasPagarRouter } from "./contas-pagar.routes";
import { contasReceberRouter } from "./contas-receber.routes";
import { kardexRouter } from "./kardex.routes";
import { caixaRouter } from "./caixa.routes";
import { inventarioRouter } from "./inventario.routes";
import conferenciaRouter from "./conferencias.routes";
import { pdvRouter } from "./pdv.routes";
import { usersRouter } from "./users.routes";

export const appRouter = Router();

appRouter.use("/auth", authRouter);
appRouter.use("/users", usersRouter);
appRouter.use("/clientes", clientesRouter);
appRouter.use("/produtos", produtosRouter);
appRouter.use("/vendas", vendasRouter);
appRouter.use("/fornecedores", fornecedoresRouter);
appRouter.use("/departamentos", departamentosRouter);
appRouter.use("/pedidos-compra", pedidosCompraRouter);
appRouter.use("/contas-pagar", contasPagarRouter);
appRouter.use("/contas-receber", contasReceberRouter);
appRouter.use("/kardex", kardexRouter);
appRouter.use("/caixa", caixaRouter);
appRouter.use("/inventario", inventarioRouter);
appRouter.use("/conferencias", conferenciaRouter);
appRouter.use("/pdv", pdvRouter);



