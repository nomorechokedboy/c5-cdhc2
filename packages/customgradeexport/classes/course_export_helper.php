<?php

/**
 * Course grade export helper class
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/gradelib.php');
require_once($CFG->libdir . '/excellib.class.php');

class course_export_helper
{

    protected $course;
    protected $context;

    const EXAM_TYPE_15P = '15P';
    const EXAM_TYPE_1T  = '1T';
    const EXAM_TYPE_THI = 'Thi';

    public function __construct($course)
    {
        $this->course  = $course;
        $this->context = \context_course::instance($course->id);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PUBLIC API METHOD — returns bytes (no headers, no exit)
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Generate the export file and return raw bytes + metadata.
     *
     * Capability checks are performed by the caller (external function).
     * No HTTP headers are sent, no exit() is called.
     *
     * @param  string|null $templatePath  Absolute path to .docx template, or null
     * @return array  {content: string, filename: string, mimetype: string}
     */
    public function get_export_bytes(?string $templatePath): array
    {
        $data = $this->prepare_export_data();
        $category = \core_course_category::get($this->course->category);

        $variables = array_merge(
            [
                'coursename'      => $this->course->fullname,
                'classname'       => $category->idnumber,
                'courseshortname' => $this->course->shortname,
                'exportdate'      => userdate(time(), '%d/%m/%Y'),
                'exporttime'      => userdate(time(), '%H:%M:%S'),
            ],
            $data['stats']
        );

        if ($templatePath !== null && file_exists($templatePath)) {
            $ext = strtolower(pathinfo($templatePath, PATHINFO_EXTENSION));

            if ($ext === 'docx') {
                $content = docx_exporter::get_course_template_content(
                    $templatePath,
                    $variables,
                    $data
                );
                return [
                    'content'  => $content,
                    'filename' => clean_filename($this->course->shortname . '_course_grades.docx'),
                    'mimetype' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ];
            }
            // For xlsx templates, fall through to default DOCX
        }

        // Default: generate a simple table DOCX without a template
        $content = docx_exporter::get_table_content(
            array_merge([$data['headers']], $data['rows'])
        );
        return [
            'content'  => $content,
            'filename' => clean_filename($this->course->shortname . '_course_grades.docx'),
            'mimetype' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
    }

    // ────────────────────────────────────────────────────────────────────────
    // BROWSER-STREAMING METHODS
    // ────────────────────────────────────────────────────────────────────────

    public function export_grades($templatePath = null)
    {
        require_capability('moodle/grade:viewall', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        $data = $this->prepare_export_data();

        if ($templatePath && file_exists($templatePath)) {
            $ext = strtolower(pathinfo($templatePath, PATHINFO_EXTENSION));
            if ($ext === 'docx') {
                $filename = clean_filename($this->course->shortname . '_course_grades.docx');
                $this->export_with_docx_template($data, $templatePath, $filename);
            } else {
                $filename = clean_filename($this->course->shortname . '_course_grades.xls');
                $this->export_with_excel_template($data, $templatePath, $filename);
            }
        } else {
            $filename = clean_filename($this->course->shortname . '_course_grades.xls');
            $this->send_excel_download(
                array_merge([$data['headers']], $data['rows']),
                $filename
            );
        }
    }

    public function export_grades_excel($templatePath = null)
    {
        require_capability('moodle/grade:viewall', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        $data = $this->prepare_export_data();

        if ($templatePath && file_exists($templatePath)) {
            $filename = clean_filename($this->course->shortname . '_course_grades.xlsx');
            $this->export_with_excel_template($data, $templatePath, $filename);
        } else {
            $filename = clean_filename($this->course->shortname . '_course_grades.xls');
            $this->send_excel_download(
                array_merge([$data['headers']], $data['rows']),
                $filename
            );
        }
    }

    public function export_grades_docx($templatePath = null)
    {
        require_capability('moodle/grade:viewall', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        $data = $this->prepare_export_data();
        $filename = clean_filename($this->course->shortname . '_course_grades.docx');

        if ($templatePath && file_exists($templatePath)) {
            $this->export_with_docx_template($data, $templatePath, $filename);
        } else {
            docx_exporter::export_table(
                array_merge([$data['headers']], $data['rows']),
                $filename
            );
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // PROTECTED HELPERS
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Build the $variables array including classname and all classification stats.
     */
    protected function build_variables(array $data): array
    {
        return array_merge(
            [
                'coursename'      => $this->course->fullname,
                'classname'       => $this->course->shortname,
                'courseshortname' => $this->course->shortname,
                'exportdate'      => userdate(time(), '%d/%m/%Y'),
                'exporttime'      => userdate(time(), '%H:%M:%S'),
            ],
            $data['stats']
        );
    }

    protected function export_with_excel_template(array $data, string $templatePath, string $filename): void
    {
        $variables = $this->build_variables($data);
        excel_template_processor::export_from_template($templatePath, $variables, $data, $filename);
    }

    protected function export_with_docx_template(array $data, string $templatePath, string $filename): void
    {
        $variables = $this->build_variables($data);
        docx_exporter::export_course_template($templatePath, $variables, $data, $filename);
    }

    /**
     * Core data-preparation logic shared by both streaming and API paths.
     *
     * Returns an array with keys:
     *   'headers'  => string[]       — column header labels
     *   'rows'     => array[]        — numeric rows for Excel
     *   'rows_kv'  => array[]        — associative rows for DOCX template cloning
     *   'stats'    => array          — classification counts/percentages + total
     */
    protected function prepare_export_data(): array
    {
        $gradeItems = $this->get_grade_items_by_exam_type();
        $headers    = $this->build_headers($gradeItems);
        $rows       = [];
        $rows_kv    = [];
        $students   = $this->get_enrolled_students();
        $rowNum     = 1;

        foreach ($students as $student) {
            $grades15P = $this->get_student_grades($student->id, $gradeItems[self::EXAM_TYPE_15P]);
            $grades1T  = $this->get_student_grades($student->id, $gradeItems[self::EXAM_TYPE_1T]);
            $gradesThi = $this->get_student_grades($student->id, $gradeItems[self::EXAM_TYPE_THI]);

            $tkmh    = $this->calculate_tkmh($grades15P, $grades1T, $gradesThi);
            $tkmh = $tkmh !== null ? round($tkmh, 1) : null;
            $xepLoai = $this->get_classification($tkmh);

            // Numeric row (Excel)
            $row = [$rowNum, fullname($student), $student->idnumber ?: ''];
            for ($i = 0; $i < max(3, count($gradeItems[self::EXAM_TYPE_15P])); $i++) {
                $row[] = isset($grades15P[$i]) ? round($grades15P[$i], 1) : '';
            }
            for ($i = 0; $i < max(3, count($gradeItems[self::EXAM_TYPE_1T])); $i++) {
                $row[] = isset($grades1T[$i]) ? round($grades1T[$i], 1) : '';
            }
            $row[] = isset($gradesThi[0]) ? round($gradesThi[0], 1) : '';
            $row[] = isset($gradesThi[1]) ? round($gradesThi[1], 1) : '';
            $row[] = $tkmh !== null ? $tkmh : '';
            $row[] = $xepLoai;
            $row[] = '';
            $rows[] = $row;

            // Associative row (DOCX template)
            $kv = [
                'stt'       => $rowNum,
                'fullname'  => fullname($student),
                'firstname' => $student->firstname,
                'lastname'  => $student->lastname,
                'idnumber'  => $student->idnumber ?: '',
                'tkmh'      => $tkmh !== null ? $tkmh : '',
                'xep_loai'  => $xepLoai,
                'ghi_chu'   => '',
            ];
            for ($i = 0; $i < max(3, count($gradeItems[self::EXAM_TYPE_15P])); $i++) {
                $kv['15p_' . sprintf('%02d', $i + 1)] = isset($grades15P[$i]) ? round($grades15P[$i], 1) : '';
            }
            for ($i = 0; $i < max(3, count($gradeItems[self::EXAM_TYPE_1T])); $i++) {
                $kv['1t_' . sprintf('%02d', $i + 1)] = isset($grades1T[$i]) ? round($grades1T[$i], 1) : '';
            }
            $kv['thi_01'] = isset($gradesThi[0]) ? round($gradesThi[0], 1) : '';
            $kv['thi_02'] = isset($gradesThi[1]) ? round($gradesThi[1], 1) : '';
            $rows_kv[] = $kv;

            $rowNum++;
        }

        // ── Classification statistics ────────────────────────────────────
        // Counts based on the final tkmh value of each student.
        // Thresholds:
        //   XS (Xuất sắc) : tkmh >= 9
        //   G  (Giỏi)     : 8  <= tkmh < 9
        //   Khá           : 7  <= tkmh < 8
        //   Đạt           : 5  <= tkmh < 7
        //   Không đạt     : tkmh < 5
        $counts = [
            'xuat_sac'  => 0,
            'gioi'      => 0,
            'kha'       => 0,
            'dat'       => 0,
            'khong_dat' => 0,
        ];
        $totalWithGrade = 0;

        foreach ($rows_kv as $kv) {
            $raw = $kv['tkmh'];
            if ($raw === '' || $raw === null) {
                continue;
            }
            $t = (float) $raw;
            $totalWithGrade++;
            if ($t >= 9)      $counts['xuat_sac']++;
            if ($t >= 8)  $counts['gioi']++;
            if ($t >= 7)  $counts['kha']++;
            if ($t >= 5)  $counts['dat']++;
            if ($t < 5) $counts['khong_dat']++;
        }

        // Format percentage: one decimal place, no trailing zero (e.g. 33.3 or 100)
        $pct = static function (int $count) use ($totalWithGrade): string {
            if ($totalWithGrade === 0) {
                return '0';
            }
            $p = round($count / $totalWithGrade * 100, 1);
            // Strip unnecessary trailing ".0"
            return rtrim(rtrim(number_format($p, 1, '.', ''), '0'), '.');
        };

        $stats = [
            // Counts
            'xuat_sac_count'  => $counts['xuat_sac'],
            'gioi_count'      => $counts['gioi'],
            'kha_count'       => $counts['kha'],
            'dat_count'       => $counts['dat'],
            'khong_dat_count' => $counts['khong_dat'],
            // Percentages
            'xuat_sac_pct'    => $pct($counts['xuat_sac']),
            'gioi_pct'        => $pct($counts['gioi']),
            'kha_pct'         => $pct($counts['kha']),
            'dat_pct'         => $pct($counts['dat']),
            'khong_dat_pct'   => $pct($counts['khong_dat']),
            // Total
            'total_students'  => $totalWithGrade,
        ];

        return ['headers' => $headers, 'rows' => $rows, 'rows_kv' => $rows_kv, 'stats' => $stats];
    }

    protected function get_grade_items_by_exam_type(): array
    {
        global $DB;

        $result = [
            self::EXAM_TYPE_15P => [],
            self::EXAM_TYPE_1T  => [],
            self::EXAM_TYPE_THI => [],
        ];

        $sql = "SELECT gi.*
                  FROM {grade_items} gi
                 WHERE gi.courseid = :courseid
                   AND gi.itemtype = 'mod'
              ORDER BY gi.sortorder";

        $items   = $DB->get_records_sql($sql, ['courseid' => $this->course->id]);
        $cmids   = [];
        $itemmap = [];

        foreach ($items as $item) {
            if ($item->iteminstance) {
                $cm = get_coursemodule_from_instance(
                    $item->itemmodule,
                    $item->iteminstance,
                    $item->courseid
                );
                if ($cm) {
                    $cmids[]        = $cm->id;
                    $itemmap[$cm->id] = $item;
                }
            }
        }

        $customfielddata = $this->get_custom_field_data($cmids);

        foreach ($itemmap as $cmid => $item) {
            $examtype = isset($customfielddata[$cmid]['examtype'])
                ? $customfielddata[$cmid]['examtype']
                : '';
            if (!$examtype) {
                $examtype = $this->parse_examtype_from_name($item->itemname);
            }
            if (isset($result[$examtype])) {
                $result[$examtype][] = $item;
            }
        }

        return $result;
    }

    protected function get_custom_field_data(array $cmids): array
    {
        global $DB;

        if (empty($cmids)) {
            return [];
        }

        list($insql, $params) = $DB->get_in_or_equal($cmids, SQL_PARAMS_NAMED);

        $sql = "
            SELECT cd.instanceid as cmid,
                   cf.shortname,
                   cf.type,
                   cd.value,
                   cd.intvalue,
                   cf.configdata
              FROM {customfield_data} cd
              JOIN {customfield_field} cf ON cf.id = cd.fieldid
             WHERE cd.instanceid $insql";

        $records = $DB->get_records_sql($sql, $params);
        $result  = [];

        foreach ($records as $record) {
            if (!isset($result[$record->cmid])) {
                $result[$record->cmid] = [];
            }
            $result[$record->cmid][$record->shortname] = $this->decode_custom_field_value($record);
        }

        return $result;
    }

    protected function decode_custom_field_value($record): ?string
    {
        if ($record->type === 'select') {
            $configdata = json_decode($record->configdata);
            if (isset($configdata->options)) {
                $options = explode("\n", trim($configdata->options));
                $index   = (int) $record->intvalue - 1;
                if ($index >= 0 && isset($options[$index])) {
                    $option = trim($options[$index]);
                    if (strpos($option, '|') !== false) {
                        return trim(explode('|', $option, 2)[0]);
                    }
                    return $option;
                }
            }
            return null;
        }
        return $record->value ?? null;
    }

    protected function parse_examtype_from_name(string $itemname): string
    {
        $lower = strtolower($itemname);
        if (strpos($lower, '15p') !== false || strpos($lower, 'thường xuyên') !== false) {
            return self::EXAM_TYPE_15P;
        }
        if (strpos($lower, '1t') !== false || strpos($lower, 'định kỳ') !== false) {
            return self::EXAM_TYPE_1T;
        }
        if (strpos($lower, 'thi') !== false) {
            return self::EXAM_TYPE_THI;
        }
        return '';
    }

    protected function build_headers(array $gradeItems): array
    {
        $headers = ['TT', 'Họ và tên', 'Mã số'];

        for ($i = 1; $i <= max(3, count($gradeItems[self::EXAM_TYPE_15P])); $i++) {
            $headers[] = '15P-' . sprintf('%02d', $i);
        }
        for ($i = 1; $i <= max(3, count($gradeItems[self::EXAM_TYPE_1T])); $i++) {
            $headers[] = '1T-' . sprintf('%02d', $i);
        }
        $headers[] = 'Thi-01';
        $headers[] = 'Thi-02';
        $headers[] = 'TKMH';
        $headers[] = 'Xếp loại';
        $headers[] = 'Ghi chú';

        return $headers;
    }

    protected function get_enrolled_students(): array
    {
        global $DB;

        $context       = \context_course::instance($this->course->id);
        $studentroleids = $DB->get_fieldset_select('role', 'id', 'archetype = :arch', ['arch' => 'student']);

        if (empty($studentroleids)) {
            return [];
        }

        list($rolesql, $roleparams) = $DB->get_in_or_equal($studentroleids, SQL_PARAMS_NAMED, 'rid');

        $sql = "SELECT DISTINCT u.id, u.firstname, u.lastname, u.idnumber,
                                u.institution, u.department
                  FROM {user} u
                  JOIN {user_enrolments} ue ON ue.userid = u.id
                  JOIN {enrol} e ON e.id = ue.enrolid
                  JOIN {role_assignments} ra ON ra.userid = u.id
                 WHERE e.courseid = :courseid
                   AND ra.contextid = :contextid
                   AND ra.roleid $rolesql
                   AND ue.status = 0
                   AND e.status  = 0
                   AND u.deleted   = 0
                   AND u.suspended = 0
              ORDER BY u.lastname, u.firstname";

        return $DB->get_records_sql(
            $sql,
            array_merge(['courseid' => $this->course->id, 'contextid' => $context->id], $roleparams)
        );
    }

    protected function get_student_grades(int $userid, array $items): array
    {
        global $DB;
        $grades = [];
        foreach ($items as $item) {
            $grade = $DB->get_record('grade_grades', ['itemid' => $item->id, 'userid' => $userid]);
            if ($grade && $grade->finalgrade !== null) {
                $grades[] = $grade->finalgrade;
            }
        }
        return $grades;
    }

    protected function calculate_tkmh(array $g15P, array $g1T, array $gThi): ?float
    {
        $avg15P = !empty($g15P) ? array_sum($g15P) / count($g15P) : 0;
        $avg1T  = !empty($g1T)  ? array_sum($g1T)  / count($g1T)  : 0;
        $avgThi = !empty($gThi) ? array_sum($gThi) / count($gThi) : 0;

        return (($avg15P + $avg1T * 2) / 3) * 0.4 + $avgThi * 0.6;
    }

    /**
     * Returns the display label for a given TKMH score.
     *
     * Thresholds match the classification stats computed in prepare_export_data():
     *   >= 9  → XS
     *   >= 8  → G
     *   >= 7  → Khá
     *   >= 5  → Đạt   (previously "TB")
     *   < 5   → Không đạt  (previously "Yếu")
     */
    protected function get_classification(?float $tkmh): string
    {
        if ($tkmh === null) return '';
        if ($tkmh >= 9)  return 'XS';
        if ($tkmh >= 8)  return 'G';
        if ($tkmh >= 7)  return 'Khá';
        if ($tkmh >= 5)  return 'TB';
        return 'Yếu';
    }

    protected function send_excel_download(array $data, string $filename): void
    {
        $workbook  = new \MoodleExcelWorkbook('-');
        $workbook->send($filename);
        $worksheet = $workbook->add_worksheet('Grades');
        $row = 0;
        foreach ($data as $rowdata) {
            $col = 0;
            foreach ($rowdata as $cell) {
                $worksheet->write_string($row, $col++, (string) $cell);
            }
            $row++;
        }
        $workbook->close();
        exit;
    }
}
