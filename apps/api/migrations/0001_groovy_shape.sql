CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`readAt` text,
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
ALTER TABLE `users` ADD `createdAt` text DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` ADD `updatedAt` text DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` ADD `username` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `password` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);