<?php
defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_teachercourses_get_teacher_courses' => [
        'classname'   => 'local_teachercourses\external\get_teacher_courses',
        'methodname'  => 'get_teacher_courses',
        'description' => 'Get all courses where the user is a teacher',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => '',
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE],
    ],

    'local_teachercourses_get_teacher_categories' => [
        'classname'   => 'local_teachercourses\external\get_teacher_categories',
        'methodname'  => 'get_teacher_categories',
        'description' => 'Get categories containing courses where the user is a teacher (uses role_assignments)',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => '',
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE],
    ],

    'local_teachercourses_get_teacher_courses_by_category' => [
        'classname'   => 'local_teachercourses\external\get_teacher_courses_by_category',
        'methodname'  => 'get_teacher_courses_by_category',
        'description' => 'Get teacher courses filtered by category',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => '',
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE],
    ],

    // ── Admin / manager endpoints ──────────────────────────────────────────────

    'local_teachercourses_get_all_categories' => [
        'classname'   => 'local_teachercourses\external\get_all_categories',
        'methodname'  => 'get_all_categories',
        'description' => 'Get ALL visible course categories (admin / manager use)',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => 'moodle/course:view',
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE],
    ],

    'local_teachercourses_get_all_category_courses' => [
        'classname'   => 'local_teachercourses\external\get_all_category_courses',
        'methodname'  => 'get_all_category_courses',
        'description' => 'Get ALL courses in a category regardless of role (admin / manager use)',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => 'moodle/course:view',
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE],
    ],
];
