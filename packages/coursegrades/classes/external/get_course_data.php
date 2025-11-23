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
 * External API for getting course data
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

/**
 * External API class for getting course data
 *
 * @package    local_coursegrades
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_course_data extends external_api
{

    /**
     * Returns description of method parameters
     *
     * @return external_function_parameters
     */
    public static function get_course_data_parameters()
    {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID')
        ]);
    }

    /**
     * Get course data including modules and student grades
     *
     * @param int $courseid Course ID
     * @return array Course data with modules and students
     */
    public static function get_course_data($courseid)
    {
        global $DB, $CFG;

        $params = self::validate_parameters(self::get_course_data_parameters(), ['courseid' => $courseid]);

        // Check permissions
        $context = context_course::instance($courseid);
        self::validate_context($context);
        require_capability('moodle/grade:viewall', $context);

        // 1️⃣ Get course info
        $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);

        // 2️⃣ Get graded modules (quiz + assign)
        $sqlmodules = "
            SELECT cm.id AS cmid, cm.instance, cm.module, m.name AS moduletype,
                   gi.id AS gradeitemid, gi.itemname, gi.itemtype, gi.itemmodule,
                   gi.grademax, gi.grademin, gi.idnumber,
                   cm.section
            FROM {course_modules} cm
            JOIN {modules} m ON cm.module = m.id
            JOIN {grade_items} gi ON gi.iteminstance = cm.instance AND gi.itemmodule = m.name
            WHERE cm.course = :courseid
              AND m.name IN ('quiz', 'assign')
              AND gi.itemtype = 'mod'
        ";
        $modules = $DB->get_records_sql($sqlmodules, ['courseid' => $courseid]);

        $customfielddata = self::get_custom_field_data(array_column((array)$modules, 'cmid'));

        // 3️⃣ Get enrolled students
        $students = get_enrolled_users($context, 'moodle/grade:view', 0, 'u.id, u.firstname, u.lastname, u.email, u.username');

        // 4️⃣ Get grades with correct weightraw using Moodle's official API
        $gradesData = [];

        foreach ($students as $student) {
            // Use the correct namespaced class for Moodle 5.0
            $userGrades = \gradereport_user\external\user::get_grade_items($courseid, $student->id);

            if (!empty($userGrades['usergrades'][0]['gradeitems'])) {
                foreach ($userGrades['usergrades'][0]['gradeitems'] as $item) {
                    // Only include module grades (not course total)
                    if (
                        $item['itemtype'] === 'mod' &&
                        in_array($item['itemmodule'], ['quiz', 'assign'])
                    ) {

                        $gradesData[] = [
                            'userid' => $student->id,
                            'itemid' => $item['id'],
                            'cmid' => $item['cmid'],
                            'finalgrade' => (float)$item['graderaw'],
                            'itemmodule' => $item['itemmodule'],
                            'itemnumber' => $item['itemnumber'],
                        ];
                    }
                }
            }
        }

        // 5️⃣ Organize data into clean structure
        $moduleList = [];
        foreach ($modules as $m) {
            $examtype = $customfielddata[$m->cmid]['examtype'] ?? null;

            $moduleList[$m->gradeitemid] = [
                'id' => $m->gradeitemid,
                'cmid' => $m->cmid,
                'name' => $m->itemname,
                'type' => $m->itemmodule,
                'idnumber' => $m->idnumber,
                'examtype' => $examtype,
                'itemnumber' => $m->itemnumber,
            ];
        }

        $studentList = [];
        foreach ($students as $s) {
            $studentList[$s->id] = [
                'id' => $s->id,
                'fullname' => fullname($s),
                'username' => $s->username,
                'firstname' => $s->firstname,
                'lastname' => $s->lastname,
                'email' => $s->email,
                'grades' => [],
            ];
        }

        foreach ($gradesData as $g) {
            if (isset($studentList[$g['userid']]) && isset($moduleList[$g['itemid']])) {
                $examtype = $customfielddata[$g['cmid']]['examtype'] ?? null;
                $studentList[$g['userid']]['grades'][] = [
                    'moduleid' => $g['itemid'],
                    'modulename' => $moduleList[$g['itemid']]['name'],
                    'grade' => (float)$g['finalgrade'],
                    'examtype' => $examtype,
                    'itemmodule' => $g['itemmodule'],
                    'iteminstance' => $g['iteminstance'],
                    'itemnumber' => (int)$g['itemnumber'],
                    'activityid' => (int)$g['cmid']
                ];
            }
        }

        return [
            'course' => [
                'id' => $course->id,
                'fullname' => $course->fullname,
                'shortname' => $course->shortname,
                'idnumber' => $course->idnumber,
                'visible' => $course->visible,
                'summary' => $course->summary,
                'category' => $course->category,
                'startdate' => $course->startdate,
                'enddate' => $course->enddate,
                'timemodified' => $course->timemodified,
                'marker' => $course->marker,
            ],
            'modules' => array_values($moduleList),
            'students' => array_values($studentList),
        ];
    }

    /**
     * Get custom field data for course modules
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
    public static function get_course_data_returns()
    {
        return new external_single_structure([
            'course' => new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Course ID'),
                'fullname' => new external_value(PARAM_TEXT, 'Course name'),
                'shortname' => new external_value(PARAM_TEXT, 'Short name of the course'),
                'idnumber' => new external_value(PARAM_RAW, 'Course ID number', VALUE_OPTIONAL),
                'visible' => new external_value(PARAM_INT, 'Whether the course is visible (1) or hidden (0)', VALUE_OPTIONAL),
                'summary' => new external_value(PARAM_RAW, 'Course summary', VALUE_OPTIONAL),
                'category' => new external_value(PARAM_INT, 'Category ID', VALUE_OPTIONAL),
                'startdate' => new external_value(PARAM_INT, 'Course start date (timestamp)', VALUE_OPTIONAL),
                'enddate' => new external_value(PARAM_INT, 'Course end date (timestamp)', VALUE_OPTIONAL),
                'timemodified' => new external_value(PARAM_INT, 'Last modified timestamp', VALUE_OPTIONAL),
                'marker' => new external_value(PARAM_INT, 'Section marker ID', VALUE_OPTIONAL),
            ]),
            'modules' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Grade item ID'),
                    'cmid' => new external_value(PARAM_INT, 'Course module ID'),
                    'name' => new external_value(PARAM_TEXT, 'Module name'),
                    'type' => new external_value(PARAM_TEXT, 'Module type (quiz|assign)'),
                    'idnumber' => new external_value(PARAM_TEXT, 'Module id number', VALUE_OPTIONAL),
                    'examtype' => new external_value(PARAM_TEXT, 'Exam type from custom field', VALUE_OPTIONAL),
                    'itemnumber' => new external_value(PARAM_INT, 'Grade item number'),
                ])
            ),
            'students' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'User ID'),
                    'fullname' => new external_value(PARAM_TEXT, 'Full name'),
                    'firstname' => new external_value(PARAM_TEXT, 'First name'),
                    'lastname' => new external_value(PARAM_TEXT, 'Last name'),
                    'username' => new external_value(PARAM_TEXT, 'User name'),
                    'email' => new external_value(PARAM_TEXT, 'Email'),
                    'grades' => new external_multiple_structure(
                        new external_single_structure([
                            'moduleid' => new external_value(PARAM_INT, 'Module ID'),
                            'modulename' => new external_value(PARAM_TEXT, 'Module name'),
                            'grade' => new external_value(PARAM_FLOAT, 'Final grade'),
                            'examtype' => new external_value(PARAM_TEXT, 'Exam type from custom field', VALUE_OPTIONAL),
                            'itemmodule' => new external_value(PARAM_TEXT, 'Grade item module'),
                            'iteminstance' => new external_value(PARAM_INT, 'Grade item id'),
                            'itemnumber' => new external_value(PARAM_INT, 'Grade item number'),
                            'activityid' => new external_value(PARAM_INT, 'Course module id'),
                        ]),
                        'Grades for this student',
                        VALUE_OPTIONAL
                    )
                ])
            ),
        ]);
    }
}
