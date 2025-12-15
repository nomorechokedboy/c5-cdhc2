<?php

/**
 * Enhanced Template Manager class - supports multiple templates
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

/**
 * Helper class for managing multiple export templates
 */
class template_manager
{

    /**
     * Get template directory
     *
     * @return string
     */
    public static function get_template_dir()
    {
        global $CFG;
        $dir = $CFG->dataroot . '/local_customgradeexport/templates';

        // Create directory if it doesn't exist
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }

        return $dir;
    }

    /**
     * Get all templates for a type
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @return array Array of template info: [id => ['name' => '', 'path' => '', 'size' => '', 'modified' => '']]
     */
    public static function get_templates($type)
    {
        $dir = self::get_template_dir();
        $pattern = $dir . '/' . $type . '_*.{xls,xlsx,docx}';

        $files = glob($pattern, GLOB_BRACE);
        $templates = [];

        foreach ($files as $filepath) {
            $filename = basename($filepath);

            // Extract template ID from filename (type_ID.ext)
            if (preg_match('/' . $type . '_([^.]+)\.(xls|xlsx|docx)$/', $filename, $matches)) {
                $id = $matches[1];
                $ext = $matches[2];

                $templates[$id] = [
                    'name' => self::get_template_name($type, $id),
                    'path' => $filepath,
                    'filename' => $filename,
                    'size' => filesize($filepath),
                    'modified' => filemtime($filepath),
                    'format' => $ext,
                ];
            }
        }

        return $templates;
    }

    /**
     * Get template file path
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @param string $templateId Template ID
     * @return string|null Path to template or null if not found
     */
    public static function get_template_path($type, $templateId)
    {
        $dir = self::get_template_dir();

        // Try different extensions
        $extensions = ['xlsx', 'xls', 'docx'];

        foreach ($extensions as $ext) {
            $path = $dir . '/' . $type . '_' . $templateId . '.' . $ext;
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Save uploaded template
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @param string $name Template name
     * @param array $file Uploaded file info from $_FILES
     * @return string|false Template ID on success, false on failure
     */
    public static function save_template($type, $name, $file)
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return false;
        }

        // Verify file type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowedTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!in_array($mimeType, $allowedTypes)) {
            return false;
        }

        // Determine extension
        $ext = '';
        if ($mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            $ext = 'docx';
        } else if ($mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            $ext = 'xlsx';
        } else {
            $ext = 'xls';
        }

        // Generate template ID
        $templateId = clean_param($name, PARAM_ALPHANUMEXT);
        $templateId = substr($templateId, 0, 50); // Limit length

        if (empty($templateId)) {
            $templateId = uniqid();
        }

        $dir = self::get_template_dir();
        $filename = $type . '_' . $templateId . '.' . $ext;
        $destination = $dir . '/' . $filename;

        // If file exists, append number
        $counter = 1;
        while (file_exists($destination)) {
            $templateId = clean_param($name, PARAM_ALPHANUMEXT) . '_' . $counter;
            $filename = $type . '_' . $templateId . '.' . $ext;
            $destination = $dir . '/' . $filename;
            $counter++;
        }

        if (move_uploaded_file($file['tmp_name'], $destination)) {
            // Save template metadata
            self::save_template_metadata($type, $templateId, $name);
            return $templateId;
        }

        return false;
    }

    /**
     * Delete template
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @param string $templateId Template ID
     * @return bool Success
     */
    public static function delete_template($type, $templateId)
    {
        $path = self::get_template_path($type, $templateId);

        if ($path && file_exists($path)) {
            $result = unlink($path);

            if ($result) {
                // Delete metadata
                self::delete_template_metadata($type, $templateId);
            }

            return $result;
        }

        return false;
    }

    /**
     * Save template metadata
     *
     * @param string $type Type
     * @param string $templateId Template ID
     * @param string $name Template name
     */
    protected static function save_template_metadata($type, $templateId, $name)
    {
        global $DB;

        $record = $DB->get_record('local_customgradeexport_tpl', [
            'type' => $type,
            'templateid' => $templateId
        ]);

        if ($record) {
            $record->name = $name;
            $record->timemodified = time();
            $DB->update_record('local_customgradeexport_tpl', $record);
        } else {
            $record = new \stdClass();
            $record->type = $type;
            $record->templateid = $templateId;
            $record->name = $name;
            $record->timecreated = time();
            $record->timemodified = time();
            $DB->insert_record('local_customgradeexport_tpl', $record);
        }
    }

    /**
     * Delete template metadata
     *
     * @param string $type Type
     * @param string $templateId Template ID
     */
    protected static function delete_template_metadata($type, $templateId)
    {
        global $DB;

        $DB->delete_records('local_customgradeexport_tpl', [
            'type' => $type,
            'templateid' => $templateId
        ]);
    }

    /**
     * Get template name from metadata
     *
     * @param string $type Type
     * @param string $templateId Template ID
     * @return string Template name
     */
    public static function get_template_name($type, $templateId)
    {
        global $DB;

        $record = $DB->get_record('local_customgradeexport_tpl', [
            'type' => $type,
            'templateid' => $templateId
        ], 'name');

        return $record ? $record->name : $templateId;
    }

    /**
     * Check if any templates exist for type
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @return bool
     */
    public static function has_templates($type)
    {
        $templates = self::get_templates($type);
        return !empty($templates);
    }

    /**
     * Get template format (excel or word)
     *
     * @param string $type Type
     * @param string $templateId Template ID
     * @return string 'excel', 'word', or empty
     */
    public static function get_template_format($type, $templateId)
    {
        $path = self::get_template_path($type, $templateId);

        if (!$path) {
            return '';
        }

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if (in_array($ext, ['xls', 'xlsx'])) {
            return 'excel';
        } else if ($ext === 'docx') {
            return 'word';
        }

        return '';
    }
}
