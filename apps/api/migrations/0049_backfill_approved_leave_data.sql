UPDATE `leave_records`
SET `leave_year` = substr(`start_date`, 1, 4)
WHERE (`leave_year` IS NULL OR `leave_year` = '')
  AND `start_date` IS NOT NULL;
--> statement-breakpoint
INSERT INTO `leave_batches` (
	`request_id`, `personnel_id`, `personnel_code`, `personnel_name`,
	`object_type`, `leave_type`, `batch_index`, `batch_label`,
	`start_date`, `end_date`, `total_days`, `note`, `created_by_user_id`
)
SELECT
	r.`id`, r.`personnel_id`, r.`personnel_code`,
	CASE WHEN r.`request_scope` = 'CLASS' THEN COALESCE(r.`class_name`, r.`personnel_name`) ELSE r.`personnel_name` END,
	r.`object_type`, r.`leave_type`, 1,
	CASE WHEN r.`request_scope` = 'CLASS' THEN 'Đợt nghỉ ' || COALESCE(r.`class_name`, 'lớp') ELSE 'Đợt nghỉ theo đơn đã duyệt' END,
	r.`start_date`, r.`end_date`, r.`total_days`, r.`note`, r.`decided_by_user_id`
FROM `leave_requests` r
WHERE r.`status` = 'APPROVED'
  AND NOT EXISTS (SELECT 1 FROM `leave_batches` b WHERE b.`request_id` = r.`id`);
