CREATE TABLE `announcement` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('notice','mention','post') NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text,
	`link` varchar(500),
	`to_all` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `announcement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcement_read` (
	`id` int AUTO_INCREMENT NOT NULL,
	`announcement_id` int NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`read_at` datetime NOT NULL,
	CONSTRAINT `announcement_read_id` PRIMARY KEY(`id`),
	CONSTRAINT `announcement_read_unique` UNIQUE(`announcement_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `announcement_target` (
	`id` int AUTO_INCREMENT NOT NULL,
	`announcement_id` int NOT NULL,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `announcement_target_id` PRIMARY KEY(`id`),
	CONSTRAINT `announcement_target_unique` UNIQUE(`announcement_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `assignment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`session_id` int,
	`title` varchar(200) NOT NULL,
	`instructions` text,
	`link` varchar(500),
	`due_at` datetime NOT NULL,
	`max_score` int NOT NULL DEFAULT 10,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `assignment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level_id` int NOT NULL,
	`number` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`summary` text,
	`updated_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `lesson_id` PRIMARY KEY(`id`),
	CONSTRAINT `lesson_level_number_unique` UNIQUE(`level_id`,`number`)
);
--> statement-breakpoint
CREATE TABLE `lesson_resource` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lesson_id` int NOT NULL,
	`kind` enum('drive','youtube','file','image','audio','link') NOT NULL,
	`title` varchar(200) NOT NULL,
	`url` varchar(500) NOT NULL,
	`teacher_only` boolean NOT NULL DEFAULT false,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `lesson_resource_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submission` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`student_id` int NOT NULL,
	`url` varchar(500),
	`note` varchar(1000),
	`submitted_at` datetime,
	`score` decimal(5,2),
	`feedback` varchar(1000),
	`graded_at` datetime,
	`graded_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `submission_id` PRIMARY KEY(`id`),
	CONSTRAINT `submission_assignment_student_unique` UNIQUE(`assignment_id`,`student_id`)
);
--> statement-breakpoint
ALTER TABLE `announcement` ADD CONSTRAINT `announcement_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcement_read` ADD CONSTRAINT `announcement_read_announcement_id_announcement_id_fk` FOREIGN KEY (`announcement_id`) REFERENCES `announcement`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcement_read` ADD CONSTRAINT `announcement_read_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcement_target` ADD CONSTRAINT `announcement_target_announcement_id_announcement_id_fk` FOREIGN KEY (`announcement_id`) REFERENCES `announcement`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcement_target` ADD CONSTRAINT `announcement_target_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment` ADD CONSTRAINT `assignment_group_id_class_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `class_group`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment` ADD CONSTRAINT `assignment_session_id_class_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `class_session`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment` ADD CONSTRAINT `assignment_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson` ADD CONSTRAINT `lesson_level_id_level_id_fk` FOREIGN KEY (`level_id`) REFERENCES `level`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson` ADD CONSTRAINT `lesson_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_resource` ADD CONSTRAINT `lesson_resource_lesson_id_lesson_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_resource` ADD CONSTRAINT `lesson_resource_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission` ADD CONSTRAINT `submission_assignment_id_assignment_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission` ADD CONSTRAINT `submission_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submission` ADD CONSTRAINT `submission_graded_by_user_id_fk` FOREIGN KEY (`graded_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assignment_group_idx` ON `assignment` (`group_id`,`due_at`);--> statement-breakpoint
CREATE INDEX `lesson_resource_lesson_idx` ON `lesson_resource` (`lesson_id`);