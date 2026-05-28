ALTER TABLE `credenciais_pagamento`
  ADD COLUMN `providerConfigJson` text AFTER `webhookSecretEncrypted`;
