import { Router, raw } from "express";
import * as produtoController from "../controllers/produto.controller";
import { authenticate } from "../middleware/auth.middleware";

export const produtosRouter = Router();

produtosRouter.use(authenticate);
produtosRouter.get("/", produtoController.list);
produtosRouter.post("/", produtoController.create);
produtosRouter.get("/importacao/template", produtoController.downloadImportTemplate);
produtosRouter.post("/importacao", raw({ type: "application/octet-stream", limit: "8mb" }), produtoController.importProdutos);
produtosRouter.get("/fiscal/pendencias", produtoController.listFiscalPendencias);
produtosRouter.put("/:id", produtoController.update);
produtosRouter.put("/:id/precos", produtoController.updatePrecos);
produtosRouter.post("/backfill-last-purchase", produtoController.backfillLastPurchaseData);
produtosRouter.delete("/:id", produtoController.deleteProduto);
produtosRouter.get("/:id/movimentos", produtoController.getMovimentos);
produtosRouter.get("/:id/historico-vendas", produtoController.getHistoricoVendas);
