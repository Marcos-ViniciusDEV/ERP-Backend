CREATE TABLE `fiscal_provedor_global_credenciais` (
  `id` int AUTO_INCREMENT NOT NULL,
  `provedor` enum('FOCUS_NFE') NOT NULL,
  `ambiente` enum('HOMOLOGACAO','PRODUCAO') NOT NULL DEFAULT 'HOMOLOGACAO',
  `tokenCriptografado` text NOT NULL,
  `baseUrl` varchar(500),
  `companyId` varchar(120),
  `ativo` boolean NOT NULL DEFAULT true,
  `atualizadoPorUsuarioId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fiscal_provedor_global_credenciais_id` PRIMARY KEY(`id`)
);
