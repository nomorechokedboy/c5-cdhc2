-- Track repair lifecycle on room assets (for reports & Excel export)
ALTER TABLE `room_assets` ADD `broken_at` text;--> statement-breakpoint
ALTER TABLE `room_assets` ADD `repair_started_at` text;--> statement-breakpoint
ALTER TABLE `room_assets` ADD `repair_completed_at` text;--> statement-breakpoint
ALTER TABLE `room_assets` ADD `repair_performer` text;
