<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * External API for getting student grades across courses
 *
 * @package    local_coursegrades
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_coursegrades\external;

defined('MOODLE_INTERNAL') || die();

require_once("$CFG->libdir/externallib.php");
require_once("$CFG->libdir/gradelib.php");
require_once("$CFG->dirroot/grade/report/user/classes/external/user.php");

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;
use context_course;
use context_system;

/**
 * External API class for getting student grades
 *
 * @package    local_coursegrades
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_student_grades extends external_api
{

    /**
     * Returns description of method parameters
     *
     * @return external_function_parameters
     */
    public static function get_student_grades_parameters()
    {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'User ID (0 for current user)', VALUE_DEFAULT, 0)
        ]);
    }

    /**
     * Get student grades across all enrolled courses
     *
     * @param int $userid User ID (0 for current user)
     * @return array Student grades data
     */
    public static function get_student_grades($userid = 0)
    {
        global $DB, $USER;

        // Parameter validation
        $params = self::validate_parameters(
            self::get_student_grades_parameters(),
            ['userid' => $userid]
        );

        // If userid is 0, use current user
        if ($params['userid'] == 0) {
            $params['userid'] = $USER->id;
        }

        // Validate context - require system context for capability check
        $context = context_system::instance();
        self::validate_context($context);

        // Check if user exists
        $user = $DB->get_record('user', ['id' => $params['userid']], '*', MUST_EXIST);

        // Get all courses the user is enrolled in
        $courses = enrol_get_users_courses($params['userid'], true, 'id,fullname,shortname,visible');

        $result = [
            'userid' => $params['userid'],
            'username' => $user->username,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'courses' => []
        ];

        foreach ($courses as $course) {
            // Validate course context and check if user can view grades
            $coursecontext = context_course::instance($course->id);

            // Check if current user can view this student's grades
            // Students can view their own grades, teachers can view all
            if (
                $params['userid'] != $USER->id &&
                !has_capability('moodle/grade:viewall', $coursecontext)
            ) {
                continue; // Skip courses where current user doesn't have permission
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

                // Get grade items using gradereport_user_get_grade_items
                $gradeitems = \gradereport_user\external\user::get_grade_items(
                    $course->id,
                    $params['userid']
                );

                // Process grade items
                $coursedata = [
                    'courseid' => $course->id,
                    'coursename' => $course->fullname,
                    'shortname' => $course->shortname,
                    'visible' => $course->visible,
                    'grades' => [],
                    'metadata' => $metadata,
                ];

                // Collect all cmids to fetch custom field data once
                $cmids = [];
                if (isset($gradeitems['usergrades']) && !empty($gradeitems['usergrades'])) {
                    foreach ($gradeitems['usergrades'][0]['gradeitems'] as $item) {
                        if (
                            $item['itemtype'] === 'mod' &&
                            in_array($item['itemmodule'], ['quiz', 'assign']) &&
                            isset($item['cmid'])
                        ) {
                            $cmids[] = $item['cmid'];
                        }
                    }
                }

                // Get custom field data for all cmids at once (same as teacher view)
                $customfielddata = self::get_custom_field_data($cmids);

                // Process each grade item
                if (isset($gradeitems['usergrades']) && !empty($gradeitems['usergrades'])) {
                    foreach ($gradeitems['usergrades'][0]['gradeitems'] as $item) {
                        // Skip course total and categories
                        if ($item['itemtype'] === 'course' || $item['itemtype'] === 'category') {
                            continue;
                        }

                        // Only process mod items (quiz and assign)
                        if (
                            $item['itemtype'] === 'mod' &&
                            in_array($item['itemmodule'], ['quiz', 'assign'])
                        ) {

                            $cmid = $item['cmid'] ?? 0;

                            // Get examtype from custom field data (same as teacher view)
                            $examtype = null;
                            if ($cmid && isset($customfielddata[$cmid]['examtype'])) {
                                $examtype = $customfielddata[$cmid]['examtype'];
                            }

                            $moduledata = [
                                'moduleid' => $item['id'] ?? 0,
                                'activityid' => $cmid,
                                'iteminstance' => $item['iteminstance'] ?? 0,
                                'modulename' => $item['itemname'] ?? '',
                                'itemmodule' => $item['itemmodule'] ?? '',
                                'grade' => $item['graderaw'],
                                'examtype' => $examtype,
                                'itemnumber' => $item['itemnumber'] ?? 0
                            ];

                            $coursedata['grades'][] = $moduledata;
                        }
                    }
                }

                $result['courses'][] = $coursedata;
            } catch (\Exception $e) {
                // Log error but continue with other courses
                debugging("Error getting grades for course {$course->id}: " . $e->getMessage());
            }
        }

        return $result;
    }

    /**
     * Get custom field data for course modules
     * Same implementation as get_course_data for consistency
     * 
     * @param array $cmids Array of course module IDs
     * @return array Array of custom field data indexed by cmid
     */
    private static function get_custom_field_data($cmids)
    {
        global $DB;

        if (empty($cmids)) {
            return [];
        }

        list($insql, $params) = $DB->get_in_or_equal($cmids, SQL_PARAMS_NAMED);

        // Query custom field data with field configuration
        $sql = "
            SELECT cd.instanceid as cmid, 
                   cf.shortname, 
                   cf.type,
                   cd.value,
                   cd.intvalue,
                   cf.configdata
            FROM {customfield_data} cd
            JOIN {customfield_field} cf ON cf.id = cd.fieldid
            WHERE cd.instanceid $insql
        ";

        $records = $DB->get_records_sql($sql, $params);

        // Organize by cmid and shortname
        $result = [];
        foreach ($records as $record) {
            if (!isset($result[$record->cmid])) {
                $result[$record->cmid] = [];
            }

            // Decode the value based on field type
            $decodedValue = self::decode_custom_field_value($record);
            $result[$record->cmid][$record->shortname] = $decodedValue;
        }

        return $result;
    }

    /**
     * Decode custom field value based on its type
     * Same implementation as get_course_data for consistency
     * 
     * @param object $record Database record with field data
     * @return string|null Decoded value
     */
    private static function decode_custom_field_value($record)
    {
        // For select menu fields, decode the index to actual value
        if ($record->type === 'select') {
            // Parse configdata (stored as JSON)
            $configdata = json_decode($record->configdata);

            if (isset($configdata->options)) {
                // Options are stored as a newline-separated string
                $options = explode("\n", trim($configdata->options));

                // Select fields store the selected index in intvalue (1-based indexing)
                // Subtract 1 to convert to 0-based array index
                $index = (int)$record->intvalue - 1;

                if ($index >= 0 && isset($options[$index])) {
                    $option = trim($options[$index]);

                    // Options can be in format "VALUE|Display Text" or just "VALUE"
                    if (strpos($option, '|') !== false) {
                        $parts = explode('|', $option, 2);
                        return trim($parts[0]); // Return the VALUE part (e.g., "EXAM_15M")
                    }

                    return $option; // Return as-is if no | separator
                }
            }

            return null; // Return null if index not found
        }

        // For text and other field types, return value as-is
        return $record->value ?? null;
    }

    /**
     * Returns description of method result value
     *
     * @return external_single_structure
     */
    public static function get_student_grades_returns()
    {
        return new external_single_structure([
            'userid' => new external_value(PARAM_INT, 'User ID'),
            'username' => new external_value(PARAM_TEXT, 'Username'),
            'firstname' => new external_value(PARAM_TEXT, 'First name'),
            'lastname' => new external_value(PARAM_TEXT, 'Last name'),
            'email' => new external_value(PARAM_EMAIL, 'Email address'),
            'courses' => new external_multiple_structure(
                new external_single_structure([
                    'courseid' => new external_value(PARAM_INT, 'Course ID'),
                    'coursename' => new external_value(PARAM_TEXT, 'Course full name'),
                    'shortname' => new external_value(PARAM_TEXT, 'Course short name'),
                    'visible' => new external_value(PARAM_INT, 'Course visibility'),
                    'grades' => new external_multiple_structure(
                        new external_single_structure([
                            'moduleid' => new external_value(PARAM_INT, 'Grade item ID'),
                            'activityid' => new external_value(PARAM_INT, 'Course module ID'),
                            'iteminstance' => new external_value(PARAM_INT, 'Module instance ID'),
                            'modulename' => new external_value(PARAM_TEXT, 'Module name'),
                            'itemmodule' => new external_value(PARAM_TEXT, 'Module type (quiz|assign)'),
                            'grade' => new external_value(PARAM_FLOAT, 'Raw grade', VALUE_OPTIONAL),
                            'examtype' => new external_value(PARAM_TEXT, 'Exam type from custom field', VALUE_OPTIONAL),
                            'itemnumber' => new external_value(PARAM_INT, 'Grade item number')
                        ]),
                        'Graded modules'
                    ),
                    'metadata' => new external_multiple_structure(
                        new external_single_structure([
                            'name'  => new external_value(PARAM_TEXT, 'Custom field shortname'),
                            'value' => new external_value(PARAM_RAW, 'Custom field value')
                        ]),
                        'Custom course metadata'
                    ),
                ]),
                'Courses with grades'
            )
        ]);
    }
}
