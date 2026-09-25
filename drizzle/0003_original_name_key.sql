ALTER TABLE `student` ADD `original_name_key` varchar(160);--> statement-breakpoint
UPDATE `student` SET `original_name_key` = `name_key` WHERE `original_name_key` IS NULL;
