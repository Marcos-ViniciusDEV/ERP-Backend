ALTER TABLE `produtos` ADD `ncm` varchar(8);
ALTER TABLE `produtos` ADD `cest` varchar(7);
ALTER TABLE `produtos` ADD `origem` int DEFAULT 0;
ALTER TABLE `produtos` ADD `cstIcms` varchar(4);
ALTER TABLE `produtos` ADD `csosnIcms` varchar(4);
ALTER TABLE `produtos` ADD `cfopPadraoVenda` varchar(4);
ALTER TABLE `produtos` ADD `aliquotaIcms` int DEFAULT 0;
ALTER TABLE `produtos` ADD `aliquotaPis` int DEFAULT 0;
ALTER TABLE `produtos` ADD `aliquotaCofins` int DEFAULT 0;
ALTER TABLE `produtos` ADD `pisCst` varchar(2);
ALTER TABLE `produtos` ADD `cofinsCst` varchar(2);

CREATE TABLE `configuracoes_fiscais` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `habilitarNfce` boolean NOT NULL DEFAULT false,
  `ambiente` enum('HOMOLOGACAO','PRODUCAO') NOT NULL DEFAULT 'HOMOLOGACAO',
  `regimeTributario` enum('SIMPLES_NACIONAL','LUCRO_PRESUMIDO','LUCRO_REAL') NOT NULL DEFAULT 'SIMPLES_NACIONAL',
  `certificadoDigitalCaminho` varchar(500),
  `certificadoDigitalSenha` text,
  `certificadoValidade` timestamp,
  `proximoNumeroNfce` int NOT NULL DEFAULT 1,
  `proximoNumeroNfe` int NOT NULL DEFAULT 1,
  `serieNfce` int NOT NULL DEFAULT 1,
  `serieNfe` int NOT NULL DEFAULT 1,
  `idTokenIsc` varchar(10),
  `csc` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `configuracoes_fiscais_id` PRIMARY KEY(`id`)
);

CREATE TABLE `documentos_fiscais` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `vendaId` int,
  `modelo` enum('NFE','NFCE') NOT NULL,
  `ambiente` enum('HOMOLOGACAO','PRODUCAO') NOT NULL DEFAULT 'HOMOLOGACAO',
  `status` enum('RASCUNHO','PENDENTE','VALIDACAO_FALHOU','PRONTA_PARA_EMISSAO','AUTORIZADA','REJEITADA','CANCELADA','CONTINGENCIA') NOT NULL DEFAULT 'RASCUNHO',
  `numero` int,
  `serie` int,
  `chaveAcesso` varchar(60),
  `protocolo` varchar(80),
  `motivoStatus` text,
  `xml` text,
  `danfeUrl` varchar(500),
  `justificativaCancelamento` text,
  `emitidaEm` timestamp,
  `canceladaEm` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `documentos_fiscais_id` PRIMARY KEY(`id`)
);

ALTER TABLE `configuracoes_fiscais` ADD CONSTRAINT `configuracoes_fiscais_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `documentos_fiscais` ADD CONSTRAINT `documentos_fiscais_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `documentos_fiscais` ADD CONSTRAINT `documentos_fiscais_vendaId_vendas_id_fk` FOREIGN KEY (`vendaId`) REFERENCES `vendas`(`id`) ON DELETE no action ON UPDATE no action;
