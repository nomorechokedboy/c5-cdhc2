-- Vị trí VT trên đề xuất (phòng nguồn / kho đích) — phục vụ thu hồi & thanh lý

ALTER TABLE `asset_proposal_items` ADD COLUMN `from_room_id` integer;--> statement-breakpoint
ALTER TABLE `asset_proposal_items` ADD COLUMN `from_room_code` text;--> statement-breakpoint
ALTER TABLE `asset_proposal_items` ADD COLUMN `from_room_name` text;--> statement-breakpoint
ALTER TABLE `asset_proposal_items` ADD COLUMN `location_note` text;--> statement-breakpoint
ALTER TABLE `asset_proposal_items` ADD COLUMN `target_room_id` integer;--> statement-breakpoint
ALTER TABLE `asset_proposal_items` ADD COLUMN `target_room_code` text;--> statement-breakpoint
ALTER TABLE `asset_proposal_items` ADD COLUMN `target_room_name` text;
