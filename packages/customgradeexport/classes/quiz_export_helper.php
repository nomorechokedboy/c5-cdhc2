<?php

/**
 * Quiz export helper class
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/gradelib.php');
require_once($CFG->libdir . '/excellib.class.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

// Moodle grade-method constants (defined in mod/quiz/lib.php).
// Redeclare here so this file is self-contained when the constants
// haven't been loaded yet (e.g. during CLI / cron contexts).
if (!defined('QUIZ_GRADEHIGHEST')) {
    define('QUIZ_GRADEHIGHEST', 1);
    define('QUIZ_GRADEAVERAGE',  2);
    define('QUIZ_ATTEMPTFIRST',  3);
    define('QUIZ_ATTEMPTLAST',   4);
}

class quiz_export_helper
{

    /** @var \stdClass Quiz record */
    protected $quiz;

    /** @var \stdClass Course-module record */
    protected $cm;

    /** @var \stdClass Course record */
    protected $course;

    /** @var \context_module Context */
    protected $context;

    public function __construct($quiz, $cm, $course)
    {
        $this->quiz    = $quiz;
        $this->cm      = $cm;
        $this->course  = $course;
        $this->context = \context_module::instance($cm->id);
    }

    // ── public export methods ─────────────────────────────────────────────

    public function export_grades($templatePath = null): void
    {
        require_capability('mod/quiz:viewreports', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        $exportdata = $this->prepare_export_data();

        if ($templatePath && file_exists($templatePath)) {
            $this->export_with_excel_template($exportdata, $templatePath);
        } else {
            $this->send_excel_download(
                array_merge([$exportdata['headers']], $exportdata['rows'])
            );
        }
    }

    public function export_grades_excel($templatePath): void
    {
        $this->export_grades($templatePath);
    }

    public function export_grades_docx($templatePath = null): void
    {
        require_capability('mod/quiz:viewreports', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        $exportdata = $this->prepare_export_data();
        $filename   = clean_filename(
            $this->course->shortname . '_' . $this->quiz->name . '_grades.docx'
        );

        if ($templatePath && file_exists($templatePath)) {
            $this->export_with_template($exportdata, $templatePath, $filename);
        } else {
            docx_exporter::export_table($exportdata, $filename);
        }
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

        $roleids = $DB->get_fieldset_select('role', 'id', 'archetype = :arch', ['arch' => $archetype]);

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

    // ── core: one row per student ─────────────────────────────────────────

      /**
     * Return exactly one attempt record per enrolled student, for display
     * purposes only (timestart/timefinish/attempt count/state).
     *
     * The grade itself is NEVER computed here — it always comes from
     * {grade_grades} via get_final_grades_by_user(), so it's guaranteed
     * to match the Gradebook (and therefore course_export_helper)
     * regardless of grademethod, manual overrides, or regrades.
     *
     * @return array  Keyed by userid
     */
    protected function get_best_attempt_per_student(): array
    {
        global $DB;

        $sql = "
            SELECT qa.*,
                   u.id        AS userid,
                   u.firstname,
                   u.lastname,
                   u.idnumber,
                   u.email,
                   u.institution,
                   u.department
              FROM {quiz_attempts} qa
              JOIN {user} u ON u.id = qa.userid
             WHERE qa.quiz    = :quizid
               AND qa.preview = 0
               AND qa.state   = 'finished'
          ORDER BY u.lastname, u.firstname, qa.attempt ASC";

        $allAttempts = $DB->get_records_sql($sql, ['quizid' => $this->quiz->id]);

        $byUser = [];
        foreach ($allAttempts as $attempt) {
            $byUser[$attempt->userid][] = $attempt;
        }

        $enrolled    = $this->get_enrolled_student_stubs();
        $finalGrades = $this->get_final_grades_by_user();
        $result      = [];
        $grademethod = (int) ($this->quiz->grademethod ?? QUIZ_GRADEHIGHEST);

        foreach ($enrolled as $userid => $stub) {
            $attempts = $byUser[$userid] ?? [];

            if (empty($attempts)) {
                $rep = $stub;
            } else {
                $rep = match ($grademethod) {
                    QUIZ_ATTEMPTFIRST => $attempts[0],
                    QUIZ_ATTEMPTLAST, QUIZ_GRADEAVERAGE => end($attempts),
                    default => $this->pick_attempt_with_highest_sumgrades($attempts),
                };
            }

            // Grade always comes from the gradebook — never recomputed here.
            $rep->computed_grade = $finalGrades[$userid] ?? null;

            $result[$userid] = $rep;
        }

        return $result;
    }

    /**
     * Pick the attempt with the highest raw sumgrades, for display-metadata
     * purposes when grademethod is QUIZ_GRADEHIGHEST. On a tie, prefers the
     * later attempt. This does NOT determine the exported grade value.
     */
    protected function pick_attempt_with_highest_sumgrades(array $attempts)
    {
        $best = $attempts[0];
        foreach ($attempts as $a) {
            if (
                $a->sumgrades !== null
                && ($best->sumgrades === null || $a->sumgrades >= $best->sumgrades)
            ) {
                $best = $a;
            }
        }
        return $best;
    }

    /**
     * Fetch the grade_item row for this quiz activity.
     */
    protected function get_quiz_grade_item(): ?\grade_item
    {
        return \grade_item::fetch([
            'itemtype'     => 'mod',
            'itemmodule'   => 'quiz',
            'iteminstance' => $this->quiz->id,
            'courseid'     => $this->course->id,
        ]) ?: null;
    }

    /**
     * Authoritative final grades from the Gradebook, keyed by userid.
     * Mirrors course_export_helper::get_student_grades() so both exports
     * are guaranteed to agree, regardless of grademethod, overrides, or
     * regrades.
     *
     * @return float[] userid => finalgrade (already on the quiz's grade scale)
     */
    protected function get_final_grades_by_user(): array
    {
        global $DB;

        $item = $this->get_quiz_grade_item();
        if (!$item) {
            return [];
        }

        $records = $DB->get_records('grade_grades', ['itemid' => $item->id], '', 'userid, finalgrade');

        $out = [];
        foreach ($records as $r) {
            if ($r->finalgrade !== null) {
                $out[(int) $r->userid] = (float) $r->finalgrade;
            }
        }
        return $out;
    }

    /**
     * Return a lightweight stub for every enrolled student.
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
            $stub->idnumber    = $row->idnumber;
            $stub->email       = $row->email;
            $stub->institution = $row->institution ?? '';
            $stub->department  = $row->department  ?? '';
            $stub->attempt     = null;
            $stub->state       = null;
            $stub->sumgrades   = null;
            $stub->timestart   = 0;
            $stub->timefinish  = 0;
            $stubs[$row->userid] = $stub;
        }

        return $stubs;
    }

    // ── data preparation ──────────────────────────────────────────────────

    protected function prepare_export_data(): array
    {
        $headers = [
            'TT',
            'Họ',
            'Tên',
            'Mã số',
            'Cơ quan',
            'Đơn vị',
            'Email',
            'Số lần thi',
            'Điểm',
            'Thang điểm',
            'Tỉ lệ',
            'Thời gian bắt đầu',
            'Thời gian kết thúc',
            'Thời gian làm bài',
        ];

        $bestAttempts  = $this->get_best_attempt_per_student();
        $attemptCounts = $this->count_attempts_per_student();

        $rows    = [];
        $rows_kv = [];
        $rowNum  = 1;

        foreach ($bestAttempts as $userid => $attempt) {
            $grade      = $attempt->computed_grade ?? null;
            $percentage = '';
            if ($grade !== null && (float) $this->quiz->grade > 0) {
                $percentage = round(($grade / $this->quiz->grade) * 100, 2) . '%';
            }

            $timetaken = '';
            if (!empty($attempt->timefinish) && !empty($attempt->timestart)) {
                $timetaken = format_time($attempt->timefinish - $attempt->timestart);
            }

            $attemptCount = $attemptCounts[$userid] ?? 0;

            $row = [
                $rowNum,
                $attempt->lastname,
                $attempt->firstname,
                $attempt->idnumber ?: '',
                $attempt->institution ?: '',
                $attempt->department  ?: '',
                $attempt->email,
                $attemptCount ?: '-',
                $grade !== null ? round($grade, 1) : '-',
                round($this->quiz->grade, 1),
                $percentage ?: '-',
                !empty($attempt->timestart)  ? userdate($attempt->timestart,  '%d/%m/%Y %H:%M') : '-',
                !empty($attempt->timefinish) ? userdate($attempt->timefinish, '%d/%m/%Y %H:%M') : '-',
                $timetaken ?: '-',
            ];

            $row_kv = [
                'stt'         => $rowNum,
                'lastname'    => $attempt->lastname,
                'firstname'   => $attempt->firstname,
                'idnumber'    => $attempt->idnumber ?: '',
                'institution' => $attempt->institution ?: '',
                'department'  => $attempt->department  ?: '',
                'email'       => $attempt->email,
                'attempts'    => $attemptCount ?: '-',
                'grade'       => $grade !== null ? round($grade, 1) : '-',
                'outof'       => round($this->quiz->grade, 1),
                'percentage'  => $percentage ?: '-',
                'timestart'   => !empty($attempt->timestart)  ? userdate($attempt->timestart,  '%d/%m/%Y %H:%M') : '-',
                'timefinish'  => !empty($attempt->timefinish) ? userdate($attempt->timefinish, '%d/%m/%Y %H:%M') : '-',
                'timetaken'   => $timetaken ?: '-',
            ];

            $rows[]    = $row;
            $rows_kv[] = $row_kv;
            $rowNum++;
        }

        return [
            'headers' => $headers,
            'rows'    => $rows,
            'rows_kv' => $rows_kv,
        ];
    }

    /**
     * Count finished attempts per userid for this quiz.
     *
     * @return int[]  keyed by userid
     */
    protected function count_attempts_per_student(): array
    {
        global $DB;

        $sql = "
            SELECT userid, COUNT(*) AS cnt
              FROM {quiz_attempts}
             WHERE quiz    = :quizid
               AND preview = 0
               AND state   = 'finished'
          GROUP BY userid";

        $counts = [];
        foreach ($DB->get_records_sql($sql, ['quizid' => $this->quiz->id]) as $row) {
            $counts[(int) $row->userid] = (int) $row->cnt;
        }
        return $counts;
    }

    // ── template / streaming helpers ──────────────────────────────────────

    protected function export_with_excel_template(array $data, string $templatePath): void
    {
        $category = \core_course_category::get($this->course->category);
        $manager  = $this->get_course_role_user('manager');
        $teacher  = $this->get_course_role_user('editingteacher');

        $variables = [
            'coursename'   => $this->course->fullname,
            'classname'    => $category->idnumber,
            'activityname' => $this->quiz->name,
            'exportdate'   => userdate(time(), '%d/%m/%Y'),
            'exporttime'   => userdate(time(), '%H:%M:%S'),
            'teacher_name' => $teacher ? fullname($teacher)          : '',
            'manager_name' => $manager ? fullname($manager)          : '',
            'department'   => $manager ? ($manager->department ?? '') : '',
        ];

        $filename = clean_filename(
            $this->course->shortname . '_' . $this->quiz->name . '_grades.xlsx'
        );
        excel_template_processor::export_from_template(
            $templatePath, $variables, $data, $filename
        );
    }

    protected function export_with_template(
        array  $data,
        string $templatePath,
        string $filename
    ): void {
        $category = \core_course_category::get($this->course->category);
        $manager  = $this->get_course_role_user('manager');
        $teacher  = $this->get_course_role_user('editingteacher');

        $variables = [
            'coursename'   => $this->course->fullname,
            'classname'    => $category->idnumber,
            'activityname' => $this->quiz->name,
            'exportdate'   => userdate(time(), '%d/%m/%Y'),
            'exporttime'   => userdate(time(), '%H:%M:%S'),
            'teacher_name' => $teacher ? fullname($teacher)          : '',
            'manager_name' => $manager ? fullname($manager)          : '',
            'department'   => $manager ? ($manager->department ?? '') : '',
        ];

        docx_exporter::export_from_template($templatePath, $variables, $data, $filename);
    }

    protected function get_state_display(string $state): string
    {
        $map = [
            'inprogress' => 'Đang làm',
            'overdue'    => 'Quá hạn',
            'finished'   => 'Hoàn thành',
            'abandoned'  => 'Chưa nộp',
        ];
        return $map[$state] ?? $state;
    }

    protected function send_excel_download(array $data): void
    {
        $filename  = clean_filename(
            $this->course->shortname . '_' . $this->quiz->name . '_grades.xls'
        );
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

