<?php

/**
 * Template Manager class - manages multiple export templates
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

class template_manager {

    public static function get_template_dir(): string {
        global $CFG;
        $dir = $CFG->dataroot . '/local_customgradeexport/templates';
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    public static function get_templates(string $type): array {
        $dir     = self::get_template_dir();
        $pattern = $dir . '/' . $type . '_*.{xls,xlsx,docx}';
        $files   = glob($pattern, GLOB_BRACE);
        $result  = [];

        foreach ($files as $filepath) {
            $filename = basename($filepath);
            if (preg_match('/' . $type . '_([^.]+)\.(xls|xlsx|docx)$/', $filename, $m)) {
                $id = $m[1];
                $result[$id] = [
                    'name'     => self::get_template_name($type, $id),
                    'path'     => $filepath,
                    'filename' => $filename,
                    'size'     => filesize($filepath),
                    'modified' => filemtime($filepath),
                    'format'   => $m[2],
                ];
            }
        }

        return $result;
    }

    public static function get_template_path(string $type, string $templateId): ?string {
        $dir = self::get_template_dir();
        foreach (['xlsx', 'xls', 'docx'] as $ext) {
            $path = $dir . '/' . $type . '_' . $templateId . '.' . $ext;
            if (file_exists($path)) {
                return $path;
            }
        }
        return null;
    }

    /**
     * Save a template from an uploaded $_FILES entry (browser form).
     *
     * @param  string $type  'quiz', 'assign', or 'course'
     * @param  string $name  Display name
     * @param  array  $file  Entry from $_FILES
     * @return string|false  Template ID on success, false on failure
     */
    public static function save_template(string $type, string $name, array $file) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return false;
        }

        $finfo    = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowed = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!in_array($mimeType, $allowed, true)) {
            return false;
        }

        $extMap = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'       => 'xlsx',
            'application/vnd.ms-excel'                                                 => 'xls',
        ];
        $ext = $extMap[$mimeType];

        [$destination, $templateId] = self::resolve_destination($type, $name, $ext);

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            return false;
        }

        self::save_template_metadata($type, $templateId, $name);
        return $templateId;
    }

    /**
     * Save a template from raw file content (API/webservice upload).
     *
     * @param  string $type     'quiz', 'assign', or 'course'
     * @param  string $name     Display name
     * @param  string $content  Raw file bytes
     * @param  string $ext      File extension: 'docx', 'xlsx', or 'xls'
     * @return string|null      Template ID on success, null on failure
     */
    public static function save_template_from_content(
        string $type,
        string $name,
        string $content,
        string $ext
    ): ?string {
        if (!in_array($ext, ['xls', 'xlsx', 'docx'], true)) {
            return null;
        }

        [$destination, $templateId] = self::resolve_destination($type, $name, $ext);

        if (file_put_contents($destination, $content) === false) {
            return null;
        }

        self::save_template_metadata($type, $templateId, $name);
        return $templateId;
    }

    public static function delete_template(string $type, string $templateId): bool {
        $path = self::get_template_path($type, $templateId);
        if ($path && file_exists($path)) {
            $result = unlink($path);
            if ($result) {
                self::delete_template_metadata($type, $templateId);
            }
            return $result;
        }
        return false;
    }

    public static function has_templates(string $type): bool {
        return !empty(self::get_templates($type));
    }

    public static function get_template_format(string $type, string $templateId): string {
        $path = self::get_template_path($type, $templateId);
        if (!$path) return '';
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if (in_array($ext, ['xls', 'xlsx'], true)) return 'excel';
        if ($ext === 'docx') return 'word';
        return '';
    }

    // ── private helpers ───────────────────────────────────────────────────

    /**
     * Resolve a unique destination path and template ID, handling conflicts.
     *
     * @return array  [$destinationPath, $templateId]
     */
    private static function resolve_destination(
        string $type,
        string $name,
        string $ext
    ): array {
        $dir        = self::get_template_dir();
        $templateId = substr(clean_param($name, PARAM_ALPHANUMEXT), 0, 50);
        if (empty($templateId)) {
            $templateId = uniqid('tpl', true);
        }

        $destination = $dir . '/' . $type . '_' . $templateId . '.' . $ext;
        $counter     = 1;

        while (file_exists($destination)) {
            $newId       = substr(clean_param($name, PARAM_ALPHANUMEXT), 0, 45) . '_' . $counter;
            $destination = $dir . '/' . $type . '_' . $newId . '.' . $ext;
            $templateId  = $newId;
            $counter++;
        }

        return [$destination, $templateId];
    }

    private static function save_template_metadata(
        string $type,
        string $templateId,
        string $name
    ): void {
        global $DB;

        $existing = $DB->get_record(
            'local_customgradeexport_tpl',
            ['type' => $type, 'templateid' => $templateId]
        );

        if ($existing) {
            $existing->name         = $name;
            $existing->timemodified = time();
            $DB->update_record('local_customgradeexport_tpl', $existing);
        } else {
            $rec               = new \stdClass();
            $rec->type         = $type;
            $rec->templateid   = $templateId;
            $rec->name         = $name;
            $rec->timecreated  = time();
            $rec->timemodified = time();
            $DB->insert_record('local_customgradeexport_tpl', $rec);
        }
    }

    private static function delete_template_metadata(string $type, string $templateId): void {
        global $DB;
        $DB->delete_records(
            'local_customgradeexport_tpl',
            ['type' => $type, 'templateid' => $templateId]
        );
    }

    public static function get_template_name(string $type, string $templateId): string {
        global $DB;
        $rec = $DB->get_record(
            'local_customgradeexport_tpl',
            ['type' => $type, 'templateid' => $templateId],
            'name'
        );
        return $rec ? $rec->name : $templateId;
    }
}
