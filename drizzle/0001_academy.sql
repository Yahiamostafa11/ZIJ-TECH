CREATE TABLE `class_group` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`level_id` int NOT NULL,
	`mode` enum('offline','online') NOT NULL,
	`branch_id` int,
	`instructor_id` varchar(36),
	`capacity_min` int NOT NULL,
	`capacity_max` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`start_date` date,
	`status` enum('planned','active','completed','cancelled') NOT NULL DEFAULT 'active',
	`meeting_url` varchar(500),
	`notes` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `class_group_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrollment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`group_id` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`discount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`status` enum('active','completed','withdrawn','transferred') NOT NULL DEFAULT 'active',
	`enrolled_at` datetime NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `enrollment_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollment_student_group_unique` UNIQUE(`student_id`,`group_id`)
);
--> statement-breakpoint
CREATE TABLE `family` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160),
	`notes` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `family_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_slot` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`weekday` tinyint NOT NULL,
	`start_time` time NOT NULL,
	`duration_minutes` int NOT NULL DEFAULT 90,
	CONSTRAINT `group_slot_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guardian` (
	`id` int AUTO_INCREMENT NOT NULL,
	`family_id` int NOT NULL,
	`relation` enum('mother','father','other') NOT NULL,
	`name` varchar(160),
	`phone` varchar(20) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `guardian_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardian_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `import_batch` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`created_by` varchar(36),
	`summary` text NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `import_batch_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `level` (
	`id` int AUTO_INCREMENT NOT NULL,
	`program_id` int NOT NULL,
	`name_ar` varchar(120) NOT NULL,
	`name_en` varchar(120) NOT NULL,
	`position` int NOT NULL DEFAULT 1,
	`session_count` int NOT NULL DEFAULT 12,
	`pass_mark` int NOT NULL DEFAULT 65,
	`remedial_min` int NOT NULL DEFAULT 2,
	`remedial_max` int NOT NULL DEFAULT 4,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `level_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollment_id` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`paid_on` date NOT NULL,
	`method` enum('cash','instapay','vodafone_cash','bank_transfer','other') NOT NULL,
	`reference` varchar(120),
	`notes` text,
	`source` enum('manual','import') NOT NULL DEFAULT 'manual',
	`received_by` varchar(36),
	`created_at` datetime NOT NULL,
	`voided_at` datetime,
	`voided_by` varchar(36),
	`void_reason` varchar(255),
	CONSTRAINT `payment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `program` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name_ar` varchar(120) NOT NULL,
	`name_en` varchar(120) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `program_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student` (
	`id` int AUTO_INCREMENT NOT NULL,
	`family_id` int NOT NULL,
	`name_ar` varchar(160) NOT NULL,
	`name_en` varchar(160),
	`name_key` varchar(160) NOT NULL,
	`birth_date` date,
	`birth_year` smallint,
	`school` varchar(160),
	`notes` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`photo_consent` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `student_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `class_group` ADD CONSTRAINT `class_group_level_id_level_id_fk` FOREIGN KEY (`level_id`) REFERENCES `level`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_group` ADD CONSTRAINT `class_group_branch_id_branch_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_group` ADD CONSTRAINT `class_group_instructor_id_user_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollment` ADD CONSTRAINT `enrollment_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollment` ADD CONSTRAINT `enrollment_group_id_class_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `class_group`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_slot` ADD CONSTRAINT `group_slot_group_id_class_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `class_group`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardian` ADD CONSTRAINT `guardian_family_id_family_id_fk` FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_batch` ADD CONSTRAINT `import_batch_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `level` ADD CONSTRAINT `level_program_id_program_id_fk` FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_enrollment_id_enrollment_id_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_received_by_user_id_fk` FOREIGN KEY (`received_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_voided_by_user_id_fk` FOREIGN KEY (`voided_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student` ADD CONSTRAINT `student_family_id_family_id_fk` FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `class_group_branch_idx` ON `class_group` (`branch_id`);--> statement-breakpoint
CREATE INDEX `class_group_instructor_idx` ON `class_group` (`instructor_id`);--> statement-breakpoint
CREATE INDEX `class_group_level_idx` ON `class_group` (`level_id`);--> statement-breakpoint
CREATE INDEX `enrollment_group_idx` ON `enrollment` (`group_id`);--> statement-breakpoint
CREATE INDEX `group_slot_group_idx` ON `group_slot` (`group_id`);--> statement-breakpoint
CREATE INDEX `guardian_family_idx` ON `guardian` (`family_id`);--> statement-breakpoint
CREATE INDEX `level_program_idx` ON `level` (`program_id`);--> statement-breakpoint
CREATE INDEX `payment_enrollment_idx` ON `payment` (`enrollment_id`);--> statement-breakpoint
CREATE INDEX `payment_paid_on_idx` ON `payment` (`paid_on`);--> statement-breakpoint
CREATE INDEX `student_family_idx` ON `student` (`family_id`);--> statement-breakpoint
CREATE INDEX `student_name_key_idx` ON `student` (`family_id`,`name_key`);