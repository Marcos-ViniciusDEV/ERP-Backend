ALTER TABLE `produtos` DROP FOREIGN KEY `produtos_departamentoId_departamentos_id_fk`;
--> statement-breakpoint
ALTER TABLE `produtos` MODIFY COLUMN `descricao` text NOT NULL;--> statement-breakpoint
ALTER TABLE `produtos` MODIFY COLUMN `unidade` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `produtos` MODIFY COLUMN `precoVenda` int NOT NULL;--> statement-breakpoint
ALTER TABLE `produtos` MODIFY COLUMN `precoCusto` int NOT NULL;--> statement-breakpoint
ALTER TABLE `produtos` ADD `marca` varchar(100);--> statement-breakpoint
ALTER TABLE `produtos` DROP COLUMN `ativo`;