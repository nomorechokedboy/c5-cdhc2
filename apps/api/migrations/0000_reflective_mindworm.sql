CREATE TABLE `actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `actions_name_unique` ON `actions` (`name`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`graduatedAt` text,
	`status` text DEFAULT 'ongoing',
	`unitId` integer NOT NULL,
	FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_unit_unique_constraint` ON `classes` (`name`,`unitId`);--> statement-breakpoint
CREATE TABLE `notification_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`notifiableType` text NOT NULL,
	`notifiableId` integer NOT NULL,
	`notificationId` text NOT NULL,
	FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notification_items_notification_idx` ON `notification_items` (`notificationId`);--> statement-breakpoint
CREATE INDEX `notification_items_item_idx` ON `notification_items` (`notifiableType`,`notifiableId`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`readAt` text,
	`notificationType` text DEFAULT 'birthday' NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`isBatch` integer DEFAULT false,
	`batchKey` text,
	`totalCount` integer DEFAULT 1,
	`recipientId` integer,
	`actorId` integer,
	FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recipient_idx` ON `notifications` (`recipientId`);--> statement-breakpoint
CREATE INDEX `batch_idx` ON `notifications` (`batchKey`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`resource_id` integer NOT NULL,
	`action_id` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_name_unique` ON `permissions` (`name`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resources_name_unique` ON `resources` (`name`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` integer NOT NULL,
	`permission_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY(`role_id`, `permission_id`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
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
	`cpvOfficialAt` text,
	`avatar` text,
	`siblings` text DEFAULT '[]',
	`contactPerson` text DEFAULT '{}',
	`studentId` text,
	`relatedDocumentations` text,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`alias` text NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL,
	`parentId` integer,
	FOREIGN KEY (`parentId`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `units_alias_unique` ON `units` (`alias`);--> statement-breakpoint
CREATE UNIQUE INDEX `units_name_unique` ON `units` (`name`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY(`user_id`, `role_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`displayName` text DEFAULT '' NOT NULL,
	`isSuperUser` integer DEFAULT false NOT NULL,
	`unitId` integer,
	`status` text DEFAULT 'pending',
	FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);