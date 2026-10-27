CREATE TABLE `certificate` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`student_id` int NOT NULL,
	`group_id` int NOT NULL,
	`level_id` int NOT NULL,
	`score` decimal(5,2),
	`issued_at` datetime NOT NULL,
	`issued_by` varchar(36),
	`revoked_at` datetime,
	CONSTRAINT `certificate_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificate_code_unique` UNIQUE(`code`),
	CONSTRAINT `certificate_group_student_unique` UNIQUE(`group_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `group_grading` (
	`group_id` int NOT NULL,
	`sessions` int NOT NULL DEFAULT 30,
	`attendance` int NOT NULL DEFAULT 10,
	`quizzes` int NOT NULL DEFAULT 30,
	`assignments` int NOT NULL DEFAULT 10,
	`project` int NOT NULL DEFAULT 20,
	`pass_mark` int NOT NULL DEFAULT 65,
	`updated_by` varchar(36),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `group_grading_group_id` PRIMARY KEY(`group_id`)
);
--> statement-breakpoint
CREATE TABLE `instructor_certificate` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`issued_on` date NOT NULL,
	`url` varchar(500) NOT NULL,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `instructor_certificate_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_score` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`student_id` int NOT NULL,
	`score` decimal(5,2) NOT NULL,
	`note` varchar(500),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `project_score_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_score_group_student_unique` UNIQUE(`group_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `quiz` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`instructions` text,
	`purpose` enum('homework','inclass') NOT NULL DEFAULT 'homework',
	`time_limit` int,
	`opens_at` datetime NOT NULL,
	`closes_at` datetime NOT NULL,
	`shuffle` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `quiz_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_attempt` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quiz_id` int NOT NULL,
	`student_id` int NOT NULL,
	`layout` text NOT NULL,
	`answers` text,
	`started_at` datetime NOT NULL,
	`submitted_at` datetime,
	`auto_score` decimal(7,2),
	`essay_scores` text,
	`score` decimal(7,2),
	`focus_losses` int NOT NULL DEFAULT 0,
	`copy_events` int NOT NULL DEFAULT 0,
	`event_log` text,
	`instructor_note` varchar(1000),
	`graded_at` datetime,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `quiz_attempt_id` PRIMARY KEY(`id`),
	CONSTRAINT `quiz_attempt_quiz_student_unique` UNIQUE(`quiz_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_question` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quiz_id` int NOT NULL,
	`position` int NOT NULL,
	`kind` enum('mcq','essay') NOT NULL,
	`text` text NOT NULL,
	`options` text,
	`correct` int,
	`points` decimal(6,2) NOT NULL,
	CONSTRAINT `quiz_question_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `remedial_student` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`student_id` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `remedial_student_id` PRIMARY KEY(`id`),
	CONSTRAINT `remedial_student_unique` UNIQUE(`group_id`,`student_id`)
);
--> statement-breakpoint
ALTER TABLE `certificate` ADD CONSTRAINT `certificate_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate` ADD CONSTRAINT `certificate_group_id_class_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `class_group`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate` ADD CONSTRAINT `certificate_level_id_level_id_fk` FOREIGN KEY (`level_id`) REFERENCES `level`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate` ADD CONSTRAINT `certificate_issued_by_user_id_fk` FOREIGN KEY (`issued_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_grading` ADD CONSTRAINT `group_grading_group_id_class_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `class_group`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_grading` ADD CONSTRAINT `group_grading_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `instructor_certificate` ADD CONSTRAINT `instructor_certificate_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `instructor_certificate` ADD CONSTRAINT `instructor_certificate_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_score` ADD CONSTRAINT `project_score_group_id_class_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `class_group`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_score` ADD CONSTRAINT `project_score_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz` ADD CONSTRAINT `quiz_group_id_class_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `class_group`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz` ADD CONSTRAINT `quiz_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_attempt` ADD CONSTRAINT `quiz_attempt_quiz_id_quiz_id_fk` FOREIGN KEY (`quiz_id`) REFERENCES `quiz`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_attempt` ADD CONSTRAINT `quiz_attempt_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_question` ADD CONSTRAINT `quiz_question_quiz_id_quiz_id_fk` FOREIGN KEY (`quiz_id`) REFERENCES `quiz`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `remedial_student` ADD CONSTRAINT `remedial_student_group_id_class_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `class_group`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `remedial_student` ADD CONSTRAINT `remedial_student_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `instructor_certificate_user_idx` ON `instructor_certificate` (`user_id`);--> statement-breakpoint
CREATE INDEX `quiz_group_idx` ON `quiz` (`group_id`);--> statement-breakpoint
CREATE INDEX `quiz_question_quiz_idx` ON `quiz_question` (`quiz_id`,`position`);