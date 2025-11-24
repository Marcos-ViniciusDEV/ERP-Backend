ALTER TABLE `movimentacoes_caixa` MODIFY COLUMN `tipo` enum('SANGRIA','REFORCO','ABERTURA','FECHAMENTO','VENDA') NOT NULL;--> statement-breakpoint
ALTER TABLE `movimentacoes_estoque` ADD `numeroTransacao` varchar(50);--> statement-breakpoint
ALTER TABLE `vendas` ADD `uuid` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `vendas` ADD `ccf` varchar(6);--> statement-breakpoint
ALTER TABLE `vendas` ADD `coo` varchar(6);--> statement-breakpoint
ALTER TABLE `vendas` ADD `pdvId` varchar(50);--> statement-breakpoint
ALTER TABLE `vendas` ADD `operadorNome` varchar(255);--> statement-breakpoint
ALTER TABLE `vendas` ADD CONSTRAINT `vendas_uuid_unique` UNIQUE(`uuid`);--> statement-breakpoint
ALTER TABLE `movimentacoes_estoque` DROP COLUMN `loteImportacao`;