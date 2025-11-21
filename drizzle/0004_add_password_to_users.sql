-- Adicionar coluna de senha aos usuários
-- ALTER TABLE `users` ADD COLUMN `password` LONGTEXT NOT NULL DEFAULT '' AFTER `email`;
ALTER TABLE `users` MODIFY COLUMN `email` VARCHAR(320) NOT NULL UNIQUE;
ALTER TABLE `users` MODIFY COLUMN `loginMethod` VARCHAR(64) NOT NULL DEFAULT 'local';
