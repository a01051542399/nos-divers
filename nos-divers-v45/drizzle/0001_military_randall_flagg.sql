CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tourId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`amount` int NOT NULL,
	`paidBy` int NOT NULL,
	`splitAmong` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tourId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`date` varchar(100) NOT NULL DEFAULT '',
	`location` varchar(255) NOT NULL DEFAULT '',
	`inviteCode` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tours_id` PRIMARY KEY(`id`),
	CONSTRAINT `tours_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `waivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tourId` int NOT NULL,
	`signerName` varchar(255) NOT NULL,
	`personalInfo` text NOT NULL,
	`healthChecklist` text NOT NULL,
	`healthOther` text,
	`signatureImage` text NOT NULL,
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`agreed` boolean NOT NULL DEFAULT true,
	CONSTRAINT `waivers_id` PRIMARY KEY(`id`)
);
