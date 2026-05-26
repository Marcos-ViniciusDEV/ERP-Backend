ALTER TABLE `support_tutorials` ADD `youtubeUrl` varchar(500);
ALTER TABLE `support_tutorials` ADD `youtubeVideoId` varchar(32);
ALTER TABLE `support_tutorials` ADD `fixado` boolean NOT NULL DEFAULT false;
ALTER TABLE `support_tutorials` ADD `ordem` int DEFAULT 0;
