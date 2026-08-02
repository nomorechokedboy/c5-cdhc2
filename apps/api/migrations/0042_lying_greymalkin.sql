CREATE TABLE `account_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`action` text NOT NULL,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text,
	`actor_is_admin` integer DEFAULT 0 NOT NULL,
	`room_id` integer,
	`room_code` text,
	`room_name` text,
	`address` text,
	`floor_name` text,
	`building_code` text,
	`building_name` text,
	`account_label` text,
	`summary` text NOT NULL,
	`details` text
);
--> statement-breakpoint
CREATE TABLE `asset_broken_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`event_type` text NOT NULL,
	`source_type` text DEFAULT 'OTHER' NOT NULL,
	`source_id` integer,
	`proposal_id` integer,
	`repair_request_id` integer,
	`room_asset_id` integer,
	`source_asset_id` integer,
	`asset_code` text,
	`original_code` text,
	`asset_name` text NOT NULL,
	`category` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`original_grade` integer,
	`grade_after` integer,
	`status_after` text,
	`room_id` integer,
	`room_code` text,
	`room_name` text,
	`floor_name` text,
	`building_code` text,
	`building_name` text,
	`unit_name` text,
	`nganh_code` text,
	`reason` text,
	`result_note` text,
	`performer` text,
	`event_at` text NOT NULL,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text
);
--> statement-breakpoint
CREATE TABLE `asset_movement_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_asset_id` integer,
	`movement_type` text NOT NULL,
	`executed_at` text NOT NULL,
	`executing_unit` text,
	`install_address` text,
	`asset_code` text,
	`asset_name` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`quantity_before` integer DEFAULT 0 NOT NULL,
	`quantity_after` integer DEFAULT 0 NOT NULL,
	`grade` integer DEFAULT 1 NOT NULL,
	`manufacture_year` integer,
	`usage_year` integer,
	`reason_code` text,
	`reason_other` text,
	`decision_date` text,
	`decision_number` text,
	`signer` text,
	`performer` text,
	`explanation` text,
	`note` text,
	`building_code` text,
	`building_name` text,
	`room_code` text,
	`room_name` text,
	`floor_name` text,
	FOREIGN KEY (`room_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `asset_proposal_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`proposal_id` integer NOT NULL,
	`material_id` integer,
	`material_code` text,
	`material_name` text NOT NULL,
	`room_asset_id` integer,
	`source_asset_id` integer,
	`original_grade` integer,
	`original_code` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit` text,
	`category` text,
	`nganh_code` text,
	`chuyen_nganh_code` text,
	`note` text,
	`from_room_id` integer,
	`from_room_code` text,
	`from_room_name` text,
	`location_note` text,
	`target_room_id` integer,
	`target_room_code` text,
	`target_room_name` text
);
--> statement-breakpoint
CREATE TABLE `asset_proposal_logs` (
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
	`actor_is_admin` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asset_proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`proposal_type` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE `buildings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`manager_code` text,
	`area` text,
	`address` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buildings_code_unique` ON `buildings` (`code`);--> statement-breakpoint
CREATE TABLE `catalog_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text,
	`actor_is_admin` integer DEFAULT 0 NOT NULL,
	`entity_id` integer,
	`entity_code` text,
	`entity_name` text,
	`parent_code` text,
	`parent_name` text,
	`summary` text NOT NULL,
	`details` text
);
--> statement-breakpoint
CREATE TABLE `catalog_stock_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`movement_type` text NOT NULL,
	`executed_at` text NOT NULL,
	`material_id` integer,
	`material_code` text,
	`material_name` text NOT NULL,
	`nganh_code` text NOT NULL,
	`chuyen_nganh_code` text,
	`chuyen_nganh_name` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`quantity_before` integer DEFAULT 0 NOT NULL,
	`quantity_after` integer DEFAULT 0 NOT NULL,
	`unit` text,
	`is_new_material` integer DEFAULT 0 NOT NULL,
	`reason` text,
	`note` text,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text,
	`actor_is_admin` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_code_unique` ON `categories` (`code`);--> statement-breakpoint
CREATE TABLE `exam_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`major_id` integer,
	`faculty_id` integer,
	`cohort` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_classes_code_unique` ON `exam_classes` (`code`);--> statement-breakpoint
CREATE TABLE `exam_draw_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`draw_id` integer,
	`action` text NOT NULL,
	`summary` text NOT NULL,
	`details` text,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text
);
--> statement-breakpoint
CREATE TABLE `exam_draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`draw_code` text NOT NULL,
	`exam_id` integer NOT NULL,
	`exam_code` text,
	`paper_number` integer,
	`subject_id` integer,
	`major_id` integer,
	`draw_type` text NOT NULL,
	`class_id` integer,
	`class_name` text,
	`drawn_by_user_id` integer,
	`drawn_by_username` text,
	`drawn_by_display_name` text,
	`drawn_at` text NOT NULL,
	`printed_at` text,
	`printed_by_user_id` integer,
	`printed_by_username` text,
	`print_blocked` integer DEFAULT false NOT NULL,
	`print_blocked_at` text,
	`print_blocked_reason` text,
	`exam_date` text,
	`exam_time` text,
	`location` text,
	`note` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_draws_draw_code_unique` ON `exam_draws` (`draw_code`);--> statement-breakpoint
CREATE TABLE `exam_faculties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`major_id` integer NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_faculties_major_code_uq` ON `exam_faculties` (`major_id`,`code`);--> statement-breakpoint
CREATE TABLE `exam_faculty_heads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`faculty_code` text NOT NULL,
	`faculty_name` text,
	`user_id` integer NOT NULL,
	`username` text,
	`display_name` text,
	`note` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_faculty_heads_user_fac_uq` ON `exam_faculty_heads` (`user_id`,`faculty_code`);--> statement-breakpoint
CREATE TABLE `exam_major_heads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`major_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`username` text,
	`display_name` text,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `exam_majors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`system_id` integer NOT NULL,
	`level_code` text,
	`short_code` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_majors_code_unique` ON `exam_majors` (`code`);--> statement-breakpoint
CREATE TABLE `exam_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`exam_id` integer NOT NULL,
	`question_number` integer DEFAULT 1 NOT NULL,
	`content` text NOT NULL,
	`answer` text,
	`points` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exam_subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`base_code` text,
	`name` text NOT NULL,
	`credit_hours` integer DEFAULT 0,
	`lesson_hours` integer DEFAULT 0,
	`faculty_id` integer NOT NULL,
	`major_id` integer NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_subjects_code_unique` ON `exam_subjects` (`code`);--> statement-breakpoint
CREATE TABLE `exam_systems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`letter` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_systems_code_unique` ON `exam_systems` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `exam_systems_letter_unique` ON `exam_systems` (`letter`);--> statement-breakpoint
CREATE TABLE `exam_teachers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`user_id` integer NOT NULL,
	`username` text,
	`display_name` text,
	`faculty_code` text NOT NULL,
	`faculty_name` text,
	`note` text,
	`created_by_user_id` integer,
	`created_by_username` text,
	`created_by_display_name` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_teachers_user_uq` ON `exam_teachers` (`user_id`);--> statement-breakpoint
CREATE TABLE `exam_teaching_assignment_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`action` text NOT NULL,
	`subject_id` integer,
	`subject_code` text,
	`subject_name` text,
	`major_id` integer,
	`major_code` text,
	`faculty_id` integer,
	`faculty_code` text,
	`class_id` integer,
	`class_code` text,
	`class_name` text,
	`teacher_user_id` integer,
	`teacher_username` text,
	`teacher_display_name` text,
	`note` text,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exam_teaching_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`subject_id` integer NOT NULL,
	`class_id` integer,
	`user_id` integer NOT NULL,
	`username` text,
	`display_name` text,
	`note` text,
	`teaching_start` text,
	`teaching_end` text,
	`assigned_by_user_id` integer,
	`assigned_by_username` text,
	`assigned_by_display_name` text
);
--> statement-breakpoint
CREATE TABLE `exam_workflow_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`exam_id` integer NOT NULL,
	`action` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`note` text,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`subject_id` integer NOT NULL,
	`paper_number` integer,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_by_user_id` integer,
	`created_by_username` text,
	`created_by_display_name` text,
	`approved_by_user_id` integer,
	`approved_by_username` text,
	`approved_by_display_name` text,
	`approved_at` text,
	`approved_by_rank` text,
	`approved_by_position` text,
	`approved_by_signature_url` text,
	`approved_by_title` text,
	`dept_head_user_id` integer,
	`dept_head_username` text,
	`dept_head_display_name` text,
	`dept_head_rank` text,
	`dept_head_signature_url` text,
	`dept_head_approved_at` text,
	`qr_code` text,
	`locked` integer DEFAULT false NOT NULL,
	`class_id` integer,
	`class_name` text,
	`duration_minutes` integer DEFAULT 60,
	`question_file_url` text,
	`question_file_name` text,
	`answer_file_url` text,
	`answer_file_name` text,
	`note` text,
	`return_note` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exams_code_unique` ON `exams` (`code`);--> statement-breakpoint
CREATE TABLE `floors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`building_id` integer NOT NULL,
	`code` text,
	`floor_number` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`floor_id` integer NOT NULL,
	`room_code` text NOT NULL,
	`room_name` text NOT NULL,
	`room_type` text,
	`manager` text,
	`manager_code` text,
	`account_password` text,
	`capacity` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`description` text,
	`class_id` integer,
	FOREIGN KEY (`floor_id`) REFERENCES `floors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_room_code_unique` ON `rooms` (`room_code`);--> statement-breakpoint
CREATE TABLE `room_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_id` integer NOT NULL,
	`image_url` text NOT NULL,
	`title` text,
	`description` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `room_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_id` integer NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`broken_quantity` integer DEFAULT 0 NOT NULL,
	`unit` text,
	`holding_unit_id` integer,
	`grade` integer DEFAULT 1 NOT NULL,
	`manufacture_year` integer,
	`usage_year` integer,
	`install_address` text,
	`status` text DEFAULT 'NORMAL' NOT NULL,
	`purchase_date` text,
	`expiry_date` text,
	`broken_at` text,
	`repair_started_at` text,
	`repair_completed_at` text,
	`repair_performer` text,
	`description` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`holding_unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `room_assets_code_unique` ON `room_assets` (`code`);--> statement-breakpoint
CREATE TABLE `repair_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_asset_id` integer NOT NULL,
	`repair_date` text NOT NULL,
	`content` text NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`performer` text,
	`note` text,
	FOREIGN KEY (`room_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inventory_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_asset_id` integer NOT NULL,
	`inventory_date` text NOT NULL,
	`actual_quantity` integer DEFAULT 0 NOT NULL,
	`expected_quantity` integer DEFAULT 0 NOT NULL,
	`result` text,
	`note` text,
	FOREIGN KEY (`room_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `replacement_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_asset_id` integer NOT NULL,
	`replacement_date` text NOT NULL,
	`old_asset` text NOT NULL,
	`new_asset` text NOT NULL,
	`reason` text,
	`performer` text,
	`note` text,
	FOREIGN KEY (`room_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_nganh` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`user_id` integer NOT NULL,
	`nganh_code` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_nganh_user_nganh_uq` ON `user_nganh` (`user_id`,`nganh_code`);--> statement-breakpoint
CREATE TABLE `repair_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_id` integer NOT NULL,
	`room_asset_id` integer,
	`source_asset_id` integer,
	`quantity` integer DEFAULT 1 NOT NULL,
	`original_grade` integer,
	`asset_name` text NOT NULL,
	`category` text,
	`description` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`broken_at` text NOT NULL,
	`reported_by_name` text NOT NULL,
	`reported_by_user_id` integer,
	`assigned_to_name` text,
	`assigned_at` text,
	`assigned_by_name` text,
	`repair_started_at` text,
	`completed_at` text,
	`admin_note` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reported_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`contact_person` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_code_unique` ON `suppliers` (`code`);--> statement-breakpoint
CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`category_id` integer NOT NULL,
	`supplier_id` integer,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`min_quantity` integer DEFAULT 0 NOT NULL,
	`price` real DEFAULT 0,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`description` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `materials_code_unique` ON `materials` (`code`);--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`manager` text,
	`phone` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouses_code_unique` ON `warehouses` (`code`);--> statement-breakpoint
CREATE TABLE `warehouse_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`warehouse_id` integer NOT NULL,
	`material_id` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`min_quantity` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
INSERT INTO `__new_actions`("id", "createdAt", "updatedAt", "name", "display_name", "description") SELECT "id", "createdAt", "updatedAt", "name", "display_name", "description" FROM `actions`;--> statement-breakpoint
DROP TABLE `actions`;--> statement-breakpoint
ALTER TABLE `__new_actions` RENAME TO `actions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `actions_name_unique` ON `actions` (`name`);--> statement-breakpoint
CREATE TABLE `__new_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`graduatedAt` text,
	`status` text DEFAULT 'ongoing',
	`unitId` integer NOT NULL,
	FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_classes`("id", "createdAt", "updatedAt", "name", "description", "graduatedAt", "status", "unitId") SELECT "id", "createdAt", "updatedAt", "name", "description", "graduatedAt", "status", "unitId" FROM `classes`;--> statement-breakpoint
DROP TABLE `classes`;--> statement-breakpoint
ALTER TABLE `__new_classes` RENAME TO `classes`;--> statement-breakpoint
CREATE UNIQUE INDEX `class_unit_unique_constraint` ON `classes` (`name`,`unitId`);--> statement-breakpoint
CREATE TABLE `__new_notification_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`notifiableType` text NOT NULL,
	`notifiableId` integer NOT NULL,
	`notificationId` text NOT NULL,
	FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_notification_items`("id", "createdAt", "updatedAt", "notifiableType", "notifiableId", "notificationId") SELECT "id", "createdAt", "updatedAt", "notifiableType", "notifiableId", "notificationId" FROM `notification_items`;--> statement-breakpoint
DROP TABLE `notification_items`;--> statement-breakpoint
ALTER TABLE `__new_notification_items` RENAME TO `notification_items`;--> statement-breakpoint
CREATE INDEX `notification_items_notification_idx` ON `notification_items` (`notificationId`);--> statement-breakpoint
CREATE INDEX `notification_items_item_idx` ON `notification_items` (`notifiableType`,`notifiableId`);--> statement-breakpoint
CREATE TABLE `__new_permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`resource_id` integer NOT NULL,
	`action_id` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_permissions`("id", "createdAt", "updatedAt", "name", "display_name", "description", "resource_id", "action_id") SELECT "id", "createdAt", "updatedAt", "name", "display_name", "description", "resource_id", "action_id" FROM `permissions`;--> statement-breakpoint
DROP TABLE `permissions`;--> statement-breakpoint
ALTER TABLE `__new_permissions` RENAME TO `permissions`;--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_name_unique` ON `permissions` (`name`);--> statement-breakpoint
CREATE TABLE `__new_resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
INSERT INTO `__new_resources`("id", "createdAt", "updatedAt", "name", "display_name", "description") SELECT "id", "createdAt", "updatedAt", "name", "display_name", "description" FROM `resources`;--> statement-breakpoint
DROP TABLE `resources`;--> statement-breakpoint
ALTER TABLE `__new_resources` RENAME TO `resources`;--> statement-breakpoint
CREATE UNIQUE INDEX `resources_name_unique` ON `resources` (`name`);--> statement-breakpoint
CREATE TABLE `__new_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
INSERT INTO `__new_roles`("id", "createdAt", "updatedAt", "name", "description") SELECT "id", "createdAt", "updatedAt", "name", "description" FROM `roles`;--> statement-breakpoint
DROP TABLE `roles`;--> statement-breakpoint
ALTER TABLE `__new_roles` RENAME TO `roles`;--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `__new_students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
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
INSERT INTO `__new_students`("id", "createdAt", "updatedAt", "fullName", "birthPlace", "address", "dob", "rank", "previousUnit", "previousPosition", "position", "ethnic", "religion", "enlistmentPeriod", "politicalOrg", "politicalOrgOfficialDate", "cpvId", "educationLevel", "schoolName", "major", "isGraduated", "talent", "shortcoming", "policyBeneficiaryGroup", "fatherName", "fatherDob", "fatherPhoneNumber", "fatherJob", "motherName", "motherDob", "motherPhoneNumber", "motherJob", "isMarried", "spouseName", "spouseDob", "spouseJob", "spousePhoneNumber", "childrenInfos", "familySize", "familyBackground", "familyBirthOrder", "achievement", "disciplinaryHistory", "phone", "classId", "cpvOfficialAt", "avatar", "siblings", "contactPerson", "studentId", "relatedDocumentations", "status") SELECT "id", "createdAt", "updatedAt", "fullName", "birthPlace", "address", "dob", "rank", "previousUnit", "previousPosition", "position", "ethnic", "religion", "enlistmentPeriod", "politicalOrg", "politicalOrgOfficialDate", "cpvId", "educationLevel", "schoolName", "major", "isGraduated", "talent", "shortcoming", "policyBeneficiaryGroup", "fatherName", "fatherDob", "fatherPhoneNumber", "fatherJob", "motherName", "motherDob", "motherPhoneNumber", "motherJob", "isMarried", "spouseName", "spouseDob", "spouseJob", "spousePhoneNumber", "childrenInfos", "familySize", "familyBackground", "familyBirthOrder", "achievement", "disciplinaryHistory", "phone", "classId", "cpvOfficialAt", "avatar", "siblings", "contactPerson", "studentId", "relatedDocumentations", "status" FROM `students`;--> statement-breakpoint
DROP TABLE `students`;--> statement-breakpoint
ALTER TABLE `__new_students` RENAME TO `students`;--> statement-breakpoint
CREATE TABLE `__new_units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`alias` text NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL,
	`parentId` integer,
	FOREIGN KEY (`parentId`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_units`("id", "createdAt", "updatedAt", "alias", "name", "level", "parentId") SELECT "id", "createdAt", "updatedAt", "alias", "name", "level", "parentId" FROM `units`;--> statement-breakpoint
DROP TABLE `units`;--> statement-breakpoint
ALTER TABLE `__new_units` RENAME TO `units`;--> statement-breakpoint
CREATE UNIQUE INDEX `units_alias_unique` ON `units` (`alias`);--> statement-breakpoint
CREATE UNIQUE INDEX `units_name_unique` ON `units` (`name`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`displayName` text DEFAULT '' NOT NULL,
	`isSuperUser` integer DEFAULT false NOT NULL,
	`unitId` integer,
	`status` text DEFAULT 'pending',
	`rank` text,
	`position` text,
	`alias` text,
	`signature_url` text,
	FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "createdAt", "updatedAt", "username", "password", "displayName", "isSuperUser", "unitId", "status", "rank", "position", "alias", "signature_url") SELECT "id", "createdAt", "updatedAt", "username", "password", "displayName", "isSuperUser", "unitId", "status", "rank", "position", "alias", "signature_url" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);