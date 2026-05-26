ALTER TABLE `empresas`
  ADD COLUMN `bloqueado` boolean NOT NULL DEFAULT false,
  ADD COLUMN `motivoBloqueio` text,
  ADD COLUMN `dataBloqueio` timestamp NULL,
  ADD COLUMN `dataDesbloqueio` timestamp NULL,
  ADD COLUMN `limiteUsuarios` int DEFAULT 5,
  ADD COLUMN `limitePdvs` int DEFAULT 2,
  ADD COLUMN `limiteProdutos` int DEFAULT 1000;

CREATE TABLE `planos_saas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `nome` varchar(100) NOT NULL,
  `codigo` varchar(30) NOT NULL,
  `descricao` text,
  `precoMensal` int NOT NULL DEFAULT 0,
  `precoAnual` int DEFAULT 0,
  `limiteUsuarios` int NOT NULL DEFAULT 1,
  `limitePdvs` int NOT NULL DEFAULT 1,
  `limiteProdutos` int NOT NULL DEFAULT 500,
  `modulosPermitidos` text,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `planos_saas_id` PRIMARY KEY(`id`),
  CONSTRAINT `planos_saas_codigo_unique` UNIQUE(`codigo`)
);

CREATE TABLE `assinaturas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `planoId` int NOT NULL,
  `status` enum('ATIVA','INADIMPLENTE','CANCELADA','SUSPENSA','TRIAL') NOT NULL DEFAULT 'TRIAL',
  `dataInicio` timestamp NOT NULL DEFAULT (now()),
  `dataFim` timestamp NULL,
  `dataProximoVencimento` timestamp NULL,
  `valorMensal` int DEFAULT 0,
  `diasTrial` int DEFAULT 7,
  `observacao` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `assinaturas_id` PRIMARY KEY(`id`),
  CONSTRAINT `assinaturas_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`),
  CONSTRAINT `assinaturas_planoId_planos_saas_id_fk` FOREIGN KEY (`planoId`) REFERENCES `planos_saas`(`id`)
);

CREATE TABLE `licencas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `tipo` enum('ERP_WEB','PDV_DESKTOP','PDV_MOBILE','API') NOT NULL,
  `chave` varchar(64) NOT NULL,
  `status` enum('ATIVA','REVOGADA','EXPIRADA') NOT NULL DEFAULT 'ATIVA',
  `dispositivoNome` varchar(100),
  `dispositivoId` varchar(100),
  `dataAtivacao` timestamp DEFAULT (now()),
  `dataExpiracao` timestamp NULL,
  `ultimoUso` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `licencas_id` PRIMARY KEY(`id`),
  CONSTRAINT `licencas_chave_unique` UNIQUE(`chave`),
  CONSTRAINT `licencas_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`)
);
