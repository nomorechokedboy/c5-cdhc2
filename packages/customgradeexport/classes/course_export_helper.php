<?php

/**
 * Course grade export helper class
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/gradelib.php');
require_once($CFG->libdir . '/excellib.class.php');

/**
 * Helper class for exporting course grades
 */
class course_export_helper
{

    /** @var stdClass Course */
    protected $course;

    /** @var context_course Context */
    protected $context;

    /** @var array Exam type mappings */
    const EXAM_TYPE_15P = '15P';  // Thường xuyên
    const EXAM_TYPE_1T = '1T';    // Định kỳ  
    const EXAM_TYPE_THI = 'Thi';  // Thi

    /**
     * Constructor
     *
     * @param stdClass $course Course
     */
    public function __construct($course)
    {
        $this->course = $course;
        $this->context = \context_course::instance($course->id);
    }

    /**
     * Export course grades to Excel with template
     *
     * @param string|null $templatePath Optional template path
     */
    public function export_grades($templatePath = null)
    {
        require_capability('moodle/grade:viewall', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        // Get export data
        $data = $this->prepare_export_data();

        $filename = clean_filename($this->course->shortname . '_course_grades.xls');

        if ($templatePath && file_exists($templatePath)) {
            // Use template
            $this->export_with_template($data, $templatePath, $filename);
        } else {
            // Use default export
            $this->send_excel_download($data, $filename);
        }
    }

    /**
     * Export using template
     *
     * @param array $data Export data
     * @param string $templatePath Template file path
     * @param string $filename Output filename
     */
    protected function export_with_template($data, $templatePath, $filename)
    {
        // Prepare variables for template
        $variables = [
            'coursename' => $this->course->fullname,
            'courseshortname' => $this->course->shortname,
            'exportdate' => userdate(time(), '%d/%m/%Y'),
            'exporttime' => userdate(time(), '%H:%M:%S'),
        ];

        // Use Excel template processor
        excel_template_processor::export_from_template($templatePath, $variables, $data, $filename);
    }

    /**
     * Prepare data for export with dynamic exam columns
     *
     * @return array 2D array of export data
     */
    protected function prepare_export_data()
    {
        global $DB;

        // Get all grade items for this course
        $gradeItems = $this->get_grade_items_by_exam_type();

        // Build dynamic headers
        $headers = $this->build_headers($gradeItems);

        $data = [];
        $data[] = $headers;

        // Get enrolled students
        $students = $this->get_enrolled_students();

        $rowNum = 1;
        foreach ($students as $student) {
            $row = $this->build_student_row($student, $gradeItems, $rowNum);
            $data[] = $row;
            $rowNum++;
        }

        return $data;
    }

    /**
     * Get grade items organized by exam type
     *
     * @return array Array with keys: '15P', '1T', 'Thi'
     */
    protected function get_grade_items_by_exam_type()
    {
        global $DB;

        $result = [
            self::EXAM_TYPE_15P => [],
            self::EXAM_TYPE_1T => [],
            self::EXAM_TYPE_THI => [],
        ];

        // Get all grade items for course (excluding course total)
        $sql = "SELECT gi.*
                FROM {grade_items} gi
                WHERE gi.courseid = :courseid
                  AND gi.itemtype = 'mod'
                ORDER BY gi.sortorder";

        $items = $DB->get_records_sql($sql, ['courseid' => $this->course->id]);

        // Collect all cmids for batch retrieval (same as your get_student_grades)
        $cmids = [];
        $itemmap = []; // Map cmid to grade item

        foreach ($items as $item) {
            if ($item->iteminstance) {
                $cm = get_coursemodule_from_instance($item->itemmodule, $item->iteminstance, $item->courseid);
                if ($cm) {
                    $cmids[] = $cm->id;
                    $itemmap[$cm->id] = $item;
                }
            }
        }

        // Get custom field data for all cmids at once (batch retrieval)
        $customfielddata = $this->get_custom_field_data($cmids);

        // Organize items by exam type
        foreach ($itemmap as $cmid => $item) {
            // Get examtype from custom field data
            $examtype = isset($customfielddata[$cmid]['examtype']) ? $customfielddata[$cmid]['examtype'] : '';

            // If no custom field, fallback to name parsing
            if (!$examtype) {
                $examtype = $this->parse_examtype_from_name($item->itemname);
            }

            if (isset($result[$examtype])) {
                $result[$examtype][] = $item;
            }
        }

        return $result;
    }

    /**
     * Get custom field data for course modules
     * Same implementation as your get_student_grades for consistency
     * 
     * @param array $cmids Array of course module IDs
     * @return array Array of custom field data indexed by cmid
     */
    protected function get_custom_field_data($cmids)
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
            $decodedValue = $this->decode_custom_field_value($record);
            $result[$record->cmid][$record->shortname] = $decodedValue;
        }

        return $result;
    }

    /**
     * Decode custom field value based on its type
     * Same implementation as your get_student_grades for consistency
     * 
     * @param object $record Database record with field data
     * @return string|null Decoded value
     */
    protected function decode_custom_field_value($record)
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
                        return trim($parts[0]); // Return the VALUE part (e.g., "15P")
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
     * Parse exam type from activity name (fallback method)
     * 
     * @param string $itemname Grade item name
     * @return string Exam type or empty string
     */
    protected function parse_examtype_from_name($itemname)
    {
        $itemname = strtolower($itemname);

        if (strpos($itemname, '15p') !== false || strpos($itemname, 'thường xuyên') !== false) {
            return self::EXAM_TYPE_15P;
        }

        if (strpos($itemname, '1t') !== false || strpos($itemname, 'định kỳ') !== false) {
            return self::EXAM_TYPE_1T;
        }

        if (strpos($itemname, 'thi') !== false) {
            return self::EXAM_TYPE_THI;
        }

        return '';
    }

    /**
     * Get examtype custom field value for a course module
     * Uses the local_modcustomfields plugin structure
     *
     * @param int $cmid Course module ID
     * @return string|null Exam type value or null
     */
    protected function get_examtype_from_customfield($cmid)
    {
        global $DB;

        // Query custom field data - same structure as your code
        $sql = "
            SELECT cd.value, cd.intvalue, cf.type, cf.configdata
            FROM {customfield_data} cd
            JOIN {customfield_field} cf ON cf.id = cd.fieldid
            WHERE cd.instanceid = :cmid
              AND cf.shortname = 'examtype'
        ";

        $record = $DB->get_record_sql($sql, ['cmid' => $cmid]);

        if (!$record) {
            return null;
        }

        // Decode value using same logic as your code
        return $this->decode_custom_field_value($record);
    }

    /**
     * Build headers with dynamic exam columns
     *
     * @param array $gradeItems Grade items by exam type
     * @return array Header row
     */
    protected function build_headers($gradeItems)
    {
        $headers = [
            'TT',           // Row number
            'Họ và tên',   // Full name
            'Mã số',       // ID number
        ];

        // Add 15P columns (Thường xuyên)
        $count15P = count($gradeItems[self::EXAM_TYPE_15P]);
        for ($i = 1; $i <= max(3, $count15P); $i++) {
            $headers[] = '15P-' . sprintf('%02d', $i);
        }

        // Add 1T columns (Định kỳ)
        $count1T = count($gradeItems[self::EXAM_TYPE_1T]);
        for ($i = 1; $i <= max(3, $count1T); $i++) {
            $headers[] = '1T-' . sprintf('%02d', $i);
        }

        // Add Thi columns (always 2)
        $headers[] = 'Thi-01';
        $headers[] = 'Thi-02';

        // Add summary columns
        $headers[] = 'TKMH';      // Tổng kết môn học
        $headers[] = 'Xếp loại';  // Classification
        $headers[] = 'Ghi chú';   // Notes

        return $headers;
    }

    /**
     * Get enrolled students with their info
     *
     * @return array Array of student records
     */
    protected function get_enrolled_students()
    {
        global $DB;

        $sql = "SELECT DISTINCT u.id, u.firstname, u.lastname, u.idnumber,
                       u.institution, u.department
                FROM {user} u
                JOIN {user_enrolments} ue ON u.id = ue.userid
                JOIN {enrol} e ON ue.enrolid = e.id
                WHERE e.courseid = :courseid
                  AND ue.status = 0
                  AND e.status = 0
                ORDER BY u.lastname, u.firstname";

        return $DB->get_records_sql($sql, ['courseid' => $this->course->id]);
    }

    /**
     * Build student row with grades and calculations
     *
     * @param stdClass $student Student record
     * @param array $gradeItems Grade items by exam type
     * @param int $rowNum Row number
     * @return array Row data
     */
    protected function build_student_row($student, $gradeItems, $rowNum)
    {
        $row = [
            $rowNum,
            fullname($student),
            $student->idnumber ?: '',
        ];

        // Get all grades for this student
        $grades15P = $this->get_student_grades($student->id, $gradeItems[self::EXAM_TYPE_15P]);
        $grades1T = $this->get_student_grades($student->id, $gradeItems[self::EXAM_TYPE_1T]);
        $gradesThi = $this->get_student_grades($student->id, $gradeItems[self::EXAM_TYPE_THI]);

        // Add 15P grades (pad to at least 3 columns)
        for ($i = 0; $i < max(3, count($gradeItems[self::EXAM_TYPE_15P])); $i++) {
            $row[] = isset($grades15P[$i]) ? round($grades15P[$i], 2) : '';
        }

        // Add 1T grades (pad to at least 3 columns)
        for ($i = 0; $i < max(3, count($gradeItems[self::EXAM_TYPE_1T])); $i++) {
            $row[] = isset($grades1T[$i]) ? round($grades1T[$i], 2) : '';
        }

        // Add Thi grades (always 2 columns)
        $row[] = isset($gradesThi[0]) ? round($gradesThi[0], 2) : '';
        $row[] = isset($gradesThi[1]) ? round($gradesThi[1], 2) : '';

        // Calculate TKMH and classification
        $tkmh = $this->calculate_tkmh($grades15P, $grades1T, $gradesThi);
        $classification = $this->get_classification($tkmh);

        $row[] = $tkmh !== null ? round($tkmh, 2) : '';
        $row[] = $classification;
        $row[] = ''; // Notes column

        return $row;
    }

    /**
     * Get student grades for specific items
     *
     * @param int $userid User ID
     * @param array $items Grade items
     * @return array Array of grade values
     */
    protected function get_student_grades($userid, $items)
    {
        global $DB;

        $grades = [];

        foreach ($items as $item) {
            $grade = $DB->get_record('grade_grades', [
                'itemid' => $item->id,
                'userid' => $userid
            ]);

            if ($grade && $grade->finalgrade !== null) {
                $grades[] = $grade->finalgrade;
            }
        }

        return $grades;
    }

    /**
     * Calculate TKMH (Tổng kết môn học)
     * Formula: (avg(15P) + avg(1T) * 2) * 0.4 + avg(Thi) * 0.6
     *
     * @param array $grades15P 15P grades
     * @param array $grades1T 1T grades
     * @param array $gradesThi Thi grades
     * @return float|null TKMH score or null if cannot calculate
     */
    protected function calculate_tkmh($grades15P, $grades1T, $gradesThi)
    {
        // Calculate averages
        $avg15P = !empty($grades15P) ? array_sum($grades15P) / count($grades15P) : null;
        $avg1T = !empty($grades1T) ? array_sum($grades1T) / count($grades1T) : null;
        $avgThi = !empty($gradesThi) ? array_sum($gradesThi) / count($gradesThi) : null;

        // If missing 15P or 1T, use 0
        $avg15P = $avg15P ?? 0;
        $avg1T = $avg1T ?? 0;
        $avgThi = $avgThi ?? 0;

        // Calculate: (avg(15P) + avg(1T) * 2) * 0.4 + avg(Thi) * 0.6
        $continuousAssessment = ($avg15P + ($avg1T * 2)) / 3;

        $tkmh = $continuousAssessment * 0.4 + $avgThi * 0.6;

        return $tkmh;
    }

    /**
     * Get classification based on TKMH
     *
     * @param float|null $tkmh TKMH score
     * @return string Classification
     */
    protected function get_classification($tkmh)
    {
        if ($tkmh === null) {
            return '';
        }

        if ($tkmh >= 9) {
            return 'XS';    // Xuất sắc
        } else if ($tkmh >= 8) {
            return 'G';     // Giỏi
        } else if ($tkmh >= 7) {
            return 'Khá';
        } else if ($tkmh >= 5) {
            return 'TB';    // Trung bình
        } else {
            return 'Yếu';
        }
    }

    /**
     * Send Excel file download
     *
     * @param array $data 2D array of export data
     * @param string $filename Filename
     */
    protected function send_excel_download($data, $filename)
    {
        $workbook = new \MoodleExcelWorkbook('-');
        $workbook->send($filename);

        $worksheet = $workbook->add_worksheet('Grades');

        // Write data
        $row = 0;
        foreach ($data as $rowdata) {
            $col = 0;
            foreach ($rowdata as $cell) {
                $worksheet->write_string($row, $col, $cell);
                $col++;
            }
            $row++;
        }

        $workbook->close();
        exit;
    }
}
