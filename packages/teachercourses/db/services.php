<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Web service definitions for local_teachercourses
 *
 * @package    local_teachercourses
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    // Get courses where user is a teacher
    'local_teachercourses_get_teacher_courses' => [
        'classname'   => 'local_teachercourses\external\get_teacher_courses',
        'methodname'  => 'get_teacher_courses',
        'description' => 'Get all courses where the user is a teacher',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => '', // No specific capability needed - users can query their own data
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE]
    ],

    // Get categories with courses where user is a teacher
    'local_teachercourses_get_teacher_categories' => [
        'classname'   => 'local_teachercourses\external\get_teacher_categories',
        'methodname'  => 'get_teacher_categories',
        'description' => 'Get all categories containing courses where the user is a teacher',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => '', // No specific capability needed - users can query their own data
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE]
    ],

    'local_teachercourses_get_teacher_courses_by_category' => [
        'classname'   => 'local_teachercourses\external\get_teacher_courses_by_category',
        'methodname'  => 'get_teacher_courses_by_category',
        'description' => 'Get teacher courses filtered by category',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => '',
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE]
    ],
];
