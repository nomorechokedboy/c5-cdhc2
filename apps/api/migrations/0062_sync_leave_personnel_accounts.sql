UPDATE `users`
SET
	`displayName` = (
		SELECT `full_name`
		FROM `leave_personnel`
		WHERE `leave_personnel`.`user_id` = `users`.`id`
		LIMIT 1
	),
	`rank` = (
		SELECT `rank`
		FROM `leave_personnel`
		WHERE `leave_personnel`.`user_id` = `users`.`id`
		LIMIT 1
	),
	`unitId` = (
		SELECT `unit_id`
		FROM `leave_personnel`
		WHERE `leave_personnel`.`user_id` = `users`.`id`
		LIMIT 1
	),
	`leave_unit_id` = (
		SELECT `unit_id`
		FROM `leave_personnel`
		WHERE `leave_personnel`.`user_id` = `users`.`id`
		LIMIT 1
	),
	`management_area` = (
		SELECT `management_area`
		FROM `leave_personnel`
		WHERE `leave_personnel`.`user_id` = `users`.`id`
		LIMIT 1
	)
WHERE EXISTS (
	SELECT 1
	FROM `leave_personnel`
	WHERE `leave_personnel`.`user_id` = `users`.`id`
);
