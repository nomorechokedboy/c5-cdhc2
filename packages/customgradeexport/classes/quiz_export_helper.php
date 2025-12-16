<?php

/**
 * Quiz export helper class - Enhanced with DOCX and template support
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/excellib.class.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

/**
 * Helper class for exporting quiz grades
 */
class quiz_export_helper
{

    /** @var stdClass Quiz instance */
    protected $quiz;

    /** @var stdClass Course module */
    protected $cm;

    /** @var stdClass Course */
    protected $course;

    /** @var context_module Context */
    protected $context;

    /**
     * Constructor
     *
     * @param stdClass $quiz Quiz instance
     * @param stdClass $cm Course module
     * @param stdClass $course Course
     */
    public function __construct($quiz, $cm, $course)
    {
        $this->quiz = $quiz;
        $this->cm = $cm;
        $this->course = $course;
        $this->context = \context_module::instance($cm->id);
    }

    /**
     * Export quiz grades to Excel
     *
     * @param string|null $templatePath Optional path to template file
     */
    public function export_grades($templatePath = null)
    {
        global $CFG;

        require_capability('mod/quiz:viewreports', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        // Get quiz attempts
        $attempts = $this->get_quiz_attempts();

        // Prepare export data
        $exportdata = $this->prepare_export_data($attempts);

        if ($templatePath && file_exists($templatePath)) {
            // Export with template
            $this->export_with_excel_template($exportdata, $templatePath);
        } else {
            // Send standard download
            $this->send_excel_download($exportdata);
        }
    }

    /**
     * Export quiz grades to Excel with template
     *
     * @param string $templatePath Path to template file
     */
    public function export_grades_excel($templatePath)
    {
        $this->export_grades($templatePath);
    }

    /**
     * Export quiz grades to DOCX
     *
     * @param string|null $templatePath Optional path to template file
     */
    public function export_grades_docx($templatePath = null)
    {
        global $CFG;

        require_capability('mod/quiz:viewreports', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        // Get quiz attempts
        $attempts = $this->get_quiz_attempts();

        // Prepare export data
        $exportdata = $this->prepare_export_data($attempts);

        $filename = clean_filename($this->course->shortname . '_' .
            $this->quiz->name . '_grades.docx');

        if ($templatePath && file_exists($templatePath)) {
            // Use provided template
            $this->export_with_template($exportdata, $templatePath, $filename);
        } else {
            // Use default table format
            docx_exporter::export_table($exportdata, $filename);
        }
    }

    /**
     * Export using Excel template
     *
     * @param array $data Export data
     * @param string $templatePath Template file path
     */
    protected function export_with_excel_template($data, $templatePath)
    {
        // Prepare variables for template
        $variables = [
            'coursename' => $this->course->fullname,
            'activityname' => $this->quiz->name,
            'exportdate' => userdate(time(), '%d/%m/%Y'),
            'exporttime' => userdate(time(), '%H:%M:%S'),
        ];

        $filename = clean_filename($this->course->shortname . '_' .
            $this->quiz->name . '_grades.xlsx');

        // Use Excel template processor
        excel_template_processor::export_from_template($templatePath, $variables, $data, $filename);
    }

    /**
     * Export using DOCX template
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
            'activityname' => $this->quiz->name,
            'exportdate' => date('Y-m-d'),
            'exporttime' => date('H:i:s'),
        ];

        // Export
        docx_exporter::export_from_template($templatePath, $variables, $data, $filename);
    }

    /**
     * Get all quiz attempts for export with user data
     *
     * @return array Array of attempt records
     */
    protected function get_quiz_attempts()
    {
        global $DB;

        // Get all attempts with user information in one query
        $sql = "SELECT qa.*, 
                       u.id as userid, u.firstname, u.lastname, 
                       u.idnumber, u.email, u.institution, u.department,
                       qa.sumgrades, qa.timestart, qa.timefinish, qa.state
                FROM {quiz_attempts} qa
                JOIN {user} u ON u.id = qa.userid
                WHERE qa.quiz = :quizid 
                  AND qa.preview = 0
                ORDER BY u.lastname, u.firstname, qa.attempt";

        return $DB->get_records_sql($sql, ['quizid' => $this->quiz->id]);
    }

    /**
     * Prepare data for export
     *
     * @param array $attempts Array of quiz attempts
     * @return array 2D array of export data
     */
    protected function prepare_export_data($attempts)
    {
        // Headers
        $headers = [
            'First name',
            'Last name',
            'ID number',
            'Institution',
            'Department',
            'Email',
            'Attempt',
            'Status',
            'Grade',
            'Out of',
            'Percentage',
            'Time started',
            'Time finished',
            'Time taken',
        ];

        $data = [];
        $data[] = $headers;

        // Process each attempt
        foreach ($attempts as $attempt) {
            // Calculate grade
            $finalgrade = quiz_rescale_grade($attempt->sumgrades, $this->quiz, false);
            $percentage = ($this->quiz->grade > 0) ?
                round(($finalgrade / $this->quiz->grade) * 100, 2) : 0;

            // Calculate time taken
            $timetaken = '';
            if ($attempt->timefinish > 0 && $attempt->timestart > 0) {
                $duration = $attempt->timefinish - $attempt->timestart;
                $timetaken = format_time($duration);
            }

            // Get state display
            $statedisplay = $this->get_state_display($attempt->state);

            $row = [
                $attempt->firstname,
                $attempt->lastname,
                $attempt->idnumber ?: '',
                $attempt->institution ?: '',
                $attempt->department ?: '',
                $attempt->email,
                $attempt->attempt,
                $statedisplay,
                $finalgrade !== null ? round($finalgrade, 2) : '-',
                round($this->quiz->grade, 2),
                $percentage . '%',
                $attempt->timestart > 0 ? userdate($attempt->timestart) : '-',
                $attempt->timefinish > 0 ? userdate($attempt->timefinish) : '-',
                $timetaken,
            ];

            $data[] = $row;
        }

        return $data;
    }

    /**
     * Get display text for attempt state
     *
     * @param string $state State code
     * @return string Display text
     */
    protected function get_state_display($state)
    {
        $states = [
            'inprogress' => 'In progress',
            'overdue' => 'Overdue',
            'finished' => 'Finished',
            'abandoned' => 'Never submitted',
        ];

        return isset($states[$state]) ? $states[$state] : $state;
    }

    /**
     * Send Excel file download
     *
     * @param array $data 2D array of export data
     */
    protected function send_excel_download($data)
    {
        $filename = clean_filename($this->course->shortname . '_' .
            $this->quiz->name . '_grades.xls');

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
