CREATE TABLE `email_change` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `email_change_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_change_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `name_change_request` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name_ar` varchar(160) NOT NULL,
	`name_en` varchar(160),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewed_by` varchar(36),
	`reviewed_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `name_change_request_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_role` MODIFY COLUMN `role` enum('super_admin','academy_admin','branch_admin','moderator','instructor','student','parent') NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `user` ADD `name_ar` varchar(160);--> statement-breakpoint
ALTER TABLE `user` ADD `name_en` varchar(160);--> statement-breakpoint
ALTER TABLE `user` ADD `name_edits_used` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `must_change_password` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `guardian` ADD `user_id` varchar(36);--> statement-breakpoint
ALTER TABLE `student` ADD `user_id` varchar(36);--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_username_unique` UNIQUE(`username`);--> statement-breakpoint
ALTER TABLE `guardian` ADD CONSTRAINT `guardian_user_id_unique` UNIQUE(`user_id`);--> statement-breakpoint
ALTER TABLE `student` ADD CONSTRAINT `student_user_id_unique` UNIQUE(`user_id`);--> statement-breakpoint
ALTER TABLE `email_change` ADD CONSTRAINT `email_change_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `name_change_request` ADD CONSTRAINT `name_change_request_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `name_change_request` ADD CONSTRAINT `name_change_request_reviewed_by_user_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `email_change_user_idx` ON `email_change` (`user_id`);--> statement-breakpoint
CREATE INDEX `name_change_request_status_idx` ON `name_change_request` (`status`);--> statement-breakpoint
ALTER TABLE `guardian` ADD CONSTRAINT `guardian_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student` ADD CONSTRAINT `student_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;