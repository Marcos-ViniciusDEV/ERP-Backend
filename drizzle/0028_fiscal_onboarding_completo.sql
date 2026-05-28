ALTER TABLE `empresas` ADD `inscricaoEstadual` varchar(20);
ALTER TABLE `empresas` ADD `inscricaoMunicipal` varchar(20);
ALTER TABLE `empresas` ADD `crt` enum('1','2','3') DEFAULT '1';
ALTER TABLE `empresas` ADD `cnae` varchar(10);
ALTER TABLE `empresas` ADD `telefone` varchar(20);
ALTER TABLE `empresas` ADD `emailFiscal` varchar(320);
ALTER TABLE `empresas` ADD `logradouro` varchar(255);
ALTER TABLE `empresas` ADD `numero` varchar(20);
ALTER TABLE `empresas` ADD `complemento` varchar(120);
ALTER TABLE `empresas` ADD `bairro` varchar(120);
ALTER TABLE `empresas` ADD `municipio` varchar(120);
ALTER TABLE `empresas` ADD `codigoMunicipio` varchar(10);
ALTER TABLE `empresas` ADD `uf` varchar(2);
ALTER TABLE `empresas` ADD `cep` varchar(10);

ALTER TABLE `vendas` ADD `clienteId` int;
ALTER TABLE `vendas` ADD CONSTRAINT `vendas_clienteId_clientes_id_fk` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`);

CREATE TABLE `fiscal_provedor_credenciais` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `provedor` enum('FOCUS_NFE','NFE_IO','PLUGNOTAS') NOT NULL,
  `ambiente` enum('HOMOLOGACAO','PRODUCAO') NOT NULL DEFAULT 'HOMOLOGACAO',
  `tokenCriptografado` text NOT NULL,
  `baseUrl` varchar(500),
  `companyId` varchar(120),
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fiscal_provedor_credenciais_id` PRIMARY KEY(`id`),
  CONSTRAINT `fiscal_provedor_credenciais_empresaId_empresas_id_fk` FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`)
);

ALTER TABLE `clientes` ADD `razaoSocial` varchar(255);
ALTER TABLE `clientes` ADD `nomeFantasia` varchar(255);
ALTER TABLE `clientes` ADD `tipoPessoa` enum('FISICA','JURIDICA','ESTRANGEIRO') NOT NULL DEFAULT 'FISICA';
ALTER TABLE `clientes` ADD `inscricaoEstadual` varchar(20);
ALTER TABLE `clientes` ADD `indicadorInscricaoEstadual` enum('1','2','9') DEFAULT '9';
ALTER TABLE `clientes` ADD `logradouro` varchar(255);
ALTER TABLE `clientes` ADD `numero` varchar(20);
ALTER TABLE `clientes` ADD `complemento` varchar(120);
ALTER TABLE `clientes` ADD `bairro` varchar(120);
ALTER TABLE `clientes` ADD `municipio` varchar(120);
ALTER TABLE `clientes` ADD `codigoMunicipio` varchar(10);
ALTER TABLE `clientes` ADD `uf` varchar(2);
ALTER TABLE `clientes` ADD `cep` varchar(10);
ALTER TABLE `clientes` ADD `pais` varchar(60) DEFAULT 'Brasil';
