ALTER TABLE `expenses` ADD `splitType` varchar(20) DEFAULT 'equal' NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `splitAmounts` text;