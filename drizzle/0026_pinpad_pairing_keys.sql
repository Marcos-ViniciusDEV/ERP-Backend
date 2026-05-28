CREATE TABLE IF NOT EXISTS `pinpad_pareamento_keys` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `empresaId` int NOT NULL,
  `pdvId` varchar(50) NOT NULL,
  `terminalPagamentoId` int,
  `cnpjEmpresa` varchar(18) NOT NULL,
  `chaveHash` varchar(128) NOT NULL,
  `chavePrefixo` varchar(40) NOT NULL,
  `expiraEm` timestamp NOT NULL,
  `usadaEm` timestamp NULL,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pinpad_keys_empresa_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`),
  CONSTRAINT `pinpad_keys_terminal_fk` FOREIGN KEY (`terminalPagamentoId`) REFERENCES `terminais_pagamento`(`id`),
  INDEX `pinpad_keys_empresa_pdv_idx` (`empresaId`, `pdvId`),
  INDEX `pinpad_keys_hash_idx` (`chaveHash`)
);
