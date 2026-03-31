ALTER TABLE `expenses` ADD `lastModifiedBy` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `participants` ADD `lastModifiedBy` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tours` ADD `accessCode` varchar(4) DEFAULT '0000' NOT NULL;--> statement-breakpoint
ALTER TABLE `tours` ADD `createdBy` varchar(255) DEFAULT '' NOT NULL;