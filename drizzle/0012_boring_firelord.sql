ALTER TABLE `movimentacoes_caixa` ADD `pdvId` varchar(50);--> statement-breakpoint
ALTER TABLE `produtos` ADD `precoPdv` int DEFAULT 0;