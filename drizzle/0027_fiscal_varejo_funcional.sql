ALTER TABLE `documentos_fiscais` MODIFY COLUMN `modelo` enum('NFE','NFCE','SAT','MFE') NOT NULL;
ALTER TABLE `documentos_fiscais` MODIFY COLUMN `status` enum('RASCUNHO','PENDENTE','VALIDACAO_FALHOU','PRONTO_PARA_ENVIO','PRONTA_PARA_EMISSAO','ASSINADO','ENVIADO','AUTORIZADA','AUTORIZADO','REJEITADA','REJEITADO','DENEGADO','CANCELADA','CANCELADO','CONTINGENCIA','INUTILIZADO') NOT NULL DEFAULT 'RASCUNHO';
ALTER TABLE `documentos_fiscais` ADD `recibo` varchar(80);
ALTER TABLE `documentos_fiscais` ADD `protocoloAutorizacao` varchar(80);
ALTER TABLE `documentos_fiscais` ADD `protocoloCancelamento` varchar(80);
ALTER TABLE `documentos_fiscais` ADD `codigoStatusSefaz` varchar(10);
ALTER TABLE `documentos_fiscais` ADD `motivoStatusSefaz` text;
ALTER TABLE `documentos_fiscais` ADD `xmlGerado` text;
ALTER TABLE `documentos_fiscais` ADD `xmlAssinado` text;
ALTER TABLE `documentos_fiscais` ADD `xmlAutorizado` text;
ALTER TABLE `documentos_fiscais` ADD `xmlCancelamento` text;
ALTER TABLE `documentos_fiscais` ADD `qrcodeUrl` text;
ALTER TABLE `documentos_fiscais` ADD `digestValue` varchar(120);
ALTER TABLE `documentos_fiscais` ADD `autorizadaEm` timestamp NULL;
ALTER TABLE `documentos_fiscais` ADD `inutilizadaEm` timestamp NULL;

CREATE TABLE `certificados_digitais` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `tipo` enum('A1') NOT NULL DEFAULT 'A1',
  `nomeArquivo` varchar(255) NOT NULL,
  `caminhoSeguro` varchar(500) NOT NULL,
  `senhaCriptografada` text,
  `validade` timestamp NULL,
  `cnpj` varchar(20),
  `razaoSocial` varchar(255),
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `certificados_digitais_id` PRIMARY KEY(`id`),
  CONSTRAINT `certificados_digitais_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`)
);

CREATE TABLE `fiscal_eventos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `documentoFiscalId` int,
  `tipo` enum('CANCELAMENTO','CARTA_CORRECAO','INUTILIZACAO','CONSULTA_STATUS','CONSULTA_PROTOCOLO','MANIFESTACAO') NOT NULL,
  `status` enum('PENDENTE','ENVIADO','AUTORIZADO','REJEITADO','ERRO') NOT NULL DEFAULT 'PENDENTE',
  `codigoStatusSefaz` varchar(10),
  `motivoStatusSefaz` text,
  `protocolo` varchar(80),
  `xmlEvento` text,
  `xmlRetorno` text,
  `justificativa` text,
  `sequencia` int DEFAULT 1,
  `usuarioId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `fiscal_eventos_id` PRIMARY KEY(`id`),
  CONSTRAINT `fiscal_eventos_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`),
  CONSTRAINT `fiscal_eventos_documentoFiscalId_documentos_fiscais_id_fk` FOREIGN KEY (`documentoFiscalId`) REFERENCES `documentos_fiscais`(`id`),
  CONSTRAINT `fiscal_eventos_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`)
);

CREATE TABLE `fiscal_transmissoes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `documentoFiscalId` int,
  `tipoOperacao` varchar(80) NOT NULL,
  `ambiente` enum('HOMOLOGACAO','PRODUCAO') NOT NULL DEFAULT 'HOMOLOGACAO',
  `uf` varchar(2),
  `endpoint` varchar(500),
  `requestXml` text,
  `responseXml` text,
  `httpStatus` int,
  `codigoStatusSefaz` varchar(10),
  `motivo` text,
  `duracaoMs` int,
  `erroTecnico` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `fiscal_transmissoes_id` PRIMARY KEY(`id`),
  CONSTRAINT `fiscal_transmissoes_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`),
  CONSTRAINT `fiscal_transmissoes_documentoFiscalId_documentos_fiscais_id_fk` FOREIGN KEY (`documentoFiscalId`) REFERENCES `documentos_fiscais`(`id`)
);

CREATE TABLE `sat_mfe_equipamentos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `pdvId` varchar(50) NOT NULL,
  `tipo` enum('SAT','MFE') NOT NULL,
  `fabricante` varchar(120),
  `modelo` varchar(120),
  `numeroSerie` varchar(120),
  `codigoAtivacaoCriptografado` text,
  `assinaturaAplicativoComercial` text,
  `cnpjSoftwareHouse` varchar(20),
  `status` enum('ATIVO','INATIVO','ERRO','NAO_TESTADO') NOT NULL DEFAULT 'NAO_TESTADO',
  `ultimoTesteComunicacao` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `sat_mfe_equipamentos_id` PRIMARY KEY(`id`),
  CONSTRAINT `sat_mfe_equipamentos_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`)
);

CREATE TABLE `sat_mfe_cupons` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `vendaId` int,
  `equipamentoId` int,
  `modelo` enum('SAT','MFE') NOT NULL,
  `numeroSessao` int,
  `chaveConsulta` varchar(80),
  `numeroCupom` varchar(80),
  `xmlEnvio` text,
  `xmlRetorno` text,
  `xmlCancelamento` text,
  `status` enum('PENDENTE_EQUIPAMENTO','EMITIDO','CANCELADO','REJEITADO','ERRO') NOT NULL DEFAULT 'PENDENTE_EQUIPAMENTO',
  `codigoRetorno` varchar(20),
  `mensagemRetorno` text,
  `qrCode` text,
  `emitidoEm` timestamp NULL,
  `canceladoEm` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `sat_mfe_cupons_id` PRIMARY KEY(`id`),
  CONSTRAINT `sat_mfe_cupons_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`),
  CONSTRAINT `sat_mfe_cupons_vendaId_vendas_id_fk` FOREIGN KEY (`vendaId`) REFERENCES `vendas`(`id`),
  CONSTRAINT `sat_mfe_cupons_equipamentoId_sat_mfe_equipamentos_id_fk` FOREIGN KEY (`equipamentoId`) REFERENCES `sat_mfe_equipamentos`(`id`)
);
