CREATE TABLE `contas_pagar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`fornecedorId` int,
	`valor` int NOT NULL,
	`dataVencimento` timestamp NOT NULL,
	`dataPagamento` timestamp,
	`status` enum('PENDENTE','PAGO','ATRASADO','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
	`formaPagamento` varchar(50),
	`observacao` text,
	`usuarioId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contas_pagar_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contas_receber` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`valor` int NOT NULL,
	`dataVencimento` timestamp NOT NULL,
	`dataRecebimento` timestamp,
	`status` enum('PENDENTE','RECEBIDO','ATRASADO','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
	`formaPagamento` varchar(50),
	`observacao` text,
	`usuarioId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contas_receber_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(20) NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departamentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `departamentos_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `fornecedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`razaoSocial` varchar(255) NOT NULL,
	`nomeFantasia` varchar(255),
	`cnpj` varchar(18) NOT NULL,
	`inscricaoEstadual` varchar(20),
	`telefone` varchar(20),
	`email` varchar(320),
	`endereco` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fornecedores_id` PRIMARY KEY(`id`),
	CONSTRAINT `fornecedores_cnpj_unique` UNIQUE(`cnpj`)
);
--> statement-breakpoint
CREATE TABLE `inventarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`status` enum('ABERTO','FECHADO','CANCELADO') NOT NULL DEFAULT 'ABERTO',
	`dataAbertura` timestamp NOT NULL DEFAULT (now()),
	`dataFechamento` timestamp,
	`usuarioAberturaId` int,
	`usuarioFechamentoId` int,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventarios_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventarioId` int NOT NULL,
	`produtoId` int NOT NULL,
	`estoqueSistema` int NOT NULL,
	`quantidadeContada` int,
	`diferenca` int DEFAULT 0,
	`status` enum('PENDENTE','CONTADO','APROVADO') NOT NULL DEFAULT 'PENDENTE',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventarios_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itens_pedido_compra` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pedidoCompraId` int NOT NULL,
	`produtoId` int NOT NULL,
	`quantidade` int NOT NULL,
	`precoUnitario` int NOT NULL,
	`valorTotal` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itens_pedido_compra_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itens_venda` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendaId` int NOT NULL,
	`produtoId` int NOT NULL,
	`quantidade` int NOT NULL,
	`precoUnitario` int NOT NULL,
	`valorTotal` int NOT NULL,
	`valorDesconto` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itens_venda_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `movimentacoes_caixa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo` enum('SANGRIA','REFORCO','ABERTURA','FECHAMENTO') NOT NULL,
	`valor` int NOT NULL,
	`dataMovimento` timestamp NOT NULL DEFAULT (now()),
	`operadorId` int,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movimentacoes_caixa_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `movimentacoes_estoque` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` int NOT NULL,
	`tipo` enum('ENTRADA_NFE','VENDA_PDV','BAIXA_PERDA','BAIXA_LANCHE','BAIXA_USO','AJUSTE_AUDITORIA','TRANSFERENCIA_ENTRADA','TRANSFERENCIA_SAIDA') NOT NULL,
	`quantidade` int NOT NULL,
	`saldoAnterior` int NOT NULL,
	`saldoAtual` int NOT NULL,
	`custoUnitario` int DEFAULT 0,
	`documentoReferencia` varchar(100),
	`observacao` text,
	`usuarioId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movimentacoes_estoque_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pedidos_compra` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroPedido` varchar(50) NOT NULL,
	`fornecedorId` int NOT NULL,
	`dataPedido` timestamp NOT NULL DEFAULT (now()),
	`dataPrevisaoEntrega` timestamp,
	`valorTotal` int NOT NULL DEFAULT 0,
	`status` enum('PENDENTE','APROVADO','RECEBIDO','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
	`observacao` text,
	`usuarioId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pedidos_compra_id` PRIMARY KEY(`id`),
	CONSTRAINT `pedidos_compra_numeroPedido_unique` UNIQUE(`numeroPedido`)
);
--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`codigoBarras` varchar(50),
	`descricao` varchar(255) NOT NULL,
	`departamentoId` int,
	`unidade` varchar(10) NOT NULL DEFAULT 'UN',
	`precoVenda` int NOT NULL DEFAULT 0,
	`precoCusto` int NOT NULL DEFAULT 0,
	`estoque` int NOT NULL DEFAULT 0,
	`estoqueMinimo` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produtos_id` PRIMARY KEY(`id`),
	CONSTRAINT `produtos_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `vendas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroVenda` varchar(50) NOT NULL,
	`dataVenda` timestamp NOT NULL DEFAULT (now()),
	`valorTotal` int NOT NULL DEFAULT 0,
	`valorDesconto` int NOT NULL DEFAULT 0,
	`valorLiquido` int NOT NULL DEFAULT 0,
	`formaPagamento` varchar(50),
	`status` enum('CONCLUIDA','CANCELADA') NOT NULL DEFAULT 'CONCLUIDA',
	`nfceNumero` varchar(50),
	`nfceChave` varchar(100),
	`operadorId` int,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendas_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendas_numeroVenda_unique` UNIQUE(`numeroVenda`)
);
--> statement-breakpoint
ALTER TABLE `contas_pagar` ADD CONSTRAINT `contas_pagar_fornecedorId_fornecedores_id_fk` FOREIGN KEY (`fornecedorId`) REFERENCES `fornecedores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contas_pagar` ADD CONSTRAINT `contas_pagar_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contas_receber` ADD CONSTRAINT `contas_receber_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventarios` ADD CONSTRAINT `inventarios_usuarioAberturaId_users_id_fk` FOREIGN KEY (`usuarioAberturaId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventarios` ADD CONSTRAINT `inventarios_usuarioFechamentoId_users_id_fk` FOREIGN KEY (`usuarioFechamentoId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventarios_itens` ADD CONSTRAINT `inventarios_itens_inventarioId_inventarios_id_fk` FOREIGN KEY (`inventarioId`) REFERENCES `inventarios`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventarios_itens` ADD CONSTRAINT `inventarios_itens_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itens_pedido_compra` ADD CONSTRAINT `itens_pedido_compra_pedidoCompraId_pedidos_compra_id_fk` FOREIGN KEY (`pedidoCompraId`) REFERENCES `pedidos_compra`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itens_pedido_compra` ADD CONSTRAINT `itens_pedido_compra_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itens_venda` ADD CONSTRAINT `itens_venda_vendaId_vendas_id_fk` FOREIGN KEY (`vendaId`) REFERENCES `vendas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itens_venda` ADD CONSTRAINT `itens_venda_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movimentacoes_caixa` ADD CONSTRAINT `movimentacoes_caixa_operadorId_users_id_fk` FOREIGN KEY (`operadorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movimentacoes_estoque` ADD CONSTRAINT `movimentacoes_estoque_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movimentacoes_estoque` ADD CONSTRAINT `movimentacoes_estoque_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pedidos_compra` ADD CONSTRAINT `pedidos_compra_fornecedorId_fornecedores_id_fk` FOREIGN KEY (`fornecedorId`) REFERENCES `fornecedores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pedidos_compra` ADD CONSTRAINT `pedidos_compra_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `produtos` ADD CONSTRAINT `produtos_departamentoId_departamentos_id_fk` FOREIGN KEY (`departamentoId`) REFERENCES `departamentos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendas` ADD CONSTRAINT `vendas_operadorId_users_id_fk` FOREIGN KEY (`operadorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;