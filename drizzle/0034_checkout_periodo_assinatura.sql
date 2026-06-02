ALTER TABLE `checkout_assinaturas`
  ADD COLUMN `periodoMeses` int NOT NULL DEFAULT 1 AFTER `valorCentavos`;
