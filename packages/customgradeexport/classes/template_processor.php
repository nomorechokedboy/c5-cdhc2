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
        $templates = template_manager::get_templates($type);
        if (empty($templates)) {
            return null;
        }
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
            'coursename'  => 'Course full name',
            'classname'   => 'Course short name (used as class identifier, e.g. LỚP: ${classname})',
            'exportdate'  => 'Export date (dd/mm/yyyy)',
            'exporttime'  => 'Export time (HH:MM:SS)',
        ];

        if ($type === 'course') {
            return array_merge($common, [
                'courseshortname' => 'Course short name (alias for classname)',

                // ── Table row variables ──────────────────────────────────
                'stt'       => 'Row number (required for table row cloning)',
                'fullname'  => 'Student full name',
                'firstname' => 'Student first name',
                'lastname'  => 'Student last name',
                'idnumber'  => 'Student ID number',

                // Grade columns (dynamic based on course grade items)
                '15p_01' => '15-minute test score 1',
                '15p_02' => '15-minute test score 2',
                '15p_03' => '15-minute test score 3',
                '1t_01'  => 'Midterm test score 1',
                '1t_02'  => 'Midterm test score 2',
                '1t_03'  => 'Midterm test score 3',
                'thi_01' => 'Final exam score 1',
                'thi_02' => 'Final exam score 2',
                'tkmh'   => 'Course final grade (TKMH, calculated automatically)',
                'xep_loai' => 'Grade classification (XS / G / Khá / Đạt / Không đạt)',
                'ghi_chu'  => 'Notes / remarks',

                // ── Classification statistics (document-level, not per-row) ─
                'xuat_sac_count'  => 'Number of students classified as Xuất sắc (TKMH ≥ 9)',
                'xuat_sac_pct'    => 'Percentage of Xuất sắc students',
                'gioi_count'      => 'Number of students classified as Giỏi (8 ≤ TKMH < 9)',
                'gioi_pct'        => 'Percentage of Giỏi students',
                'kha_count'       => 'Number of students classified as Khá (7 ≤ TKMH < 8)',
                'kha_pct'         => 'Percentage of Khá students',
                'dat_count'       => 'Number of students classified as Đạt (5 ≤ TKMH < 7)',
                'dat_pct'         => 'Percentage of Đạt students',
                'khong_dat_count' => 'Number of students classified as Không đạt (TKMH < 5)',
                'khong_dat_pct'   => 'Percentage of Không đạt students',
                'total_students'  => 'Total number of students with a grade',
            ]);
        }

        if ($type === 'quiz') {
            return array_merge($common, [
                'stt'         => 'Row number (required for table row cloning)',
                'activityname' => 'Quiz / activity name',
                'firstname'   => 'Student first name',
                'lastname'    => 'Student last name',
                'idnumber'    => 'Student ID number',
                'institution' => 'Institution',
                'department'  => 'Department',
                'email'       => 'Email address',
                'attempt'     => 'Attempt number',
                'status'      => 'Attempt status',
                'grade'       => 'Grade received',
                'outof'       => 'Maximum grade',
                'percentage'  => 'Percentage score',
                'timestarted'  => 'Time started',
                'timefinished' => 'Time finished',
                'timetaken'   => 'Time taken',
            ]);
        }

        if ($type === 'assign') {
            return array_merge($common, [
                'stt'          => 'Row number (required for table row cloning)',
                'activityname' => 'Assignment name',
                'firstname'    => 'Student first name',
                'lastname'     => 'Student last name',
                'idnumber'     => 'Student ID number',
                'institution'  => 'Institution',
                'department'   => 'Department',
                'email'        => 'Email address',
                'status'       => 'Submission status',
                'grade'        => 'Grade received',
                'outof'        => 'Maximum grade',
                'percentage'   => 'Percentage score',
                'timesubmitted' => 'Time submitted',
                'timemarked'   => 'Time graded',
                'grader'       => 'Grader name',
                'feedback'     => 'Feedback comments',
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

        $html  = '<div class="template-instructions">';
        $html .= '<h5>Available Template Variables</h5>';
        $html .= '<p>Use these variables in your template file. They will be replaced with actual data during export.</p>';

        // ── Document-level header variables ──────────────────────────────
        $html .= '<h6>Document Header Variables</h6>';
        $html .= '<table class="table table-sm table-bordered">';
        $html .= '<thead><tr><th>Variable</th><th>Description</th></tr></thead><tbody>';

        $headerVars = ['coursename', 'classname', 'courseshortname', 'activityname', 'exportdate', 'exporttime'];
        foreach ($headerVars as $var) {
            if (isset($variables[$var])) {
                $html .= '<tr><td><code>${' . $var . '}</code></td><td>' . $variables[$var] . '</td></tr>';
            }
        }
        $html .= '</tbody></table>';

        // ── Table row variables ───────────────────────────────────────────
        $html .= '<h6>Table Row Variables</h6>';
        $html .= '<p><strong>Important:</strong> For table data to work, your template must include a table with placeholders in the data row.</p>';

        if ($type === 'course') {
            $html .= '<p><strong>Required:</strong> The first column MUST contain <code>${stt}</code> to enable row cloning.</p>';
        } else {
            $html .= '<p><strong>Required:</strong> The first column MUST contain <code>${firstname}</code> to enable row cloning.</p>';
        }

        $html .= '<table class="table table-sm table-bordered">';
        $html .= '<thead><tr><th>Variable</th><th>Description</th></tr></thead><tbody>';

        $excludeFromRows = array_merge($headerVars, [
            'xuat_sac_count',
            'xuat_sac_pct',
            'gioi_count',
            'gioi_pct',
            'kha_count',
            'kha_pct',
            'dat_count',
            'dat_pct',
            'khong_dat_count',
            'khong_dat_pct',
            'total_students',
        ]);
        foreach ($variables as $var => $desc) {
            if (!in_array($var, $excludeFromRows, true)) {
                $html .= '<tr><td><code>${' . $var . '}</code></td><td>' . $desc . '</td></tr>';
            }
        }
        $html .= '</tbody></table>';

        // ── Stats variables (course only) ─────────────────────────────────
        if ($type === 'course') {
            $html .= '<h6>Classification Statistics Variables</h6>';
            $html .= '<p>Place these anywhere in the document (outside the cloned row) to show summary statistics.</p>';
            $html .= '<p>Example: <code>Kết quả: Xuất sắc ${xuat_sac_count} tỷ lệ ${xuat_sac_pct}%; Giỏi: ${gioi_count} tỷ lệ ${gioi_pct}%;</code></p>';
            $html .= '<table class="table table-sm table-bordered">';
            $html .= '<thead><tr><th>Variable</th><th>Description</th></tr></thead><tbody>';
            $statsVars = [
                'xuat_sac_count',
                'xuat_sac_pct',
                'gioi_count',
                'gioi_pct',
                'kha_count',
                'kha_pct',
                'dat_count',
                'dat_pct',
                'khong_dat_count',
                'khong_dat_pct',
                'total_students',
            ];
            foreach ($statsVars as $var) {
                if (isset($variables[$var])) {
                    $html .= '<tr><td><code>${' . $var . '}</code></td><td>' . $variables[$var] . '</td></tr>';
                }
            }
            $html .= '</tbody></table>';

            $html .= '<div class="alert alert-info"><h6>Dynamic Grade Columns</h6>';
            $html .= '<p>The number of 15P/1T columns adjusts automatically to match the course\'s grade items (minimum 3 columns each).</p></div>';
        }

        $html .= '</div>';
        return $html;
    }
}
