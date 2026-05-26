CREATE TABLE `support_tickets` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `usuarioId` int,
  `tipo` enum('SUPORTE','BUG','MELHORIA') NOT NULL DEFAULT 'SUPORTE',
  `titulo` varchar(255) NOT NULL,
  `descricao` text NOT NULL,
  `categoria` varchar(100),
  `prioridade` enum('BAIXA','MEDIA','ALTA','CRITICA') NOT NULL DEFAULT 'MEDIA',
  `status` enum('ABERTO','EM_ANALISE','EM_ANDAMENTO','RESOLVIDO','FECHADO') NOT NULL DEFAULT 'ABERTO',
  `modulo` varchar(100),
  `passosReproducao` text,
  `resposta` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`),
  CONSTRAINT `support_tickets_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`),
  CONSTRAINT `support_tickets_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`)
);

CREATE TABLE `support_articles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int,
  `titulo` varchar(255) NOT NULL,
  `resumo` text,
  `conteudo` text NOT NULL,
  `categoria` varchar(100),
  `tags` text,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `support_articles_id` PRIMARY KEY(`id`),
  CONSTRAINT `support_articles_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`)
);

CREATE TABLE `support_tutorials` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int,
  `titulo` varchar(255) NOT NULL,
  `descricao` text,
  `conteudo` text NOT NULL,
  `modulo` varchar(100),
  `tempoEstimado` varchar(50),
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `support_tutorials_id` PRIMARY KEY(`id`),
  CONSTRAINT `support_tutorials_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`)
);
