ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','pdv_operator') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `supervisorPassword` text;