CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(48) NOT NULL,
	`session_id` int NOT NULL,
	`student_id` int NOT NULL,
	`respondent` enum('parent','student') NOT NULL,
	`form` enum('short','long') NOT NULL,
	`answers` text,
	`submitted_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `feedback_token_unique` UNIQUE(`token`),
	CONSTRAINT `feedback_session_student_respondent_unique` UNIQUE(`session_id`,`student_id`,`respondent`)
);
--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_session_id_class_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `class_session`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `feedback_student_idx` ON `feedback` (`student_id`);