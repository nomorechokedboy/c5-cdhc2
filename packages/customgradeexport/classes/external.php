<?php
/**
 * External function implementations for local_customgradeexport
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

/**
 * External API class.
 *
 * Uses the Moodle 4.2+ \core_external namespace. All five functions are
 * stateless and use capability checks rather than session cookies so they
 * are safe for webservice/restful access.
 */
class external extends \core_external\external_api {

    // ── helpers ────────────────────────────────────────────────────────────

    /** Shared template-list shape (used for both course & admin list returns). */
    private static function template_structure(): \core_external\external_single_structure {
        return new \core_external\external_single_structure([
            'id'       => new \core_external\external_value(PARAM_ALPHANUMEXT, 'Template ID'),
            'name'     => new \core_external\external_value(PARAM_TEXT,        'Display name'),
            'format'   => new \core_external\external_value(PARAM_ALPHA,       'File format: docx | xlsx | xls'),
            'size'     => new \core_external\external_value(PARAM_INT,         'File size in bytes'),
            'modified' => new \core_external\external_value(PARAM_INT,         'Last-modified Unix timestamp'),
        ]);
    }

    /** Convert template_manager array to the wire format. */
    private static function templates_to_array(array $templates): array {
        $out = [];
        foreach ($templates as $id => $tpl) {
            $out[] = [
                'id'       => (string) $id,
                'name'     => (string) $tpl['name'],
                'format'   => (string) $tpl['format'],
                'size'     => (int)    $tpl['size'],
                'modified' => (int)    $tpl['modified'],
            ];
        }
        return $out;
    }

    // ── get_course_templates ────────────────────────────────────────────────

    public static function get_course_templates_parameters(): \core_external\external_function_parameters {
        return new \core_external\external_function_parameters([
            'courseid' => new \core_external\external_value(PARAM_INT, 'Course ID'),
        ]);
    }

    /**
     * Return available DOCX/XLSX templates for a course export.
     *
     * @param  int   $courseid  Moodle course ID
     * @return array            Array of template descriptors
     */
    public static function get_course_templates(int $courseid): array {
        $params = self::validate_parameters(
            self::get_course_templates_parameters(),
            ['courseid' => $courseid]
        );

        $context = \context_course::instance($params['courseid']);
        self::validate_context($context);
        require_capability('local/customgradeexport:export', $context);

        return self::templates_to_array(template_manager::get_templates('course'));
    }

    public static function get_course_templates_returns(): \core_external\external_multiple_structure {
        return new \core_external\external_multiple_structure(self::template_structure());
    }

    // ── export_course_grades ────────────────────────────────────────────────

    public static function export_course_grades_parameters(): \core_external\external_function_parameters {
        return new \core_external\external_function_parameters([
            'courseid'   => new \core_external\external_value(PARAM_INT,         'Course ID'),
            'templateid' => new \core_external\external_value(PARAM_ALPHANUMEXT, 'Template ID (empty = default DOCX)', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Export course grades and return the file as a base64-encoded string.
     *
     * @param  int    $courseid    Moodle course ID
     * @param  string $templateid  Template identifier ('' = no template)
     * @return array               {filename, mimetype, filedata}
     */
    public static function export_course_grades(int $courseid, string $templateid = ''): array {
        global $DB;

        $params = self::validate_parameters(
            self::export_course_grades_parameters(),
            ['courseid' => $courseid, 'templateid' => $templateid]
        );

        $course  = $DB->get_record('course', ['id' => $params['courseid']], '*', MUST_EXIST);
        $context = \context_course::instance($params['courseid']);
        self::validate_context($context);
        require_capability('local/customgradeexport:export', $context);

        $templatePath = null;
        if ($params['templateid'] !== '') {
            $templatePath = template_manager::get_template_path('course', $params['templateid']);
        }

        $helper = new course_export_helper($course);
        $result = $helper->get_export_bytes($templatePath);

        return [
            'filename' => $result['filename'],
            'mimetype' => $result['mimetype'],
            'filedata' => base64_encode($result['content']),
        ];
    }

    public static function export_course_grades_returns(): \core_external\external_single_structure {
        return new \core_external\external_single_structure([
            'filename' => new \core_external\external_value(PARAM_TEXT, 'Download filename'),
            'mimetype' => new \core_external\external_value(PARAM_TEXT, 'MIME type'),
            'filedata' => new \core_external\external_value(PARAM_RAW,  'Base64-encoded file content'),
        ]);
    }

    // ── get_all_templates (admin) ───────────────────────────────────────────

    public static function get_all_templates_parameters(): \core_external\external_function_parameters {
        return new \core_external\external_function_parameters([
            'type' => new \core_external\external_value(PARAM_ALPHA, 'Template type: course | quiz | assign'),
        ]);
    }

    /**
     * Return all templates of the given type (admin use).
     *
     * @param  string $type  'course', 'quiz', or 'assign'
     * @return array
     */
    public static function get_all_templates(string $type): array {
        $params = self::validate_parameters(
            self::get_all_templates_parameters(),
            ['type' => $type]
        );

        $context = \context_system::instance();
        self::validate_context($context);
        require_capability('local/customgradeexport:uploadtemplate', $context);

        return self::templates_to_array(template_manager::get_templates($params['type']));
    }

    public static function get_all_templates_returns(): \core_external\external_multiple_structure {
        return new \core_external\external_multiple_structure(self::template_structure());
    }

    // ── upload_template (admin) ─────────────────────────────────────────────

    public static function upload_template_parameters(): \core_external\external_function_parameters {
        return new \core_external\external_function_parameters([
            'type'     => new \core_external\external_value(PARAM_ALPHA, 'Template type: course | quiz | assign'),
            'name'     => new \core_external\external_value(PARAM_TEXT,  'Display name for this template'),
            'filename' => new \core_external\external_value(PARAM_FILE,  'Original filename (used to detect format)'),
            'filedata' => new \core_external\external_value(PARAM_RAW,   'Base64-encoded file content'),
        ]);
    }

    /**
     * Save a new template uploaded as a base64 blob.
     *
     * @param  string $type      'course', 'quiz', or 'assign'
     * @param  string $name      Human-readable label
     * @param  string $filename  Original filename (extension determines format)
     * @param  string $filedata  Base64-encoded file content
     * @return array             {id, success}
     */
    public static function upload_template(
        string $type,
        string $name,
        string $filename,
        string $filedata
    ): array {
        $params = self::validate_parameters(
            self::upload_template_parameters(),
            compact('type', 'name', 'filename', 'filedata')
        );

        $context = \context_system::instance();
        self::validate_context($context);
        require_capability('local/customgradeexport:uploadtemplate', $context);

        $ext = strtolower(pathinfo($params['filename'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['xls', 'xlsx', 'docx'], true)) {
            throw new \moodle_exception(
                'invalidfiletype',
                'local_customgradeexport',
                '',
                $ext
            );
        }

        $content = base64_decode($params['filedata'], true);
        if ($content === false || $content === '') {
            throw new \moodle_exception('invalidfiledata', 'local_customgradeexport');
        }

        $templateId = template_manager::save_template_from_content(
            $params['type'],
            $params['name'],
            $content,
            $ext
        );

        if (!$templateId) {
            throw new \moodle_exception('templateuploadfailed', 'local_customgradeexport');
        }

        return ['id' => $templateId, 'success' => true];
    }

    public static function upload_template_returns(): \core_external\external_single_structure {
        return new \core_external\external_single_structure([
            'id'      => new \core_external\external_value(PARAM_ALPHANUMEXT, 'New template ID'),
            'success' => new \core_external\external_value(PARAM_BOOL,        'Upload success flag'),
        ]);
    }

    // ── delete_template (admin) ─────────────────────────────────────────────

    public static function delete_template_parameters(): \core_external\external_function_parameters {
        return new \core_external\external_function_parameters([
            'type'       => new \core_external\external_value(PARAM_ALPHA,       'Template type'),
            'templateid' => new \core_external\external_value(PARAM_ALPHANUMEXT, 'Template ID'),
        ]);
    }

    /**
     * Delete a template by type + ID.
     *
     * @param  string $type        'course', 'quiz', or 'assign'
     * @param  string $templateid  Template identifier
     * @return array               {success}
     */
    public static function delete_template(string $type, string $templateid): array {
        $params = self::validate_parameters(
            self::delete_template_parameters(),
            ['type' => $type, 'templateid' => $templateid]
        );

        $context = \context_system::instance();
        self::validate_context($context);
        require_capability('local/customgradeexport:uploadtemplate', $context);

        $success = template_manager::delete_template($params['type'], $params['templateid']);
        return ['success' => $success];
    }

    public static function delete_template_returns(): \core_external\external_single_structure {
        return new \core_external\external_single_structure([
            'success' => new \core_external\external_value(PARAM_BOOL, 'Deletion result'),
        ]);
    }
}
