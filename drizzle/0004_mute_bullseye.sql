ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) NOT NULL DEFAULT 'local';--> statement-breakpoint
-- ALTER TABLE `users` ADD `password` text NOT NULL;--> statement-breakpoint
-- ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);