CREATE TABLE `payroll_adjustment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instructor_id` varchar(36) NOT NULL,
	`month` varchar(7) NOT NULL,
	`kind` enum('bonus','deduction') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`reason` varchar(255) NOT NULL,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `payroll_adjustment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_payment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instructor_id` varchar(36) NOT NULL,
	`month` varchar(7) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`method` enum('cash','instapay','vodafone_cash','bank_transfer','other') NOT NULL,
	`reference` varchar(120),
	`paid_on` date NOT NULL,
	`notes` varchar(500),
	`sessions_amount` decimal(10,2) NOT NULL,
	`bonuses` decimal(10,2) NOT NULL,
	`deductions` decimal(10,2) NOT NULL,
	`paid_before` decimal(10,2) NOT NULL,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	`voided_at` datetime,
	`voided_by` varchar(36),
	`void_reason` varchar(255),
	CONSTRAINT `payroll_payment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `payroll_adjustment` ADD CONSTRAINT `payroll_adjustment_instructor_id_user_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_adjustment` ADD CONSTRAINT `payroll_adjustment_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_payment` ADD CONSTRAINT `payroll_payment_instructor_id_user_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_payment` ADD CONSTRAINT `payroll_payment_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_payment` ADD CONSTRAINT `payroll_payment_voided_by_user_id_fk` FOREIGN KEY (`voided_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payroll_adjustment_month_idx` ON `payroll_adjustment` (`instructor_id`,`month`);--> statement-breakpoint
CREATE INDEX `payroll_payment_month_idx` ON `payroll_payment` (`instructor_id`,`month`);