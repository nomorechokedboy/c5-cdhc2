CREATE TABLE `classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`name` text NOT NULL,
	`description` text DEFAULT ''
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classes_name_unique` ON `classes` (`name`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`fullName` text DEFAULT '',
	`birthPlace` text DEFAULT '',
	`address` text DEFAULT '',
	`dob` text DEFAULT '',
	`rank` text DEFAULT '',
	`previousUnit` text DEFAULT '',
	`previousPosition` text DEFAULT '',
	`position` text DEFAULT 'Học viên',
	`ethnic` text DEFAULT '',
	`religion` text DEFAULT 'Không',
	`enlistmentPeriod` text DEFAULT '',
	`politicalOrg` text NOT NULL,
	`politicalOrgOfficialDate` text DEFAULT '',
	`cpvId` text,
	`educationLevel` text DEFAULT '',
	`schoolName` text DEFAULT '',
	`major` text DEFAULT '',
	`isGraduated` integer DEFAULT false,
	`talent` text DEFAULT 'Không',
	`shortcoming` text DEFAULT 'Không',
	`policyBeneficiaryGroup` text DEFAULT 'Không',
	`fatherName` text DEFAULT '',
	`fatherDob` text DEFAULT '',
	`fatherPhoneNumber` text DEFAULT '',
	`fatherJob` text DEFAULT '',
	`motherName` text DEFAULT '',
	`motherDob` text DEFAULT '',
	`motherPhoneNumber` text DEFAULT '',
	`motherJob` text DEFAULT '',
	`isMarried` integer DEFAULT false,
	`spouseName` text DEFAULT '',
	`spouseDob` text DEFAULT '',
	`spouseJob` text DEFAULT '',
	`spousePhoneNumber` text DEFAULT '',
	`childrenInfos` text DEFAULT '[]',
	`familySize` integer,
	`familyBackground` text DEFAULT 'Không',
	`familyBirthOrder` text DEFAULT '',
	`achievement` text DEFAULT 'Không',
	`disciplinaryHistory` text DEFAULT 'Không',
	`phone` text DEFAULT '',
	`classId` integer NOT NULL,
	FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`email` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);