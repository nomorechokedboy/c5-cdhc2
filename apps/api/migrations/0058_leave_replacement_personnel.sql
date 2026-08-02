-- Người thay thế quân nhân trong thời gian nghỉ phép
ALTER TABLE `leave_requests` ADD COLUMN `replacement_personnel_id` integer;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD COLUMN `replacement_personnel_name` text;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD COLUMN `replacement_position` text;--> statement-breakpoint
ALTER TABLE `leave_records` ADD COLUMN `replacement_personnel_id` integer;--> statement-breakpoint
ALTER TABLE `leave_records` ADD COLUMN `replacement_personnel_name` text;--> statement-breakpoint
ALTER TABLE `leave_records` ADD COLUMN `replacement_position` text;
