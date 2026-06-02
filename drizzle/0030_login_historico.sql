CREATE TABLE `login_historico` (
  `id` int AUTO_INCREMENT NOT NULL,
  `usuarioId` int,
  `identificador` varchar(320) NOT NULL,
  `codigoEmpresa` varchar(120),
  `sucesso` boolean NOT NULL DEFAULT false,
  `ip` varchar(80),
  `userAgent` varchar(500),
  `motivo` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `login_historico_id` PRIMARY KEY(`id`),
  CONSTRAINT `login_historico_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`)
);
