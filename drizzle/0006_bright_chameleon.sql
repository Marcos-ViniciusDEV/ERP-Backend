CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cpfCnpj` varchar(20),
	`email` varchar(320),
	`telefone` varchar(20),
	`endereco` text,
	`fotoCaminho` varchar(255),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`),
	CONSTRAINT `clientes_cpfCnpj_unique` UNIQUE(`cpfCnpj`)
);
