-- Gộp bảng `classes` vào `units`:
--  * lớp trở thành đơn vị cấp 2 (level = 2, 'class'), cha là đại đội cũ (classes.unitId)
--  * students.classId / rooms.class_id -> unitId / unit_id (trỏ tới đơn vị cấp lớp)
--  * notification_items 'classes' -> 'units'
--  * bỏ ràng buộc unique của units.alias và units.name
DROP INDEX IF EXISTS `units_alias_unique`;
--> statement-breakpoint
DROP INDEX IF EXISTS `units_name_unique`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `units_alias_idx` ON `units` (`alias`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `units_parent_id_idx` ON `units` (`parentId`);
--> statement-breakpoint
ALTER TABLE `units` ADD `description` text;
--> statement-breakpoint
ALTER TABLE `units` ADD `graduatedAt` text;
--> statement-breakpoint
ALTER TABLE `units` ADD `status` text;
--> statement-breakpoint
ALTER TABLE `units` ADD `legacy_class_id` integer;
--> statement-breakpoint
INSERT INTO `units` (`alias`, `name`, `level`, `parentId`, `description`, `graduatedAt`, `status`, `createdAt`, `updatedAt`, `legacy_class_id`)
SELECT `name`, `name`, 2, `unitId`, `description`, `graduatedAt`, COALESCE(`status`, 'ongoing'), `createdAt`, `updatedAt`, `id`
FROM `classes`
ORDER BY `id`;
--> statement-breakpoint
CREATE TABLE `__new_students` (
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
	`unitId` integer NOT NULL, `cpvOfficialAt` text, `avatar` text, `siblings` text DEFAULT '[]', `contactPerson` text DEFAULT '{}', `studentId` text, `relatedDocumentations` text, `status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_students` (`id`, `createdAt`, `updatedAt`, `fullName`, `birthPlace`, `address`, `dob`, `rank`, `previousUnit`, `previousPosition`, `position`, `ethnic`, `religion`, `enlistmentPeriod`, `politicalOrg`, `politicalOrgOfficialDate`, `cpvId`, `educationLevel`, `schoolName`, `major`, `isGraduated`, `talent`, `shortcoming`, `policyBeneficiaryGroup`, `fatherName`, `fatherDob`, `fatherPhoneNumber`, `fatherJob`, `motherName`, `motherDob`, `motherPhoneNumber`, `motherJob`, `isMarried`, `spouseName`, `spouseDob`, `spouseJob`, `spousePhoneNumber`, `childrenInfos`, `familySize`, `familyBackground`, `familyBirthOrder`, `achievement`, `disciplinaryHistory`, `phone`, `unitId`, `cpvOfficialAt`, `avatar`, `siblings`, `contactPerson`, `studentId`, `relatedDocumentations`, `status`)
SELECT `id`, `createdAt`, `updatedAt`, `fullName`, `birthPlace`, `address`, `dob`, `rank`, `previousUnit`, `previousPosition`, `position`, `ethnic`, `religion`, `enlistmentPeriod`, `politicalOrg`, `politicalOrgOfficialDate`, `cpvId`, `educationLevel`, `schoolName`, `major`, `isGraduated`, `talent`, `shortcoming`, `policyBeneficiaryGroup`, `fatherName`, `fatherDob`, `fatherPhoneNumber`, `fatherJob`, `motherName`, `motherDob`, `motherPhoneNumber`, `motherJob`, `isMarried`, `spouseName`, `spouseDob`, `spouseJob`, `spousePhoneNumber`, `childrenInfos`, `familySize`, `familyBackground`, `familyBirthOrder`, `achievement`, `disciplinaryHistory`, `phone`, (SELECT `u`.`id` FROM `units` `u` WHERE `u`.`legacy_class_id` = `students`.`classId`), `cpvOfficialAt`, `avatar`, `siblings`, `contactPerson`, `studentId`, `relatedDocumentations`, `status`
FROM `students`;
--> statement-breakpoint
DROP TABLE `students`;
--> statement-breakpoint
ALTER TABLE `__new_students` RENAME TO `students`;
--> statement-breakpoint
CREATE TABLE `__new_rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`floor_id` integer NOT NULL,
	`room_code` text NOT NULL,
	`room_name` text NOT NULL,
	`room_type` text,
	`manager` text,
	`capacity` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`description` text, `manager_code` text, `unit_id` integer REFERENCES `units`(`id`) ON DELETE SET NULL, `account_password` text,
	FOREIGN KEY (`floor_id`) REFERENCES `floors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_rooms` (`id`, `createdAt`, `updatedAt`, `floor_id`, `room_code`, `room_name`, `room_type`, `manager`, `capacity`, `status`, `description`, `manager_code`, `unit_id`, `account_password`)
SELECT `id`, `createdAt`, `updatedAt`, `floor_id`, `room_code`, `room_name`, `room_type`, `manager`, `capacity`, `status`, `description`, `manager_code`, (SELECT `u`.`id` FROM `units` `u` WHERE `u`.`legacy_class_id` = `rooms`.`class_id`), `account_password`
FROM `rooms`;
--> statement-breakpoint
DROP TABLE `rooms`;
--> statement-breakpoint
ALTER TABLE `__new_rooms` RENAME TO `rooms`;
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_room_code_unique` ON `rooms` (`room_code`);
--> statement-breakpoint
UPDATE `notification_items`
SET `notifiableId` = (SELECT `u`.`id` FROM `units` `u` WHERE `u`.`legacy_class_id` = `notification_items`.`notifiableId`),
    `notifiableType` = 'units'
WHERE `notifiableType` = 'classes'
  AND EXISTS (SELECT 1 FROM `units` `u` WHERE `u`.`legacy_class_id` = `notification_items`.`notifiableId`);
--> statement-breakpoint
DELETE FROM `notification_items` WHERE `notifiableType` = 'classes';
--> statement-breakpoint
DROP TABLE `classes`;
--> statement-breakpoint
ALTER TABLE `units` DROP COLUMN `legacy_class_id`;
