-- Motor de Promoções Avançado: expande a tabela offers

ALTER TABLE `offers`
  ADD COLUMN `nome` varchar(255) NULL AFTER `produtoId`,
  ADD COLUMN `tipoDesconto` enum('PRECO_FIXO','PERCENTUAL','LEVE_X_PAGUE_Y','DESCONTO_SEGUNDO') NOT NULL DEFAULT 'PRECO_FIXO' AFTER `nome`,
  ADD COLUMN `percentualDesconto` int NOT NULL DEFAULT 0 AFTER `precoOferta`,
  ADD COLUMN `qtdLeve` int NOT NULL DEFAULT 3 AFTER `percentualDesconto`,
  ADD COLUMN `qtdPague` int NOT NULL DEFAULT 2 AFTER `qtdLeve`,
  ADD COLUMN `horaInicio` varchar(5) NULL AFTER `dataFim`,
  ADD COLUMN `horaFim` varchar(5) NULL AFTER `horaInicio`,
  ADD COLUMN `aplicacaoAutomatica` boolean NOT NULL DEFAULT true AFTER `horaFim`,
  ADD COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `createdAt`;

-- Tornar precoOferta opcional (nullable) pois agora pode ser 0 para tipos não fixos
ALTER TABLE `offers`
  MODIFY COLUMN `precoOferta` int NOT NULL DEFAULT 0;
