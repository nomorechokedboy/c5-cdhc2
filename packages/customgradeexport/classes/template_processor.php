<?php

/**
 * Template Processor class (backward compatibility and documentation)
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

/**
 * Helper class for managing export templates (legacy support)
 * This class is kept for backward compatibility and documentation
 */
class template_processor
{
    /**
     * Get template file path (legacy method)
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @return string|null Path to template or null if not found
     */
    public static function get_template_path($type)
    {
        // Use new template manager to get first available template
        $templates = template_manager::get_templates($type);
        if (empty($templates)) {
            return null;
        }
        // Return first template
        $firstTemplate = reset($templates);
        return $firstTemplate['path'];
    }

    /**
     * Check if template exists
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @return bool
     */
    public static function has_template($type)
    {
        return self::get_template_path($type) !== null;
    }

    /**
     * Get template variables for documentation
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @return array Array of available variables with descriptions
     */
    public static function get_available_variables($type)
    {
        $common = [
            'coursename' => 'Course name',
            'exportdate' => 'Export date',
            'exporttime' => 'Export time',
        ];

        if ($type === 'course') {
            return array_merge($common, [
                'courseshortname' => 'Course short name',
                // Table row variables
                'stt' => 'Row number (required for table row cloning)',
                'fullname' => 'Student full name',
                'fistname' => 'Student firstname',
                'lastname' => 'Student lastname',
                'idnumber' => 'Student ID number',
                // Grade columns (dynamic based on course)
                '15p_01' => '15-minute test score 1',
                '15p_02' => '15-minute test score 2',
                '15p_03' => '15-minute test score 3',
                '1t_01' => 'Midterm test score 1',
                '1t_02' => 'Midterm test score 2',
                '1t_03' => 'Midterm test score 3',
                'thi_01' => 'Final exam score 1',
                'thi_02' => 'Final exam score 2',
                'tkmh' => 'Course final grade (calculated)',
                'xep_loai' => 'Grade classification (XS/G/Khá/TB/Yếu)',
                'ghi_chu' => 'Notes',
            ]);
        } else if ($type === 'quiz') {
            return array_merge($common, [
                'stt' => 'Row number (required for table row cloning)',
                'activityname' => 'Quiz/Activity name',
                // Table row variables
                'firstname' => 'Student first name',
                'lastname' => 'Student last name',
                'idnumber' => 'Student ID number',
                'institution' => 'Institution',
                'department' => 'Department',
                'email' => 'Email address',
                'attempt' => 'Attempt number',
                'status' => 'Attempt status',
                'grade' => 'Grade received',
                'outof' => 'Maximum grade',
                'percentage' => 'Percentage score',
                'timestarted' => 'Time started',
                'timefinished' => 'Time finished',
                'timetaken' => 'Time taken',
            ]);
        } else if ($type === 'assign') {
            return array_merge($common, [
                'stt' => 'Row number (required for table row cloning)',
                'activityname' => 'Assignment name',
                // Table row variables
                'firstname' => 'Student first name',
                'lastname' => 'Student last name',
                'idnumber' => 'Student ID number',
                'institution' => 'Institution',
                'department' => 'Department',
                'email' => 'Email address',
                'status' => 'Submission status',
                'grade' => 'Grade received',
                'outof' => 'Maximum grade',
                'percentage' => 'Percentage score',
                'timesubmitted' => 'Time submitted',
                'timemarked' => 'Time graded',
                'grader' => 'Grader name',
                'feedback' => 'Feedback comments',
            ]);
        }

        return $common;
    }

    /**
     * Get template instructions for a specific type
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @return string HTML formatted instructions
     */
    public static function get_template_instructions($type)
    {
        $variables = self::get_available_variables($type);

        $html = '<div class="template-instructions">';
        $html .= '<h5>Available Template Variables</h5>';
        $html .= '<p>Use these variables in your template file. They will be replaced with actual data during export.</p>';

        // Header variables
        $html .= '<h6>Document Header Variables</h6>';
        $html .= '<table class="table table-sm table-bordered">';
        $html .= '<thead><tr><th>Variable</th><th>Description</th></tr></thead>';
        $html .= '<tbody>';

        $headerVars = ['coursename', 'courseshortname', 'activityname', 'exportdate', 'exporttime'];
        foreach ($headerVars as $var) {
            if (isset($variables[$var])) {
                $html .= '<tr>';
                $html .= '<td><code>${' . $var . '}</code></td>';
                $html .= '<td>' . $variables[$var] . '</td>';
                $html .= '</tr>';
            }
        }
        $html .= '</tbody></table>';

        // Table row variables
        $html .= '<h6>Table Row Variables</h6>';
        $html .= '<p><strong>Important:</strong> For table data to work, your template must include a table with placeholders in the second row.</p>';

        if ($type === 'course') {
            $html .= '<p><strong>Required:</strong> The first column MUST contain <code>${stt}</code> to enable row cloning.</p>';
        } else {
            $html .= '<p><strong>Required:</strong> The first column MUST contain <code>${firstname}</code> to enable row cloning.</p>';
        }

        $html .= '<table class="table table-sm table-bordered">';
        $html .= '<thead><tr><th>Variable</th><th>Description</th></tr></thead>';
        $html .= '<tbody>';

        foreach ($variables as $var => $desc) {
            if (!in_array($var, $headerVars)) {
                $html .= '<tr>';
                $html .= '<td><code>${' . $var . '}</code></td>';
                $html .= '<td>' . $desc . '</td>';
                $html .= '</tr>';
            }
        }
        $html .= '</tbody></table>';

        // Special notes for course templates
        if ($type === 'course') {
            $html .= '<div class="alert alert-info">';
            $html .= '<h6>Dynamic Columns</h6>';
            $html .= '<p>Course grade templates have dynamic columns:</p>';
            $html .= '<ul>';
            $html .= '<li><strong>15P columns:</strong> Minimum 3, up to 15P-01 through 15P-NN (based on course activities)</li>';
            $html .= '<li><strong>1T columns:</strong> Minimum 3, up to 1T-01 through 1T-NN (based on course activities)</li>';
            $html .= '<li><strong>Thi columns:</strong> Always 2 (Thi-01, Thi-02)</li>';
            $html .= '</ul>';
            $html .= '<p>Include placeholders for the columns you need. The system will automatically fill them based on your course\'s grade items.</p>';
            $html .= '</div>';
        }

        $html .= '</div>';

        return $html;
    }
}
