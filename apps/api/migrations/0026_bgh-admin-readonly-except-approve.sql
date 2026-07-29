-- Siết role admin (Ban Giám Hiệu):
-- Chỉ xem (read) + phê duyệt đề xuất (asset-proposals:update).
-- Không tạo/sửa/xóa tòa, VT, user, học viên…

-- Xóa toàn bộ quyền cũ của admin
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'admin');--> statement-breakpoint

-- Gán lại quyền BGH chuẩn
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE roles.name = 'admin'
AND (
	-- Đề xuất: xem + phê duyệt/từ chối (update), không create
	(r.name = 'asset-proposals' AND a.name IN ('read', 'update'))
	-- Chỉ xem cơ sở / VT / danh mục / báo cáo
	OR (r.name = 'buildings' AND a.name = 'read')
	OR (r.name = 'floors' AND a.name = 'read')
	OR (r.name = 'rooms' AND a.name = 'read')
	OR (r.name = 'room-assets' AND a.name = 'read')
	OR (r.name = 'room-images' AND a.name = 'read')
	OR (r.name = 'units' AND a.name = 'read')
	OR (r.name = 'asset-catalog' AND a.name = 'read')
	OR (r.name = 'asset-reports' AND a.name = 'read')
	-- Không cấp asset-movements / repair-logs → không xem nhật ký
	OR (r.name = 'catalog-stock' AND a.name = 'read')
);--> statement-breakpoint

UPDATE roles
SET description = 'Ban Giám Hiệu — xem VT, phê duyệt/từ chối đề xuất (không thêm/sửa danh mục)'
WHERE name = 'admin';
