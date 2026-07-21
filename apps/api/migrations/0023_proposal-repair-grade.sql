-- REPAIR: lưu dòng nguồn + cấp/mã gốc để chuyển cấp 5 khi đề xuất, về cấp 2 khi sửa xong

ALTER TABLE `asset_proposal_items` ADD COLUMN `source_asset_id` integer;--> statement-breakpoint
ALTER TABLE `asset_proposal_items` ADD COLUMN `original_grade` integer;--> statement-breakpoint
ALTER TABLE `asset_proposal_items` ADD COLUMN `original_code` text;
