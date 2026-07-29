-- Đề xuất user: sửa chữa / thu hồi-trả / thanh lý + nhật ký + quyết định thanh lý

CREATE TABLE IF NOT EXISTS `asset_proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`proposal_type` text NOT NULL,
	`status` text NOT NULL DEFAULT 'PENDING',
	`title` text NOT NULL,
	`description` text,
	`unit_id` integer,
	`unit_name` text,
	`nganh_code` text,
	`proposed_by_user_id` integer,
	`proposed_by_username` text,
	`proposed_by_display_name` text,
	`admin_note` text,
	`decision_number` text,
	`decision_nganh_code` text,
	`decision_issuing_level` text,
	`decision_signer` text,
	`decision_at` text,
	`decided_by_user_id` integer,
	`decided_by_username` text,
	`decided_by_display_name` text,
	`completed_at` text
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `asset_proposals_status_idx` ON `asset_proposals` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_proposals_type_idx` ON `asset_proposals` (`proposal_type`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_proposals_proposed_by_idx` ON `asset_proposals` (`proposed_by_user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_proposals_created_idx` ON `asset_proposals` (`createdAt`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `asset_proposal_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`proposal_id` integer NOT NULL,
	`material_id` integer,
	`material_code` text,
	`material_name` text NOT NULL,
	`room_asset_id` integer,
	`quantity` integer NOT NULL DEFAULT 1,
	`unit` text,
	`category` text,
	`nganh_code` text,
	`chuyen_nganh_code` text,
	`note` text,
	FOREIGN KEY (`proposal_id`) REFERENCES `asset_proposals`(`id`) ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `asset_proposal_items_proposal_idx` ON `asset_proposal_items` (`proposal_id`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `asset_proposal_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`proposal_id` integer,
	`action` text NOT NULL,
	`proposal_type` text,
	`summary` text NOT NULL,
	`details` text,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text,
	`actor_is_admin` integer NOT NULL DEFAULT 0
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `asset_proposal_logs_proposal_idx` ON `asset_proposal_logs` (`proposal_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_proposal_logs_created_idx` ON `asset_proposal_logs` (`createdAt`);
