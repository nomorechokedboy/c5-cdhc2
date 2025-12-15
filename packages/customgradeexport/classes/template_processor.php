<?php
/**
 * Template Processor class
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

/**
 * Helper class for managing export templates
 */
class template_processor {
    
    /**
     * Get template directory
     *
     * @return string
     */
    public static function get_template_dir() {
        global $CFG;
        $dir = $CFG->dataroot . '/local_customgradeexport/templates';
        
        // Create directory if it doesn't exist
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }
        
        return $dir;
    }
    
    /**
     * Get template file path
     *
     * @param string $type 'quiz' or 'assign'
     * @return string|null Path to template or null if not found
     */
    public static function get_template_path($type) {
        $dir = self::get_template_dir();
        $filename = $type . '_template.docx';
        $path = $dir . '/' . $filename;
        
        return file_exists($path) ? $path : null;
    }
    
    /**
     * Save uploaded template
     *
     * @param string $type 'quiz' or 'assign'
     * @param array $file Uploaded file info from $_FILES
     * @return bool Success
     */
    public static function save_template($type, $file) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return false;
        }
        
        // Verify it's a DOCX file
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if ($mimeType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return false;
        }
        
        $dir = self::get_template_dir();
        $filename = $type . '_template.docx';
        $destination = $dir . '/' . $filename;
        
        return move_uploaded_file($file['tmp_name'], $destination);
    }
    
    /**
     * Delete template
     *
     * @param string $type 'quiz' or 'assign'
     * @return bool Success
     */
    public static function delete_template($type) {
        $path = self::get_template_path($type);
        
        if ($path && file_exists($path)) {
            return unlink($path);
        }
        
        return false;
    }
    
    /**
     * Check if template exists
     *
     * @param string $type 'quiz' or 'assign'
     * @return bool
     */
    public static function has_template($type) {
        return self::get_template_path($type) !== null;
    }
    
    /**
     * Get template variables for documentation
     *
     * @param string $type 'quiz' or 'assign'
     * @return array Array of available variables
     */
    public static function get_available_variables($type) {
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
