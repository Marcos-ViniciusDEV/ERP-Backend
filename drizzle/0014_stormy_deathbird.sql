CREATE TABLE `empresas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`razaoSocial` varchar(255) NOT NULL,
	`nomeFantasia` varchar(255),
	`cnpj` varchar(18) NOT NULL,
	`codigoAcesso` varchar(20) NOT NULL,
	`senhaAtivacao` text NOT NULL,
	`plano` enum('BASICO','PRO','ENTERPRISE') NOT NULL DEFAULT 'BASICO',
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `empresas_id` PRIMARY KEY(`id`),
	CONSTRAINT `empresas_cnpj_unique` UNIQUE(`cnpj`),
	CONSTRAINT `empresas_codigoAcesso_unique` UNIQUE(`codigoAcesso`)
);
--> statement-breakpoint
CREATE TABLE `materiais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`unidade` varchar(10) NOT NULL,
	`estoque` int NOT NULL DEFAULT 0,
	`custoUnitario` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materiais_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`produtoId` int NOT NULL,
	`precoOferta` int NOT NULL,
	`dataInicio` timestamp NOT NULL,
	`dataFim` timestamp NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pdvs_ativos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`pdvId` varchar(50) NOT NULL,
	`apelido` varchar(100),
	`ultimoAcesso` timestamp,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pdvs_ativos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `producao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`produtoId` int NOT NULL,
	`quantidade` int NOT NULL,
	`dataProducao` timestamp NOT NULL DEFAULT (now()),
	`usuarioId` int,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `producao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `receitas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` int NOT NULL,
	`materialId` int NOT NULL,
	`quantidade` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `receitas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `return_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`returnId` int NOT NULL,
	`produtoId` int NOT NULL,
	`quantidade` int NOT NULL,
	`condition` enum('GOOD','DAMAGED') DEFAULT 'GOOD',
	CONSTRAINT `return_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`originalSaleId` int,
	`reason` text NOT NULL,
	`totalRefunded` int NOT NULL,
	`operatorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`targetAmount` int NOT NULL,
	`sellerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `departamentos` DROP INDEX `departamentos_codigo_unique`;--> statement-breakpoint
ALTER TABLE `pedidos_compra` DROP INDEX `pedidos_compra_numeroPedido_unique`;--> statement-breakpoint
ALTER TABLE `produtos` DROP INDEX `produtos_codigo_unique`;--> statement-breakpoint
ALTER TABLE `movimentacoes_estoque` MODIFY COLUMN `tipo` enum('ENTRADA_NFE','VENDA_PDV','BAIXA_PERDA','BAIXA_LANCHE','BAIXA_USO','AJUSTE_AUDITORIA','TRANSFERENCIA_ENTRADA','TRANSFERENCIA_SAIDA','DEVOLUCAO') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','pdv_operator','super_admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `clientes` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `contas_pagar` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `contas_receber` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `departamentos` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `fornecedores` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `inventarios` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `movimentacoes_caixa` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `movimentacoes_estoque` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `pedidos_compra` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `produtos` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `empresaId` int;--> statement-breakpoint
ALTER TABLE `vendas` ADD `empresaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `materiais` ADD CONSTRAINT `materiais_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pdvs_ativos` ADD CONSTRAINT `pdvs_ativos_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `producao` ADD CONSTRAINT `producao_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `producao` ADD CONSTRAINT `producao_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `producao` ADD CONSTRAINT `producao_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receitas` ADD CONSTRAINT `receitas_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receitas` ADD CONSTRAINT `receitas_materialId_materiais_id_fk` FOREIGN KEY (`materialId`) REFERENCES `materiais`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `return_items` ADD CONSTRAINT `return_items_returnId_returns_id_fk` FOREIGN KEY (`returnId`) REFERENCES `returns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `return_items` ADD CONSTRAINT `return_items_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `returns` ADD CONSTRAINT `returns_originalSaleId_vendas_id_fk` FOREIGN KEY (`originalSaleId`) REFERENCES `vendas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_goals` ADD CONSTRAINT `sales_goals_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_goals` ADD CONSTRAINT `sales_goals_sellerId_users_id_fk` FOREIGN KEY (`sellerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contas_pagar` ADD CONSTRAINT `contas_pagar_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contas_receber` ADD CONSTRAINT `contas_receber_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `departamentos` ADD CONSTRAINT `departamentos_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fornecedores` ADD CONSTRAINT `fornecedores_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventarios` ADD CONSTRAINT `inventarios_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movimentacoes_caixa` ADD CONSTRAINT `movimentacoes_caixa_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movimentacoes_estoque` ADD CONSTRAINT `movimentacoes_estoque_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pedidos_compra` ADD CONSTRAINT `pedidos_compra_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `produtos` ADD CONSTRAINT `produtos_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendas` ADD CONSTRAINT `vendas_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;