-- Seed RBAC resources + permissions for asset management module
-- Trigger assign_permission_to_super_admin (from 0002) auto-assigns to super_admin on INSERT permissions when that role exists.
-- Role-permission inserts are guarded with EXISTS so DBs without seed roles do not fail.

INSERT INTO resources (name, display_name, description)
SELECT v.name, v.display_name, v.description
FROM (
	SELECT 'buildings' AS name, 'Tòa nhà' AS display_name, 'Quản lý danh mục tòa nhà' AS description
	UNION ALL SELECT 'floors', 'Tầng', 'Quản lý tầng trong tòa nhà'
	UNION ALL SELECT 'rooms', 'Phòng', 'Quản lý phòng / hồ sơ phòng'
	UNION ALL SELECT 'room-assets', 'Vật tư phòng', 'Quản lý vật tư gắn với phòng'
	UNION ALL SELECT 'room-images', 'Hình ảnh phòng', 'Quản lý hình ảnh hồ sơ phòng'
	UNION ALL SELECT 'repair-logs', 'Nhật ký sửa chữa', 'Nhật ký sửa chữa vật tư'
	UNION ALL SELECT 'inventory-logs', 'Nhật ký kiểm kê', 'Nhật ký kiểm kê vật tư'
	UNION ALL SELECT 'replacement-logs', 'Lịch sử thay thế', 'Lịch sử thay thế vật tư'
) AS v
WHERE NOT EXISTS (SELECT 1 FROM resources r WHERE r.name = v.name);
--> statement-breakpoint

-- Create permissions for new resources × existing actions (idempotent)
INSERT INTO permissions (resource_id, action_id, name, display_name, description)
SELECT
	r.id,
	a.id,
	r.name || ':' || a.name,
	a.display_name || ' - ' || r.display_name,
	'Quyền để ' || LOWER(a.display_name) || ' ' || LOWER(r.display_name)
FROM resources r
CROSS JOIN actions a
WHERE r.name IN (
	'buildings',
	'floors',
	'rooms',
	'room-assets',
	'room-images',
	'repair-logs',
	'inventory-logs',
	'replacement-logs'
)
AND NOT EXISTS (
	SELECT 1 FROM permissions p WHERE p.name = r.name || ':' || a.name
);
--> statement-breakpoint

-- Super admin + Admin: full access on asset module
-- (explicit super_admin assignment in case AFTER INSERT trigger is missing/disabled)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
	roles.id,
	p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
WHERE roles.name IN ('super_admin', 'admin')
AND r.name IN (
	'buildings',
	'floors',
	'rooms',
	'room-assets',
	'room-images',
	'repair-logs',
	'inventory-logs',
	'replacement-logs'
)
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
--> statement-breakpoint

-- Battalion commander: full CRUD on asset module
INSERT INTO role_permissions (role_id, permission_id)
SELECT
	roles.id,
	p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE roles.name = 'battalion_commander'
AND r.name IN (
	'buildings',
	'floors',
	'rooms',
	'room-assets',
	'room-images',
	'repair-logs',
	'inventory-logs',
	'replacement-logs'
)
AND a.name IN ('create', 'read', 'update', 'delete')
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
--> statement-breakpoint

-- Company commander: full CRUD on asset module
INSERT INTO role_permissions (role_id, permission_id)
SELECT
	roles.id,
	p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE roles.name = 'company_commander'
AND r.name IN (
	'buildings',
	'floors',
	'rooms',
	'room-assets',
	'room-images',
	'repair-logs',
	'inventory-logs',
	'replacement-logs'
)
AND a.name IN ('create', 'read', 'update', 'delete')
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
--> statement-breakpoint

-- Viewer: read-only on asset module
INSERT INTO role_permissions (role_id, permission_id)
SELECT
	roles.id,
	p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE roles.name = 'viewer'
AND r.name IN (
	'buildings',
	'floors',
	'rooms',
	'room-assets',
	'room-images',
	'repair-logs',
	'inventory-logs',
	'replacement-logs'
)
AND a.name = 'read'
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
