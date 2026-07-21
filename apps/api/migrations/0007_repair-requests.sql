CREATE TABLE `repair_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_id` integer NOT NULL,
	`room_asset_id` integer,
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
	FOREIGN KEY (`reported_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- RBAC resource for repair tickets
INSERT INTO resources (name, display_name, description)
SELECT 'repair-requests', 'Phiếu báo hỏng', 'Báo hỏng theo phòng và phân công sửa chữa'
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE name = 'repair-requests');
--> statement-breakpoint

INSERT INTO permissions (resource_id, action_id, name, display_name, description)
SELECT
	r.id,
	a.id,
	r.name || ':' || a.name,
	a.display_name || ' - ' || r.display_name,
	'Quyền để ' || LOWER(a.display_name) || ' ' || LOWER(r.display_name)
FROM resources r
CROSS JOIN actions a
WHERE r.name = 'repair-requests'
AND NOT EXISTS (
	SELECT 1 FROM permissions p WHERE p.name = r.name || ':' || a.name
);
--> statement-breakpoint

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
WHERE roles.name IN ('super_admin', 'admin', 'battalion_commander', 'company_commander')
AND r.name = 'repair-requests'
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
--> statement-breakpoint

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE roles.name = 'viewer'
AND r.name = 'repair-requests'
AND a.name = 'read'
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
