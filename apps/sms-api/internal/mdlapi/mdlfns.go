package mdlapi

const (
	GET_ENROLLED_USERS        = "core_enrol_get_enrolled_users"
	GET_USER_GRADE_ITEMS      = "gradereport_user_get_grade_items"
	GET_CUSTOM_COURSE_DETAILS = "local_coursegrades_get_course_data"
	GET_STUDENT_GRADES        = "local_coursegrades_get_student_grades"
	GET_CATEGORIES            = "local_teachercourses_get_teacher_categories"
	GET_CATEGORY_COURSES      = "local_teachercourses_get_teacher_courses"
	GET_USER_INFO             = "local_oauth2userinfo_get_user_info"
	UPDATE_GRADES             = "core_grades_update_grades"

	// Admin / manager — return all data regardless of caller's role in courses.
	GET_ALL_CATEGORIES       = "local_teachercourses_get_all_categories"
	GET_ALL_CATEGORY_COURSES = "local_teachercourses_get_all_category_courses"

	// Export / template management (local_customgradeexport)
	GET_COURSE_TEMPLATES = "local_customgradeexport_get_course_templates"
	EXPORT_COURSE_GRADES = "local_customgradeexport_export_course_grades"
	GET_ALL_TEMPLATES    = "local_customgradeexport_get_all_templates"
	UPLOAD_TEMPLATE      = "local_customgradeexport_upload_template"
	DELETE_TEMPLATE      = "local_customgradeexport_delete_template"
)
