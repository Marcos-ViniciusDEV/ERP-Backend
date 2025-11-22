CREATE TABLE `conferencias_mercadoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movimentacaoEstoqueId` int NOT NULL,
	`produtoId` int NOT NULL,
	`quantidadeEsperada` int NOT NULL,
	`quantidadeConferida` int,
	`divergencia` int DEFAULT 0,
	`tipoDivergencia` enum('FALTA','SOBRA','OK'),
	`dataValidade` timestamp,
	`dataConferencia` timestamp NOT NULL DEFAULT (now()),
	`codigoBarrasLido` varchar(50),
	`status` enum('PENDENTE','CONFERIDO','DIVERGENCIA') NOT NULL DEFAULT 'PENDENTE',
	`observacao` text,
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conferencias_mercadoria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `password` text;--> statement-breakpoint
ALTER TABLE `movimentacoes_estoque` ADD `statusConferencia` enum('PENDENTE_CONFERENCIA','EM_CONFERENCIA','CONFERIDO','CONFERIDO_COM_DIVERGENCIA');--> statement-breakpoint
ALTER TABLE `conferencias_mercadoria` ADD CONSTRAINT `conf_merc_mov_est_fk` FOREIGN KEY (`movimentacaoEstoqueId`) REFERENCES `movimentacoes_estoque`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conferencias_mercadoria` ADD CONSTRAINT `conf_merc_produto_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conferencias_mercadoria` ADD CONSTRAINT `conf_merc_usuario_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;