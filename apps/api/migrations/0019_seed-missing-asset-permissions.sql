-- Bổ sung resource/permission còn thiếu cho module vật tư + vai trò Khoa Ngành

-- Resources mới
INSERT INTO resources (name, display_name, description)
SELECT v.name, v.display_name, v.description
FROM (
	SELECT 'asset-catalog' AS name, 'Danh mục ngành' AS display_name, 'Ngành / loại vật / vật tư danh mục' AS description
	UNION ALL SELECT 'asset-movements', 'Biến động vật tư', 'Tăng/giảm / điều động / thu hồi vật tư phòng'
	UNION ALL SELECT 'asset-proposals', 'Đề xuất vật tư', 'Đề xuất sửa chữa / thu hồi / thanh lý'
	UNION ALL SELECT 'asset-reports', 'Báo cáo vật tư', 'Báo cáo thống kê / thực lực / hỏng / hết hạn'
	UNION ALL SELECT 'catalog-stock', 'Tồn danh mục', 'Tăng giảm SL danh mục ngành + log'
) AS v
WHERE NOT EXISTS (SELECT 1 FROM resources r WHERE r.name = v.name);

-- Permissions (create/read/update/delete) cho resources mới
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
	'asset-catalog',
	'asset-movements',
	'asset-proposals',
	'asset-reports',
	'catalog-stock',
	'repair-requests'
)
AND NOT EXISTS (
	SELECT 1 FROM permissions p WHERE p.name = r.name || ':' || a.name
);

-- Đảm bảo repair-requests đã có (idempotent)
INSERT INTO resources (name, display_name, description)
SELECT 'repair-requests', 'Phiếu sửa chữa', 'Báo hỏng / phân công sửa chữa'
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE name = 'repair-requests');

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

-- super_admin + admin: full
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
WHERE roles.name IN ('super_admin', 'admin')
AND r.name IN (
	'asset-catalog',
	'asset-movements',
	'asset-proposals',
	'asset-reports',
	'catalog-stock',
	'repair-requests',
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

-- battalion / company commander: full asset ops
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE roles.name IN ('battalion_commander', 'company_commander')
AND r.name IN (
	'asset-catalog',
	'asset-movements',
	'asset-proposals',
	'asset-reports',
	'catalog-stock',
	'repair-requests',
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

-- Vai trò Khoa Ngành (user ngành): xem danh mục + tăng/giảm + đề xuất
INSERT INTO roles (name, description)
SELECT 'user_nganh', 'User ngành — danh mục ngành, tăng/giảm VT, đề xuất'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user_nganh');

-- Gán quyền cho user_nganh + role «Khoa Ngành» nếu có
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE (
	roles.name = 'user_nganh'
	OR roles.name LIKE '%Ngành%'
	OR roles.name LIKE '%nganh%'
)
AND (
	(r.name IN ('asset-catalog', 'catalog-stock', 'asset-proposals', 'room-assets') AND a.name IN ('create', 'read', 'update'))
	OR (r.name IN ('asset-reports', 'repair-requests') AND a.name IN ('create', 'read'))
)
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);

-- Viewer: chỉ đọc báo cáo + danh mục
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE roles.name = 'viewer'
AND r.name IN ('asset-catalog', 'asset-reports', 'catalog-stock', 'room-assets', 'buildings', 'floors', 'rooms')
AND a.name = 'read'
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
