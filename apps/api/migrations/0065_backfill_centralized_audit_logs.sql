-- Chuyển nhật ký tài khoản/phòng vật tư; giữ nguyên bảng cũ để rollback.
INSERT OR IGNORE INTO audit_logs (
	createdAt, updatedAt, module, resource_type, resource_id, action,
	actor_user_id, actor_username, actor_display_name, actor_is_admin,
	entity_code, entity_name, parent_code, parent_name, summary, details,
	metadata, legacy_source, legacy_id
)
SELECT
	createdAt, updatedAt, 'ASSET', 'ROOM_ACCOUNT', room_id, action,
	actor_user_id, actor_username, actor_display_name, actor_is_admin,
	room_code, room_name, building_code, building_name, summary, details,
	json_object(
		'address', address,
		'floorName', floor_name,
		'accountLabel', account_label
	),
	'account_audit_logs', id
FROM account_audit_logs;
--> statement-breakpoint

-- Chuyển nhật ký danh mục vật tư.
INSERT OR IGNORE INTO audit_logs (
	createdAt, updatedAt, module, resource_type, resource_id, action,
	actor_user_id, actor_username, actor_display_name, actor_is_admin,
	entity_code, entity_name, parent_code, parent_name, summary, details,
	legacy_source, legacy_id
)
SELECT
	createdAt, updatedAt, 'ASSET', entity_type, entity_id, action,
	actor_user_id, actor_username, actor_display_name, actor_is_admin,
	entity_code, entity_name, parent_code, parent_name, summary, details,
	'catalog_audit_logs', id
FROM catalog_audit_logs;
--> statement-breakpoint

-- Chuyển nhật ký quản lý phép.
INSERT OR IGNORE INTO audit_logs (
	createdAt, updatedAt, module, resource_type, resource_id, action,
	actor_user_id, summary, details, legacy_source, legacy_id
)
SELECT
	createdAt, updatedAt, 'LEAVE', entity_type, entity_id, action,
	user_id, action || ' ' || entity_type, details,
	'leave_audit_logs', id
FROM leave_audit_logs;
--> statement-breakpoint

-- Quyền xem audit toàn hệ thống chỉ dành cho quản trị; các module dùng quyền báo cáo sẵn có.
INSERT OR IGNORE INTO resources (name, display_name, description)
VALUES ('audit-logs', 'Nhật ký hệ thống', 'Xem nhật ký tập trung toàn hệ thống');
--> statement-breakpoint
INSERT OR IGNORE INTO permissions
	(resource_id, action_id, name, display_name, description)
SELECT r.id, a.id, 'audit-logs:read', 'Xem - Nhật ký hệ thống', 'Xem nhật ký tập trung toàn hệ thống'
FROM resources r CROSS JOIN actions a
WHERE r.name = 'audit-logs' AND a.name = 'read';
--> statement-breakpoint
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin') AND p.name = 'audit-logs:read';
