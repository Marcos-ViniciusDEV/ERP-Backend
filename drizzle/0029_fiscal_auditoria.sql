CREATE TABLE `fiscal_auditoria` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `usuarioId` int,
  `acao` varchar(80) NOT NULL,
  `entidade` varchar(80) NOT NULL,
  `entidadeId` varchar(80),
  `detalhesJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `fiscal_auditoria_id` PRIMARY KEY(`id`),
  CONSTRAINT `fiscal_auditoria_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`),
  CONSTRAINT `fiscal_auditoria_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`)
);
