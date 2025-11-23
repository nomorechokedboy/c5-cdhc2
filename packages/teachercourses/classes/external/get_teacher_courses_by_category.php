<?php

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

class get_teacher_courses_by_category extends external_api
{

    /**
     * Describe parameters
     */
    public static function get_teacher_courses_by_category_parameters()
    {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'User ID (0 for current user)', VALUE_DEFAULT, 0),
            'categoryid' => new external_value(PARAM_INT, 'Course category ID', VALUE_REQUIRED)
        ]);
    }

    /**
     * Main method
     */
    public static function get_teacher_courses_by_category($userid = 0, $categoryid)
    {
        global $DB, $USER;

        // Validate input.
        $params = self::validate_parameters(
            self::get_teacher_courses_by_category_parameters(),
            ['userid' => $userid, 'categoryid' => $categoryid]
        );

        // If userid = 0 → use current user.
        if ($params['userid'] == 0) {
            $params['userid'] = $USER->id;
        }

        // Validate context.
        $context = context_system::instance();
        self::validate_context($context);

        // Must exist.
        $user = $DB->get_record('user', ['id' => $params['userid']], '*', MUST_EXIST);

        // Category must exist.
        $category = $DB->get_record('course_categories', ['id' => $params['categoryid']], '*', MUST_EXIST);

        // Get courses inside this category.
        $categorycourses = $DB->get_records('course', ['category' => $params['categoryid']]);

        $teachercourses = [];

        // Teacher capabilities.
        $teachercapabilities = [
            'moodle/course:update',
            'moodle/course:manageactivities',
            'moodle/grade:edit',
            'moodle/grade:viewall',
        ];

        foreach ($categorycourses as $course) {

            $coursecontext = context_course::instance($course->id);
            $isteacher = false;

            foreach ($teachercapabilities as $cap) {
                if (has_capability($cap, $coursecontext, $params['userid'])) {
                    $isteacher = true;
                    break;
                }
            }

            if (!$isteacher) {
                continue;
            }

            $teachercourses[] = [
                'id' => $course->id,
                'fullname' => $course->fullname,
                'shortname' => $course->shortname,
                'idnumber' => $course->idnumber ?? '',
                'summary' => strip_tags($course->summary ?? ''),
                'visible' => $course->visible,
                'startdate' => $course->startdate,
                'enddate' => $course->enddate,
                'categoryid' => $params['categoryid'],
                'categoryname' => $category->name,
                'categorypath' => $category->path,
                'categoryvisible' => $category->visible,
            ];
        }

        return [
            'userid' => $params['userid'],
            'username' => $user->username,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'categoryid' => $params['categoryid'],
            'categoryname' => $category->name,
            'totalcourses' => count($teachercourses),
            'courses' => $teachercourses
        ];
    }

    /**
     * Describe result
     */
    public static function get_teacher_courses_by_category_returns()
    {
        return new external_single_structure([
            'userid' => new external_value(PARAM_INT, 'User ID'),
            'username' => new external_value(PARAM_TEXT, 'Username'),
            'firstname' => new external_value(PARAM_TEXT, 'First name'),
            'lastname' => new external_value(PARAM_TEXT, 'Last name'),
            'email' => new external_value(PARAM_EMAIL, 'Email'),

            'categoryid' => new external_value(PARAM_INT, 'Category ID'),
            'categoryname' => new external_value(PARAM_TEXT, 'Category name'),

            'totalcourses' => new external_value(PARAM_INT, 'Total courses where user is teacher in this category'),

            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Course ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Course full name'),
                    'shortname' => new external_value(PARAM_TEXT, 'Course short name'),
                    'idnumber' => new external_value(PARAM_TEXT, 'Course ID number'),
                    'summary' => new external_value(PARAM_RAW, 'Course summary'),
                    'visible' => new external_value(PARAM_INT, 'Visibility'),
                    'startdate' => new external_value(PARAM_INT, 'Start date'),
                    'enddate' => new external_value(PARAM_INT, 'End date'),
                    'categoryid' => new external_value(PARAM_INT, 'Category ID'),
                    'categoryname' => new external_value(PARAM_TEXT, 'Category name'),
                    'categorypath' => new external_value(PARAM_TEXT, 'Category path'),
                    'categoryvisible' => new external_value(PARAM_INT, 'Visibility'),
                ])
            )
        ]);
    }
}
