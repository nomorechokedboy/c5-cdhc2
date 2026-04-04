<?php
namespace local_teachercourses\external;

defined('MOODLE_INTERNAL') || die();

require_once("$CFG->libdir/externallib.php");

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;
use context_system;

/**
 * Returns ALL courses in a given category regardless of the caller's
 * role in those courses. Intended for admin / manager use.
 *
 * Response shape intentionally mirrors get_teacher_courses so the Go
 * backend can parse both with the same GetCategoryCoursesResponse type.
 */
class get_all_category_courses extends external_api {

    public static function get_all_category_courses_parameters() {
        return new external_function_parameters([
            'categoryid' => new external_value(PARAM_INT, 'Course category ID', VALUE_REQUIRED),
            'userid'     => new external_value(PARAM_INT, 'Unused, kept for shape compat', VALUE_DEFAULT, 0),
        ]);
    }

    public static function get_all_category_courses($categoryid, $userid = 0) {
        global $DB, $USER;

        $params = self::validate_parameters(
            self::get_all_category_courses_parameters(),
            ['categoryid' => $categoryid, 'userid' => $userid]
        );

        $context = context_system::instance();
        self::validate_context($context);

        $category = $DB->get_record('course_categories', ['id' => $params['categoryid']], '*', MUST_EXIST);

        // Custom-field handler for metadata (semester, credit, etc.)
        $handler = \core_customfield\handler::get_handler('core_course', 'course');

        $courserecords = $DB->get_records(
            'course',
            ['category' => $params['categoryid']],
            'fullname ASC'
        );

        $courses = [];
        foreach ($courserecords as $course) {
            if ($course->id == 1) continue; // skip site course

            // Custom field metadata
            $metadata = [];
            try {
                $customfields = $handler->get_instance_data($course->id, true);
                foreach ($customfields as $fielddata) {
                    $field = $fielddata->get_field();
                    if (!$field) continue;
                    $name  = $field->get('shortname');
                    $value = $fielddata->get_value();
                    if (is_numeric($value)) {
                        $value = strpos($value, '.') !== false ? (float)$value : (int)$value;
                    }
                    $metadata[] = ['name' => $name, 'value' => $value];
                }
            } catch (\Exception $e) {
                // custom fields are optional
            }

            $courses[] = [
                'id'              => (int)$course->id,
                'fullname'        => $course->fullname,
                'shortname'       => $course->shortname,
                'idnumber'        => $course->idnumber ?? '',
                'summary'         => strip_tags($course->summary ?? ''),
                'visible'         => (int)$course->visible,
                'startdate'       => (int)$course->startdate,
                'enddate'         => (int)$course->enddate,
                'categoryid'      => (int)$course->category,
                'categoryname'    => $category->name,
                'categorypath'    => $category->path,
                'categoryvisible' => (int)$category->visible,
                'metadata'        => $metadata,
            ];
        }

        return [
            'userid'       => 0,
            'username'     => '',
            'firstname'    => '',
            'lastname'     => '',
            'email'        => '',
            'categoryid'   => (int)$params['categoryid'],
            'totalcourses' => count($courses),
            'courses'      => $courses,
        ];
    }

    public static function get_all_category_courses_returns() {
        return new external_single_structure([
            'userid'       => new external_value(PARAM_INT,   'Always 0'),
            'username'     => new external_value(PARAM_TEXT,  'Empty'),
            'firstname'    => new external_value(PARAM_TEXT,  'Empty'),
            'lastname'     => new external_value(PARAM_TEXT,  'Empty'),
            'email'        => new external_value(PARAM_TEXT,  'Empty'),
            'categoryid'   => new external_value(PARAM_INT,   'Requested category ID'),
            'totalcourses' => new external_value(PARAM_INT,   'Total courses'),
            'courses'      => new external_multiple_structure(
                new external_single_structure([
                    'id'              => new external_value(PARAM_INT,  'Course ID'),
                    'fullname'        => new external_value(PARAM_TEXT, 'Full name'),
                    'shortname'       => new external_value(PARAM_TEXT, 'Short name'),
                    'idnumber'        => new external_value(PARAM_TEXT, 'ID number'),
                    'summary'         => new external_value(PARAM_RAW,  'Summary'),
                    'visible'         => new external_value(PARAM_INT,  'Visible'),
                    'startdate'       => new external_value(PARAM_INT,  'Start date'),
                    'enddate'         => new external_value(PARAM_INT,  'End date'),
                    'categoryid'      => new external_value(PARAM_INT,  'Category ID'),
                    'categoryname'    => new external_value(PARAM_TEXT, 'Category name'),
                    'categorypath'    => new external_value(PARAM_TEXT, 'Category path'),
                    'categoryvisible' => new external_value(PARAM_INT,  'Category visible'),
                    'metadata'        => new external_multiple_structure(
                        new external_single_structure([
                            'name'  => new external_value(PARAM_TEXT, 'Field shortname'),
                            'value' => new external_value(PARAM_RAW,  'Field value'),
                        ]),
                        'Custom course fields'
                    ),
                ])
            ),
        ]);
    }
}
