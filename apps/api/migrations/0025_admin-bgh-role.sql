-- Role admin = Ban Giám Hiệu: chỉ xem + phê duyệt đề xuất (không create/sửa danh mục)
-- Quyền chi tiết siết ở 0026.

INSERT INTO roles (name, description)
SELECT 'admin', 'Ban Giám Hiệu — xem VT, phê duyệt/từ chối đề xuất (không thêm/sửa danh mục)'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

UPDATE roles
SET description = 'Ban Giám Hiệu — xem VT, phê duyệt/từ chối đề xuất (không thêm/sửa danh mục)'
WHERE name = 'admin';
