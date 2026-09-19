<?php

/**
 * Assignment export helper class
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/excellib.class.php');
require_once($CFG->dirroot . '/mod/assign/locallib.php');

class assign_export_helper
{

    /** @var \stdClass Assignment instance */
    protected $assignment;

    /** @var \stdClass Course module */
    protected $cm;

    /** @var \stdClass Course */
    protected $course;

    /** @var \context_module Context */
    protected $context;

    public function __construct($assignment, $cm, $course)
    {
        $this->assignment = $assignment;
        $this->cm         = $cm;
        $this->course     = $course;
        $this->context    = \context_module::instance($cm->id);
    }

    // ── role helper ───────────────────────────────────────────────────────

    /**
     * Return the first user record (with department) for a given role archetype
     * assigned at the course context.
     *
     * @param  string        $archetype  e.g. 'editingteacher', 'manager'
     * @return \stdClass|null
     */
    protected function get_course_role_user(string $archetype): ?\stdClass
    {
        global $DB;

        $courseContext = \context_course::instance($this->course->id);
        $roleids       = $DB->get_fieldset_select('role', 'id', 'archetype = :arch', ['arch' => $archetype]);

        if (empty($roleids)) {
            return null;
        }

        list($rolesql, $roleparams) = $DB->get_in_or_equal($roleids, SQL_PARAMS_NAMED, 'rid');

        $sql = "SELECT u.id, u.firstname, u.lastname, u.department
                  FROM {user} u
                  JOIN {role_assignments} ra ON ra.userid = u.id
                 WHERE ra.contextid = :contextid
                   AND ra.roleid    $rolesql
                   AND u.deleted    = 0
                   AND u.suspended  = 0
              ORDER BY u.lastname, u.firstname
                 LIMIT 1";

        $params = array_merge(['contextid' => $courseContext->id], $roleparams);
        $user   = $DB->get_record_sql($sql, $params);

        return $user ?: null;
    }

    // ── public export methods ─────────────────────────────────────────────

    public function export_grades($templatePath = null)
    {
        require_capability('mod/assign:grade', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        $assign = new \assign($this->context, $this->cm, $this->course);
        $data   = $this->prepare_export_data($assign);

        if ($templatePath && file_exists($templatePath)) {
            $this->export_with_excel_template($data, $templatePath);
        } else {
            $this->send_excel_download($data);
        }
    }

    public function export_grades_excel($templatePath)
    {
        $this->export_grades($templatePath);
    }

    public function export_grades_docx($templatePath = null)
    {
        require_capability('mod/assign:grade', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        $assign   = new \assign($this->context, $this->cm, $this->course);
        $data     = $this->prepare_export_data($assign);
        $filename = clean_filename(
            $this->course->shortname . '_' . $this->assignment->name . '_grades.docx'
        );

        if ($templatePath && file_exists($templatePath)) {
            $this->export_with_template($data, $templatePath, $filename);
        } else {
            docx_exporter::export_table(
                array_merge([$data['headers']], $data['rows']),
                $filename
            );
        }
    }

    // ── template helpers ──────────────────────────────────────────────────

    /**
     * Build the shared variables array used by both Excel and DOCX template exports.
     */
    protected function build_variables(): array
    {
        $category = \core_course_category::get($this->course->category);
        $manager  = $this->get_course_role_user('manager');
        $teacher  = $this->get_course_role_user('editingteacher');

        return [
            'coursename'   => $this->course->fullname,
            'classname'    => $category->idnumber,
            'activityname' => $this->assignment->name,
            'exportdate'   => userdate(time(), '%d/%m/%Y'),
            'exporttime'   => userdate(time(), '%H:%M:%S'),
            'teacher_name' => $teacher ? fullname($teacher)           : '',
            'manager_name' => $manager ? fullname($manager)           : '',
            'department'   => $manager ? ($manager->department ?? '') : '',
        ];
    }

    protected function export_with_excel_template(array $data, string $templatePath): void
    {
        $filename = clean_filename(
            $this->course->shortname . '_' . $this->assignment->name . '_grades.xlsx'
        );
        excel_template_processor::export_from_template(
            $templatePath,
            $this->build_variables(),
            $data,
            $filename
        );
    }

    protected function export_with_template(array $data, string $templatePath, string $filename): void
    {
        docx_exporter::export_from_template(
            $templatePath,
            $this->build_variables(),
            $data,
            $filename
        );
    }

    // ── data preparation ──────────────────────────────────────────────────

    /**
     * Return every enrolled student as a stub with all display fields populated.
     * Mirrors the same method in quiz_export_helper.
     *
     * @return \stdClass[]  Keyed by userid
     */
    protected function get_enrolled_student_stubs(): array
    {
        global $DB;

        $courseContext  = \context_course::instance($this->course->id);
        $studentRoleIds = $DB->get_fieldset_select(
            'role', 'id', 'archetype = :arch', ['arch' => 'student']
        );

        if (empty($studentRoleIds)) {
            return [];
        }

        list($rolesql, $roleparams) = $DB->get_in_or_equal(
            $studentRoleIds, SQL_PARAMS_NAMED, 'rid'
        );

        $sql = "
            SELECT DISTINCT u.id   AS userid,
                   u.firstname,
                   u.lastname,
                   u.idnumber,
                   u.email,
                   u.institution,
                   u.department
              FROM {user} u
              JOIN {user_enrolments} ue ON ue.userid  = u.id
              JOIN {enrol}            e  ON e.id       = ue.enrolid
              JOIN {role_assignments} ra ON ra.userid  = u.id
             WHERE e.courseid      = :courseid
               AND ra.contextid   = :contextid
               AND ra.roleid      $rolesql
               AND ue.status      = 0
               AND e.status       = 0
               AND u.deleted      = 0
               AND u.suspended    = 0
          ORDER BY u.lastname, u.firstname";

        $params = array_merge(
            ['courseid' => $this->course->id, 'contextid' => $courseContext->id],
            $roleparams
        );

        $stubs = [];
        foreach ($DB->get_records_sql($sql, $params) as $row) {
            $stub              = new \stdClass();
            $stub->userid      = $row->userid;
            $stub->firstname   = $row->firstname;
            $stub->lastname    = $row->lastname;
            $stub->idnumber    = $row->idnumber  ?? '';
            $stub->email       = $row->email     ?? '';
            $stub->institution = $row->institution ?? '';
            $stub->department  = $row->department  ?? '';
            $stubs[$row->userid] = $stub;
        }

        return $stubs;
    }

    /**
     * Prepare data for export.
     *
     * Returns an array with keys:
     *   'headers'  => string[]   — column header labels
     *   'rows'     => array[]    — numeric rows for flat Excel export
     *   'rows_kv'  => array[]    — associative rows for DOCX template cloning
     *
     * @param  \assign $assign Assignment instance
     * @return array
     */
    protected function prepare_export_data(\assign $assign): array
    {
        global $DB;

        $headers = [
            'TT',
            'Họ',
            'Tên',
            'Mã số',
            'Cơ quan',
            'Đơn vị',
            'Email',
            'Trạng thái',
            'Điểm',
            'Thang điểm',
            'Tỉ lệ',
            'Thời gian nộp',
            'Thời gian chấm',
            'Người chấm',
            'Nhận xét',
        ];

        $rows    = [];
        $rows_kv = [];
        $students = $this->get_enrolled_student_stubs();

        if (empty($students)) {
            return ['headers' => $headers, 'rows' => $rows, 'rows_kv' => $rows_kv];
        }

        $rowNum = 1;
        foreach ($students as $userid => $student) {
            $submission = $assign->get_user_submission($userid, false);
            $grade      = $assign->get_user_grade($userid, false);

            $status = $this->get_submission_status($submission);

            $gradevalue = ($grade && $grade->grade >= 0) ? $grade->grade : null;
            $percentage = '';
            if ($gradevalue !== null && $this->assignment->grade > 0) {
                $percentage = round(($gradevalue / $this->assignment->grade) * 100, 2) . '%';
            }

            $gradername = '';
            if ($grade && $grade->grader > 0) {
                $grader = $DB->get_record('user', ['id' => $grade->grader], 'firstname, lastname');
                if ($grader) {
                    $gradername = fullname($grader);
                }
            }

            $feedback      = $this->get_feedback_comments($grade);
            $timesubmitted = $submission ? userdate($submission->timemodified, '%d/%m/%Y') : '-';
            $timemarked    = $grade      ? userdate($grade->timemodified,      '%d/%m/%Y') : '-';
            $gradeDisplay  = $gradevalue !== null ? round($gradevalue, 2) : '-';

            // Flat numeric row (Excel / default export)
            $rows[] = [
                $rowNum,
                $student->firstname,
                $student->lastname,
                $student->idnumber,
                $student->institution,
                $student->department,
                $student->email,
                $status,
                $gradeDisplay,
                round($this->assignment->grade, 2),
                $percentage,
                $timesubmitted,
                $timemarked,
                $gradername,
                $feedback,
            ];

            // Associative row (DOCX template cloning)
            $rows_kv[] = [
                'stt'           => $rowNum,
                'firstname'     => $student->firstname,
                'lastname'      => $student->lastname,
                'fullname'      => fullname($student),
                'idnumber'      => $student->idnumber,
                'institution'   => $student->institution,
                'department'    => $student->department,
                'email'         => $student->email,
                'status'        => $status,
                'grade'         => (string) $gradeDisplay,
                'outof'         => (string) round($this->assignment->grade, 2),
                'percentage'    => $percentage,
                'timesubmitted' => $timesubmitted,
                'timemarked'    => $timemarked,
                'grader'        => $gradername,
                'feedback'      => $feedback,
            ];

            $rowNum++;
        }

        return ['headers' => $headers, 'rows' => $rows, 'rows_kv' => $rows_kv];
    }

    // ── status / feedback helpers ─────────────────────────────────────────

    protected function get_submission_status($submission): string
    {
        if (!$submission) {
            return 'Chưa nộp';
        }
        switch ($submission->status) {
            case ASSIGN_SUBMISSION_STATUS_SUBMITTED:
                return 'Đã nộp';
            case ASSIGN_SUBMISSION_STATUS_DRAFT:
                return 'Nháp';
            case ASSIGN_SUBMISSION_STATUS_NEW:
                return 'Chưa nộp';
            case ASSIGN_SUBMISSION_STATUS_REOPENED:
                return 'Mở lại';
            default:
                return $submission->status;
        }
    }

    protected function get_feedback_comments($grade): string
    {
        global $DB;

        if (!$grade) {
            return '';
        }

        $feedback = $DB->get_record('assignfeedback_comments', [
            'assignment' => $this->assignment->id,
            'grade'      => $grade->id,
        ]);

        return $feedback ? strip_tags($feedback->commenttext) : '';
    }

    // ── Excel download ────────────────────────────────────────────────────

    protected function send_excel_download(array $data): void
    {
        $filename  = clean_filename(
            $this->course->shortname . '_' . $this->assignment->name . '_grades.xls'
        );
        $workbook  = new \MoodleExcelWorkbook('-');
        $workbook->send($filename);
        $worksheet = $workbook->add_worksheet('Grades');

        // Write header row first, then data rows
        $allRows = array_merge([$data['headers']], $data['rows']);
        $row = 0;
        foreach ($allRows as $rowdata) {
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
