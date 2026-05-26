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
import offersRouter from "./offers.routes";
import materialsRouter from "./materials.routes";
import recipesRouter from "./recipes.routes";
import productionRouter from "./production.routes";
import { returnsRouter } from "./returns.routes";
import { analyticsRouter } from "./analytics.routes";
import { empresasRouter } from "./empresas.routes";
import { employeesRouter } from "./employees.routes";
import { whatsappRouter } from "./whatsapp.routes";
import { saasRouter } from "./saas.routes";
import { supportRouter } from "./support.routes";
import { reportsRouter } from "./reports.routes";
import { fiscalRouter } from "./fiscal.routes";


import { authenticate } from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenant.middleware";

export const appRouter = Router();

appRouter.use("/auth", authRouter);
appRouter.use("/saas", saasRouter);
appRouter.use("/empresas", empresasRouter); // Inclui ativação de PDV e admin de tenants

// Proteger todas as rotas abaixo com autenticação e contexto de empresa
appRouter.use(authenticate);
appRouter.use(requireTenant);
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
appRouter.use("/offers", offersRouter);
appRouter.use("/materials", materialsRouter);
appRouter.use("/recipes", recipesRouter);
appRouter.use("/production", productionRouter);
appRouter.use("/returns", returnsRouter);
appRouter.use("/analytics", analyticsRouter);
appRouter.use("/funcionarios", employeesRouter);
appRouter.use("/whatsapp", whatsappRouter);
appRouter.use("/support", supportRouter);
appRouter.use("/reports", reportsRouter);
appRouter.use("/fiscal", fiscalRouter);
