-- Role user đơn vị sử dụng: xem tòa/danh mục + tạo đề xuất lên ngành
INSERT INTO roles (name, description)
SELECT 'user_don_vi', 'User đơn vị sử dụng — xem tòa/danh mục, tạo đề xuất cho ngành'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user_don_vi');--> statement-breakpoint

-- Quyền: đọc tòa/tầng/phòng/đơn vị/danh mục + tạo/đọc đề xuất + đọc VT phòng
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE roles.name = 'user_don_vi'
AND (
	(r.name IN ('buildings', 'floors', 'rooms', 'units', 'asset-catalog', 'room-assets') AND a.name = 'read')
	OR (r.name = 'asset-proposals' AND a.name IN ('create', 'read'))
)
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);--> statement-breakpoint

-- User ngành: thêm đọc units (nếu thiếu) — đã có từ trước
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
AND r.name = 'units' AND a.name = 'read'
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
