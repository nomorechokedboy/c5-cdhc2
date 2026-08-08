-- Intentionally empty.
-- The original sync ran before migration 0069 restored `leave_personnel`.
-- The safe sync is performed by migration 0073 after the table exists.
CREATE TABLE IF NOT EXISTS `__migration_0062_leave_sync_deferred` (
	`id` integer PRIMARY KEY NOT NULL
);
