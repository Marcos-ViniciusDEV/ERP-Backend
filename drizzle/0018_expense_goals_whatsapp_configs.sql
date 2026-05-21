CREATE TABLE IF NOT EXISTS `expense_goals` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `empresaId` int NOT NULL,
  `month` int NOT NULL,
  `year` int NOT NULL,
  `targetAmount` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `expense_goals_empresaId_empresas_id_fk`
    FOREIGN KEY (`empresaId`) REFERENCES `empresas` (`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `whatsapp_configs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `empresaId` int NOT NULL,
  `phoneNumber` varchar(20) NOT NULL,
  `defaultMessage` text,
  `businessHoursStart` varchar(5),
  `businessHoursEnd` varchar(5),
  `enabled` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `whatsapp_configs_empresaId_empresas_id_fk`
    FOREIGN KEY (`empresaId`) REFERENCES `empresas` (`id`)
);
