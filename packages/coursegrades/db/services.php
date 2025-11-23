<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Web service definitions for local_coursegrades
 *
 * @package    local_coursegrades
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    // Teacher view - get course data with all student grades
    'local_coursegrades_get_course_data' => [
        'classname'   => 'local_coursegrades\external\get_course_data',
        'methodname'  => 'get_course_data',
        'description' => 'Get course info with graded modules and all students grades (teacher view)',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities'=> 'moodle/grade:viewall',
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE]
    ],
    
    // Student view - get student's own grades across all courses
    'local_coursegrades_get_student_grades' => [
        'classname'   => 'local_coursegrades\external\get_student_grades',
        'methodname'  => 'get_student_grades',
        'description' => 'Get student grades across all enrolled courses (student view)',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities'=> '', // No specific capability - users can view their own grades
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE]
    ],
];
