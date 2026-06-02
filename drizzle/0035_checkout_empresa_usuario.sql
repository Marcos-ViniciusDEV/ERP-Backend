ALTER TABLE `checkout_assinaturas`
  ADD COLUMN `empresaId` int NULL AFTER `uuid`,
  ADD COLUMN `usuarioId` int NULL AFTER `empresaId`,
  ADD CONSTRAINT `checkout_assinaturas_empresaId_empresas_id_fk`
    FOREIGN KEY (`empresaId`) REFERENCES `empresas`(`id`),
  ADD CONSTRAINT `checkout_assinaturas_usuarioId_users_id_fk`
    FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`);
