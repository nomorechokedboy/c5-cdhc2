-- Báo hỏng theo số lượng (không đánh hỏng cả dòng VT)
ALTER TABLE `repair_requests` ADD COLUMN `quantity` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `repair_requests` ADD COLUMN `source_asset_id` integer REFERENCES `room_assets`(`id`) ON DELETE SET NULL;
