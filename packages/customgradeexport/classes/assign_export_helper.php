<?php

/**
 * Assignment export helper class - Enhanced with DOCX and template support
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/excellib.class.php');
require_once($CFG->dirroot . '/mod/assign/locallib.php');

/**
 * Helper class for exporting assignment grades
 */
class assign_export_helper
{

    /** @var stdClass Assignment instance */
    protected $assignment;

    /** @var stdClass Course module */
    protected $cm;

    /** @var stdClass Course */
    protected $course;

    /** @var context_module Context */
    protected $context;

    /**
     * Constructor
     *
     * @param stdClass $assignment Assignment instance
     * @param stdClass $cm Course module
     * @param stdClass $course Course
     */
    public function __construct($assignment, $cm, $course)
    {
        $this->assignment = $assignment;
        $this->cm = $cm;
        $this->course = $course;
        $this->context = \context_module::instance($cm->id);
    }

    /**
     * Export assignment grades to Excel
     *
     * @param string|null $templatePath Optional path to template file
     */
    public function export_grades($templatePath = null)
    {
        global $CFG;

        require_capability('mod/assign:grade', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        // Get assignment instance
        $assign = new \assign($this->context, $this->cm, $this->course);

        // Get submissions and grades
        $data = $this->prepare_export_data($assign);

        if ($templatePath && file_exists($templatePath)) {
            // Export with template
            $this->export_with_excel_template($data, $templatePath);
        } else {
            // Send standard download
            $this->send_excel_download($data);
        }
    }

    /**
     * Export assignment grades to Excel with template
     *
     * @param string $templatePath Path to template file
     */
    public function export_grades_excel($templatePath)
    {
        $this->export_grades($templatePath);
    }

    /**
     * Export assignment grades to DOCX
     *
     * @param string|null $templatePath Optional path to template file
     */
    public function export_grades_docx($templatePath = null)
    {
        global $CFG;

        require_capability('mod/assign:grade', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        // Get assignment instance
        $assign = new \assign($this->context, $this->cm, $this->course);

        // Get submissions and grades
        $data = $this->prepare_export_data($assign);

        $filename = clean_filename($this->course->shortname . '_' .
            $this->assignment->name . '_grades.docx');

        if ($templatePath && file_exists($templatePath)) {
            // Use provided template
            $this->export_with_template($data, $templatePath, $filename);
        } else {
            // Use default table format
            docx_exporter::export_table($data, $filename);
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
            'activityname' => $this->assignment->name,
            'exportdate' => userdate(time(), '%d/%m/%Y'),
            'exporttime' => userdate(time(), '%H:%M:%S'),
        ];

        $filename = clean_filename($this->course->shortname . '_' .
            $this->assignment->name . '_grades.xlsx');

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
            'activityname' => $this->assignment->name,
            'exportdate' => date('Y-m-d'),
            'exporttime' => date('H:i:s'),
        ];

        // Export
        docx_exporter::export_from_template($templatePath, $variables, $data, $filename);
    }

    /**
     * Prepare data for export
     *
     * @param assign $assign Assignment instance
     * @return array 2D array of export data
     */
    protected function prepare_export_data($assign)
    {
        global $DB;

        // Headers
        $headers = [
            'First name',
            'Last name',
            'ID number',
            'Institution',
            'Department',
            'Email',
            'Status',
            'Grade',
            'Out of',
            'Percentage',
            'Time submitted',
            'Time marked',
            'Grader',
            'Feedback comments',
        ];

        $data = [];
        $data[] = $headers;

        // Get all participants with their org data
        $participants = $assign->list_participants(null, true);

        if (empty($participants)) {
            return $data; // Return just headers if no participants
        }

        // Get user org data in bulk for efficiency
        $userids = array_keys($participants);
        list($insql, $params) = $DB->get_in_or_equal($userids);
        $userorgdata = $DB->get_records_select('user', "id $insql", $params, '', 'id, institution, department');

        foreach ($participants as $user) {
            // Get submission
            $submission = $assign->get_user_submission($user->id, false);

            // Get grade
            $grade = $assign->get_user_grade($user->id, false);

            // Get org data
            $orgdata = isset($userorgdata[$user->id]) ? $userorgdata[$user->id] : null;
            $institution = $orgdata && !empty($orgdata->institution) ? $orgdata->institution : '';
            $department = $orgdata && !empty($orgdata->department) ? $orgdata->department : '';

            // Get status
            $status = $this->get_submission_status($submission);

            // Calculate percentage
            $gradevalue = $grade ? $grade->grade : null;
            $percentage = '';
            if ($gradevalue !== null && $this->assignment->grade > 0) {
                $percentage = round(($gradevalue / $this->assignment->grade) * 100, 2) . '%';
            }

            // Get grader name
            $gradername = '';
            if ($grade && $grade->grader > 0) {
                $grader = $DB->get_record('user', ['id' => $grade->grader], 'firstname, lastname');
                if ($grader) {
                    $gradername = fullname($grader);
                }
            }

            // Get feedback comments
            $feedback = $this->get_feedback_comments($grade);

            $row = [
                $user->firstname,
                $user->lastname,
                $user->idnumber ?: '',
                $institution,
                $department,
                $user->email,
                $status,
                $gradevalue !== null ? round($gradevalue, 2) : '-',
                round($this->assignment->grade, 2),
                $percentage,
                $submission ? userdate($submission->timemodified) : '-',
                $grade ? userdate($grade->timemodified) : '-',
                $gradername,
                $feedback,
            ];

            $data[] = $row;
        }

        return $data;
    }

    /**
     * Get submission status
     *
     * @param stdClass|null $submission Submission record
     * @return string Status string
     */
    protected function get_submission_status($submission)
    {
        if (!$submission) {
            return 'No submission';
        }

        switch ($submission->status) {
            case ASSIGN_SUBMISSION_STATUS_SUBMITTED:
                return 'Submitted';
            case ASSIGN_SUBMISSION_STATUS_DRAFT:
                return 'Draft';
            case ASSIGN_SUBMISSION_STATUS_NEW:
                return 'No submission';
            case ASSIGN_SUBMISSION_STATUS_REOPENED:
                return 'Reopened';
            default:
                return $submission->status;
        }
    }

    /**
     * Get feedback comments
     *
     * @param stdClass|null $grade Grade record
     * @return string Feedback text
     */
    protected function get_feedback_comments($grade)
    {
        global $DB;

        if (!$grade) {
            return '';
        }

        $feedback = $DB->get_record('assignfeedback_comments', [
            'assignment' => $this->assignment->id,
            'grade' => $grade->id
        ]);

        if ($feedback) {
            return strip_tags($feedback->commenttext);
        }

        return '';
    }

    /**
     * Send Excel file download
     *
     * @param array $data 2D array of export data
     */
    protected function send_excel_download($data)
    {
        $filename = clean_filename($this->course->shortname . '_' .
            $this->assignment->name . '_grades.xls');

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
