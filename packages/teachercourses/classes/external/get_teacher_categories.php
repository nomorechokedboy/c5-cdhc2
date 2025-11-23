<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * External API for getting categories where user teaches courses
 *
 * @package    local_teachercourses
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_teachercourses\external;

defined('MOODLE_INTERNAL') || die();

require_once("$CFG->libdir/externallib.php");

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;
use context_course;
use context_system;

/**
 * External API class for getting teacher categories
 *
 * @package    local_teachercourses
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_teacher_categories extends external_api
{

    /**
     * Returns description of method parameters
     *
     * @return external_function_parameters
     */
    public static function get_teacher_categories_parameters()
    {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'User ID (0 for current user)', VALUE_DEFAULT, 0)
        ]);
    }

    /**
     * Get categories where user teaches courses
     *
     * @param int $userid User ID (0 for current user)
     * @return array Categories where user is a teacher
     */
    public static function get_teacher_categories($userid = 0)
    {
        global $DB, $USER;

        // Parameter validation
        $params = self::validate_parameters(
            self::get_teacher_categories_parameters(),
            ['userid' => $userid]
        );

        // If userid is 0, use current user
        if ($params['userid'] == 0) {
            $params['userid'] = $USER->id;
        }

        // Validate context
        $context = context_system::instance();
        self::validate_context($context);

        // Check if user exists
        $user = $DB->get_record('user', ['id' => $params['userid']], '*', MUST_EXIST);

        // Get all courses the user is enrolled in
        $allcourses = enrol_get_users_courses($params['userid'], true);

        // Track categories and course count
        $categorydata = [];

        // Teacher capabilities to check
        $teachercapabilities = [
            'moodle/course:update',
            'moodle/course:manageactivities',
            'moodle/grade:edit',
            'moodle/grade:viewall',
        ];

        foreach ($allcourses as $course) {
            try {
                $coursecontext = context_course::instance($course->id);

                // Check if user has any teacher capability
                $isteacher = false;
                foreach ($teachercapabilities as $capability) {
                    if (has_capability($capability, $coursecontext, $params['userid'])) {
                        $isteacher = true;
                        break;
                    }
                }

                if ($isteacher) {
                    // Add this category
                    if (!isset($categorydata[$course->category])) {
                        $categorydata[$course->category] = [
                            'courseids' => [],
                            'coursenames' => []
                        ];
                    }
                    $categorydata[$course->category]['courseids'][] = $course->id;
                    $categorydata[$course->category]['coursenames'][] = $course->fullname;
                }
            } catch (\Exception $e) {
                // Skip courses with errors
                debugging("Error processing course {$course->id}: " . $e->getMessage());
                continue;
            }
        }

        // Get full category information
        $categories = [];
        foreach (array_keys($categorydata) as $categoryid) {
            $category = $DB->get_record(
                'course_categories',
                ['id' => $categoryid],
                'id, name, description, parent, path, depth, visible, sortorder, idnumber'
            );

            if ($category) {
                // Get parent category info if exists
                $parentname = '';
                if ($category->parent > 0) {
                    $parent = $DB->get_record('course_categories', ['id' => $category->parent], 'name');
                    $parentname = $parent ? $parent->name : '';
                }

                $categories[] = [
                    'id' => $category->id,
                    'name' => $category->name,
                    'description' => strip_tags($category->description ?? ''),
                    'parent' => $category->parent,
                    'parentname' => $parentname,
                    'path' => $category->path,
                    'depth' => $category->depth,
                    'visible' => $category->visible,
                    'sortorder' => $category->sortorder,
                    'coursecount' => count($categorydata[$categoryid]['courseids']),
                    'courseids' => $categorydata[$categoryid]['courseids'],
                    'idnumber' => $category->idnumber,
                ];
            }
        }

        // Sort categories by name
        usort($categories, function ($a, $b) {
            return strcmp($a['name'], $b['name']);
        });

        return [
            'userid' => $params['userid'],
            'username' => $user->username,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'categories' => $categories,
            'totalcategories' => count($categories)
        ];
    }

    /**
     * Returns description of method result value
     *
     * @return external_single_structure
     */
    public static function get_teacher_categories_returns()
    {
        return new external_single_structure([
            'userid' => new external_value(PARAM_INT, 'User ID'),
            'username' => new external_value(PARAM_TEXT, 'Username'),
            'firstname' => new external_value(PARAM_TEXT, 'First name'),
            'lastname' => new external_value(PARAM_TEXT, 'Last name'),
            'email' => new external_value(PARAM_EMAIL, 'Email address'),
            'totalcategories' => new external_value(PARAM_INT, 'Total number of categories'),
            'categories' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Category ID'),
                    'name' => new external_value(PARAM_TEXT, 'Category name'),
                    'description' => new external_value(PARAM_RAW, 'Category description'),
                    'parent' => new external_value(PARAM_INT, 'Parent category ID'),
                    'parentname' => new external_value(PARAM_TEXT, 'Parent category name'),
                    'path' => new external_value(PARAM_TEXT, 'Category path'),
                    'depth' => new external_value(PARAM_INT, 'Category depth'),
                    'visible' => new external_value(PARAM_INT, 'Category visibility'),
                    'sortorder' => new external_value(PARAM_INT, 'Sort order'),
                    'coursecount' => new external_value(PARAM_INT, 'Number of courses user teaches in this category'),
                    'courseids' => new external_multiple_structure(
                        new external_value(PARAM_INT, 'Course ID'),
                        'List of course IDs in this category where user is teacher'
                    ),
                    'idnumber' => new external_value(PARAM_TEXT, 'Category id number'),
                ]),
                'Categories where user teaches courses'
            )
        ]);
    }
}
