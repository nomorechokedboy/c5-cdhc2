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

    // ── public export methods (unchanged signatures) ──────────────────────

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

    // ── core: one row per student ─────────────────────────────────────────

    /**
     * Return exactly one attempt record per enrolled student, chosen
     * according to $this->quiz->grademethod:
     *
     *   QUIZ_GRADEHIGHEST (1) — attempt with the highest rescaled grade
     *   QUIZ_GRADEAVERAGE  (2) — virtual row whose grade is the average
     *   QUIZ_ATTEMPTFIRST  (3) — chronologically first *finished* attempt
     *   QUIZ_ATTEMPTLAST   (4) — chronologically last  *finished* attempt
     *
     * Students who have never attempted are included with null grades so
     * the roster is always complete.
     *
     * @return array  Keyed by userid; each value is a \stdClass attempt row
     *                augmented with a `computed_grade` float|null field.
     */
    protected function get_best_attempt_per_student(): array
    {
        global $DB;

        // ── 1. All finished attempts for this quiz ────────────────────────
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

        // ── 2. Group by userid ────────────────────────────────────────────
        $byUser = [];   // userid => attempt[]
        foreach ($allAttempts as $attempt) {
            $byUser[$attempt->userid][] = $attempt;
        }

        // ── 3. Also collect every enrolled student (roster completeness) ──
        $enrolled = $this->get_enrolled_student_stubs();

        // ── 4. Pick / synthesise the representative attempt ───────────────
        $result = [];

        foreach ($enrolled as $userid => $stub) {
            $attempts = $byUser[$userid] ?? [];

            if (empty($attempts)) {
                // Student has never attempted — include a blank row.
                $stub->computed_grade = null;
                $result[$userid]      = $stub;
                continue;
            }

            $grademethod = (int) ($this->quiz->grademethod ?? QUIZ_GRADEHIGHEST);

            switch ($grademethod) {

                case QUIZ_ATTEMPTFIRST:
                    // Already sorted ASC by attempt number above.
                    $best = $attempts[0];
                    $best->computed_grade = $this->rescale($best->sumgrades);
                    break;

                case QUIZ_ATTEMPTLAST:
                    $best = end($attempts);
                    $best->computed_grade = $this->rescale($best->sumgrades);
                    break;

                case QUIZ_GRADEAVERAGE:
                    // Synthesise a virtual row from the last attempt but
                    // override the grade with the true average.
                    $best = end($attempts);
                    $grades = array_map(
                        fn($a) => $this->rescale($a->sumgrades),
                        $attempts
                    );
                    $validGrades = array_filter(
                        $grades,
                        fn($g) => $g !== null
                    );
                    $best->computed_grade = $validGrades
                        ? array_sum($validGrades) / count($validGrades)
                        : null;
                    break;

                case QUIZ_GRADEHIGHEST:
                default:
                    // Pick the attempt whose rescaled grade is highest.
                    // On a tie, prefer the later attempt (more recent).
                    $best      = null;
                    $bestGrade = PHP_INT_MIN;

                    foreach ($attempts as $attempt) {
                        $g = $this->rescale($attempt->sumgrades);
                        if ($g !== null && $g >= $bestGrade) {
                            $bestGrade = $g;
                            $best      = $attempt;
                        }
                    }

                    // Safety: if no attempt had a numeric grade, use the last.
                    if ($best === null) {
                        $best = end($attempts);
                    }
                    $best->computed_grade = $this->rescale($best->sumgrades);
                    break;
            }

            $result[$userid] = $best;
        }

        return $result;
    }

    /**
     * Rescale raw sumgrades to the quiz's configured grade scale.
     * Returns null if sumgrades is null or quiz.grade is 0.
     */
    protected function rescale(?float $sumgrades): ?float
    {
        if ($sumgrades === null || (float) $this->quiz->grade === 0.0) {
            return null;
        }
        return quiz_rescale_grade($sumgrades, $this->quiz, false);
    }

    /**
     * Return a lightweight stub for every student currently enrolled,
     * so the export roster matches the gradebook even for non-attempters.
     *
     * @return \stdClass[]  Keyed by userid
     */
    protected function get_enrolled_student_stubs(): array
    {
        global $DB;

        $context        = $this->context;
        $courseContext  = \context_course::instance($this->course->id);
        $studentRoleIds = $DB->get_fieldset_select(
            'role',
            'id',
            'archetype = :arch',
            ['arch' => 'student']
        );

        if (empty($studentRoleIds)) {
            return [];
        }

        list($rolesql, $roleparams) = $DB->get_in_or_equal(
            $studentRoleIds,
            SQL_PARAMS_NAMED,
            'rid'
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
            // Minimal fields needed so a "no attempt" row renders cleanly.
            $stub              = new \stdClass();
            $stub->userid      = $row->userid;
            $stub->firstname   = $row->firstname;
            $stub->lastname    = $row->lastname;
            $stub->idnumber    = $row->idnumber;
            $stub->email       = $row->email;
            $stub->institution = $row->institution ?? '';
            $stub->department  = $row->department  ?? '';
            // Attempt-specific fields default to "no attempt" values.
            $stub->attempt     = null;
            $stub->state       = null;
            $stub->sumgrades   = null;
            $stub->timestart   = 0;
            $stub->timefinish  = 0;
            $stubs[$row->userid] = $stub;
        }

        return $stubs;
    }

    // ── data preparation (one row per student) ────────────────────────────

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

        $bestAttempts = $this->get_best_attempt_per_student();

        $rows    = [];
        $rows_kv = [];
        $rowNum  = 1;

        // Count how many finished attempts each student has (for "Số lần thi").
        $attemptCounts = $this->count_attempts_per_student();

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
            $stateLabel   = $attempt->state ? $this->get_state_display($attempt->state) : '-';

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

    // ── template / streaming helpers (unchanged) ──────────────────────────

    protected function export_with_excel_template(array $data, string $templatePath): void
    {
        $category = \core_course_category::get($this->course->category);
        $variables = [
            'coursename'   => $this->course->fullname,
            'classname'    => $category->idnumber,
            'activityname' => $this->quiz->name,
            'exportdate'   => userdate(time(), '%d/%m/%Y'),
            'exporttime'   => userdate(time(), '%H:%M:%S'),
        ];
        $filename = clean_filename(
            $this->course->shortname . '_' . $this->quiz->name . '_grades.xlsx'
        );
        excel_template_processor::export_from_template(
            $templatePath,
            $variables,
            $data,
            $filename
        );
    }

    protected function export_with_template(
        array  $data,
        string $templatePath,
        string $filename
    ): void {
        $category = \core_course_category::get($this->course->category);
        $variables = [
            'coursename'   => $this->course->fullname,
            'classname'    => $category->idnumber,
            'activityname' => $this->quiz->name,
            'exportdate'   => userdate(time(), '%d/%m/%Y'),
            'exporttime'   => userdate(time(), '%H:%M:%S'),
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
