ALTER TABLE `conferencias_mercadoria` DROP FOREIGN KEY `conferencias_mercadoria_movimentacaoEstoqueId_movimentacoes_estoque_id_fk`;
--> statement-breakpoint
ALTER TABLE `empresas` MODIFY COLUMN `plano` enum('TRIAL','STARTER','PROFESSIONAL','ENTERPRISE') NOT NULL DEFAULT 'TRIAL';--> statement-breakpoint
ALTER TABLE `empresas` ADD `tipoVarejo` varchar(100);--> statement-breakpoint
ALTER TABLE `empresas` ADD `faturamentoMensal` varchar(50);--> statement-breakpoint
ALTER TABLE `empresas` ADD `vendedores` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `fotoCaminho` varchar(255);--> statement-breakpoint
ALTER TABLE `conferencias_mercadoria` ADD CONSTRAINT `fk_conf_mov_est` FOREIGN KEY (`movimentacaoEstoqueId`) REFERENCES `movimentacoes_estoque`(`id`) ON DELETE no action ON UPDATE no action;