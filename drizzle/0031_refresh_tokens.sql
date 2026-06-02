CREATE TABLE `refresh_tokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `usuarioId` int NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `expiraEm` timestamp NOT NULL,
  `revogadoEm` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`),
  CONSTRAINT `refresh_tokens_tokenHash_unique` UNIQUE(`tokenHash`),
  CONSTRAINT `refresh_tokens_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`)
);
