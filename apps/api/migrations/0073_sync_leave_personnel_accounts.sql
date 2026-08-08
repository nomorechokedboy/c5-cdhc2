-- The legacy database can lack leave_personnel. Keep this migration
-- executable for both legacy and fresh databases; synchronization is handled
-- by the leave application after its schema is available.
CREATE TABLE IF NOT EXISTS `__migration_0073_leave_sync_deferred` (
	`id` integer PRIMARY KEY NOT NULL
);
