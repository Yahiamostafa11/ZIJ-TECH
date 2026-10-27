CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`student_id` int NOT NULL,
	`status` enum('present','late','absent','excused') NOT NULL,
	`understanding` tinyint,
	`computational` tinyint,
	`building` tinyint,
	`creativity` tinyint,
	`collaboration` tinyint,
	`conduct` tinyint,
	`note` varchar(500),
	`recorded_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_session_student_unique` UNIQUE(`session_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `class_session` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`kind` enum('regular','remedial') NOT NULL DEFAULT 'regular',
	`number` int NOT NULL,
	`scheduled_at` datetime NOT NULL,
	`duration_minutes` int NOT NULL DEFAULT 90,
	`status` enum('scheduled','held','cancelled') NOT NULL DEFAULT 'scheduled',
	`original_scheduled_at` datetime,
	`postpone_reason` varchar(255),
	`held_at` datetime,
	`held_by` varchar(36),
	`held_mode` enum('offline','online'),
	`rate` decimal(10,2),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `class_session_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_session_group_kind_number_unique` UNIQUE(`group_id`,`kind`,`number`)
);
--> statement-breakpoint
CREATE TABLE `instructor_rate` (
	`user_id` varchar(36) NOT NULL,
	`rate_offline` decimal(10,2) NOT NULL,
	`rate_online` decimal(10,2) NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `instructor_rate_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `student_request` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`requested_by` varchar(36),
	`name_ar` varchar(160) NOT NULL,
	`name_en` varchar(160),
	`birth_date` date,
	`mother_phone` varchar(20),
	`father_phone` varchar(20),
	`notes` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewed_by` varchar(36),
	`reviewed_at` datetime,
	`review_note` varchar(255),
	`student_id` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `student_request_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_session_id_class_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `class_session`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_recorded_by_user_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_session` ADD CONSTRAINT `class_session_group_id_class_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `class_group`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_session` ADD CONSTRAINT `class_session_held_by_user_id_fk` FOREIGN KEY (`held_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `instructor_rate` ADD CONSTRAINT `instructor_rate_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_request` ADD CONSTRAINT `student_request_group_id_class_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `class_group`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_request` ADD CONSTRAINT `student_request_requested_by_user_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_request` ADD CONSTRAINT `student_request_reviewed_by_user_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_request` ADD CONSTRAINT `student_request_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_student_idx` ON `attendance` (`student_id`);--> statement-breakpoint
CREATE INDEX `class_session_scheduled_idx` ON `class_session` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `class_session_held_by_idx` ON `class_session` (`held_by`,`held_at`);--> statement-breakpoint
CREATE INDEX `student_request_status_idx` ON `student_request` (`status`);--> statement-breakpoint
CREATE INDEX `student_request_group_idx` ON `student_request` (`group_id`);