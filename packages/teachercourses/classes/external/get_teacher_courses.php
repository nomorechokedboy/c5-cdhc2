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
use core_customfield\api as customfield_api;

class get_teacher_courses extends external_api
{

    public static function get_teacher_courses_parameters()
    {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'User ID (0 for current user)', VALUE_DEFAULT, 0),
            'categoryid' => new external_value(PARAM_INT, 'Category ID (0 for all categories)', VALUE_DEFAULT, 0)
        ]);
    }

    public static function get_teacher_courses($userid = 0, $categoryid = 0)
    {
        global $DB, $USER;

        // Validate parameters
        $params = self::validate_parameters(
            self::get_teacher_courses_parameters(),
            ['userid' => $userid, 'categoryid' => $categoryid]
        );

        // Use current user if 0
        if ($params['userid'] == 0) {
            $params['userid'] = $USER->id;
        }

        // Validate context
        $context = context_system::instance();
        self::validate_context($context);

        // Validate user
        $user = $DB->get_record('user', ['id' => $params['userid']], '*', MUST_EXIST);

        // Validate category
        if ($params['categoryid'] != 0) {
            if (!$DB->record_exists('course_categories', ['id' => $params['categoryid']])) {
                throw new \moodle_exception('invalidcategoryid', 'error', '', $params['categoryid']);
            }
        }

        // Get all enrolled courses
        $allcourses = enrol_get_users_courses($params['userid'], true);

        $teachercourses = [];

        $teachercapabilities = [
            'moodle/course:update',
            'moodle/course:manageactivities',
            'moodle/grade:edit',
            'moodle/grade:viewall',
        ];

        foreach ($allcourses as $course) {

            // Filter by category
            if ($params['categoryid'] != 0 && $course->category != $params['categoryid']) {
                continue;
            }

            try {
                $handler = \core_customfield\handler::get_handler('core_course', 'course');

                // Now load field values for THIS course
                $customfields = $handler->get_instance_data($course->id, true);
                // Convert Moodle objects → clean JSON friendly key/value
                $metadata = [];

                foreach ($customfields as $fielddata) {
                    $field = $fielddata->get_field();
                    if (!$field) {
                        continue;
                    }

                    $name = $field->get('shortname');
                    $value = $fielddata->get_value();

                    // Convert numeric-looking strings to numbers
                    if (is_numeric($value)) {
                        $value = strpos($value, '.') !== false ? (float)$value : (int)$value;
                    }

                    $metadata[] = [
                        'name' => $name,
                        'value' => $value
                    ];
                }

                $coursecontext = context_course::instance($course->id);

                $isteacher = false;
                foreach ($teachercapabilities as $capability) {
                    if (has_capability($capability, $coursecontext, $params['userid'])) {
                        $isteacher = true;
                        break;
                    }
                }

                if ($isteacher) {

                    // Get category info
                    $category = $DB->get_record(
                        'course_categories',
                        ['id' => $course->category],
                        'id, name, path, visible'
                    );

                    $teachercourses[] = [
                        'id' => $course->id,
                        'fullname' => $course->fullname,
                        'shortname' => $course->shortname,
                        'idnumber' => $course->idnumber ?? '',
                        'summary' => strip_tags($course->summary ?? ''),
                        'visible' => $course->visible,
                        'startdate' => $course->startdate,
                        'enddate' => $course->enddate,
                        'categoryid' => $course->category,
                        'categoryname' => $category ? $category->name : '',
                        'categorypath' => $category ? $category->path : '',
                        'categoryvisible' => $category ? $category->visible : 1,
                        'metadata' => $metadata,
                    ];
                }
            } catch (\Exception $e) {
                debugging("Error processing course {$course->id}: " . $e->getMessage());
                continue;
            }
        }

        return [
            'userid' => $params['userid'],
            'username' => $user->username,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'categoryid' => $params['categoryid'],
            'totalcourses' => count($teachercourses),
            'courses' => $teachercourses
        ];
    }

    public static function get_teacher_courses_returns()
    {
        return new external_single_structure([
            'userid' => new external_value(PARAM_INT, 'User ID'),
            'username' => new external_value(PARAM_TEXT, 'Username'),
            'firstname' => new external_value(PARAM_TEXT, 'First name'),
            'lastname' => new external_value(PARAM_TEXT, 'Last name'),
            'email' => new external_value(PARAM_EMAIL, 'Email address'),
            'categoryid' => new external_value(PARAM_INT, 'Filtered category ID'),
            'totalcourses' => new external_value(PARAM_INT, 'Total number of teacher courses'),
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Course ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Course full name'),
                    'shortname' => new external_value(PARAM_TEXT, 'Course short name'),
                    'idnumber' => new external_value(PARAM_TEXT, 'Course ID number'),
                    'summary' => new external_value(PARAM_RAW, 'Course summary'),
                    'visible' => new external_value(PARAM_INT, 'Course visibility'),
                    'startdate' => new external_value(PARAM_INT, 'Course start date'),
                    'enddate' => new external_value(PARAM_INT, 'Course end date'),
                    'categoryid' => new external_value(PARAM_INT, 'Category ID'),
                    'categoryname' => new external_value(PARAM_TEXT, 'Category name'),
                    'categorypath' => new external_value(PARAM_TEXT, 'Category path'),
                    'categoryvisible' => new external_value(PARAM_INT, 'Category visibility'),
                    'metadata' => new external_multiple_structure(
                        new external_single_structure([
                            'name'  => new external_value(PARAM_TEXT, 'Custom field shortname'),
                            'value' => new external_value(PARAM_RAW, 'Custom field value')
                        ]),
                        'Custom course metadata'
                    ),
                ])
            ),
        ]);
    }
}
