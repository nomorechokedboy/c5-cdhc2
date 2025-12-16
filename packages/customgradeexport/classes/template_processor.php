<?php

/**
 * Template Processor class (backward compatibility)
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

/**
 * Helper class for managing export templates (legacy support)
 * This class is kept for backward compatibility
 */
class template_processor
{

    /**
     * Get template file path (legacy method)
     *
     * @param string $type 'quiz' or 'assign'
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
     * @param string $type 'quiz' or 'assign'
     * @return bool
     */
    public static function has_template($type)
    {
        return self::get_template_path($type) !== null;
    }

    /**
     * Get template variables for documentation
     *
     * @param string $type 'quiz' or 'assign'
     * @return array Array of available variables
     */
    public static function get_available_variables($type)
    {
        $common = [
            'coursename' => 'Course name',
            'activityname' => 'Activity name',
            'exportdate' => 'Export date',
            'exporttime' => 'Export time',
        ];

        if ($type === 'quiz') {
            return array_merge($common, [
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
}
