<?php

/**
 * Template Manager.
 *
 * Storage lifecycle
 * ─────────────────
 * status = 'local'            file is on local disk only (s3key empty)
 * status = 'migrating'        cron is uploading to S3
 * status = 'migration_failed' S3 upload failed; local file still intact
 * status = 'migrated'         file exists on BOTH disk and S3
 * status = 's3'               file is on S3 only (local copy deleted)
 *
 * Read path
 * ─────────
 * local | migrating | migration_failed → local disk
 * migrated                             → S3 preferred, local disk fallback
 * s3                                   → S3 only
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

class template_manager
{

    /** Status constants — use these instead of bare strings. */
    const STATUS_LOCAL            = 'local';
    const STATUS_MIGRATING        = 'migrating';
    const STATUS_MIGRATION_FAILED = 'migration_failed';
    const STATUS_MIGRATED         = 'migrated';
    const STATUS_S3               = 's3';

    /**
     * Number of seconds after which a 'migrating' record with no progress
     * is considered stuck and surfaced in the admin UI.
     */
    const STUCK_THRESHOLD_SECONDS = 120; // 2 × cron interval

    // ── public query API ───────────────────────────────────────────────────

    /**
     * Return all templates for a given type, keyed by templateid.
     */
    public static function get_templates(string $type): array
    {
        global $DB;

        $records = $DB->get_records(
            'local_customgradeexport_tpl',
            ['type' => $type],
            'timemodified DESC'
        );

        $result = [];
        foreach ($records as $rec) {
            $ext = $rec->ext ?: self::legacy_resolve_ext($type, $rec->templateid);
            $result[$rec->templateid] = [
                'name'              => $rec->name,
                'ext'               => $ext,
                's3key'             => $rec->s3key,
                'format'            => $ext,
                'size'              => (int) $rec->filesize,
                'modified'          => (int) $rec->timemodified,
                'status'            => $rec->status,
                'migration_started' => $rec->migration_started,
            ];
        }

        return $result;
    }

    public static function has_templates(string $type): bool
    {
        global $DB;
        return $DB->record_exists('local_customgradeexport_tpl', ['type' => $type]);
    }

    public static function get_template_format(string $type, string $templateId): string
    {
        global $DB;
        $rec = $DB->get_record(
            'local_customgradeexport_tpl',
            ['type' => $type, 'templateid' => $templateId],
            'ext'
        );
        if (!$rec) {
            return '';
        }
        $ext = $rec->ext ?: self::legacy_resolve_ext($type, $templateId);
        return self::ext_to_format($ext);
    }

    public static function get_template_name(string $type, string $templateId): string
    {
        global $DB;
        $rec = $DB->get_record(
            'local_customgradeexport_tpl',
            ['type' => $type, 'templateid' => $templateId],
            'name'
        );
        return $rec ? $rec->name : $templateId;
    }

    // ── migration status queries (used by admin page) ──────────────────────

    /**
     * Return counts keyed by status plus a 'stuck' count.
     *
     * 'stuck' = records in 'migrating' whose migration_started is older
     * than STUCK_THRESHOLD_SECONDS.
     */
    public static function get_migration_status_counts(): array
    {
        global $DB;

        $rows = $DB->get_records_sql(
            "SELECT status, COUNT(*) AS cnt
               FROM {local_customgradeexport_tpl}
           GROUP BY status"
        );

        $counts = [
            self::STATUS_LOCAL            => 0,
            self::STATUS_MIGRATING        => 0,
            self::STATUS_MIGRATION_FAILED => 0,
            self::STATUS_MIGRATED         => 0,
            self::STATUS_S3               => 0,
            'stuck'                       => 0,
        ];

        foreach ($rows as $row) {
            if (isset($counts[$row->status])) {
                $counts[$row->status] = (int) $row->cnt;
            }
        }

        // Count stuck records separately (subset of 'migrating').
        $threshold = time() - self::STUCK_THRESHOLD_SECONDS;
        $counts['stuck'] = (int) $DB->count_records_select(
            'local_customgradeexport_tpl',
            "status = 'migrating' AND migration_started < :threshold",
            ['threshold' => $threshold]
        );

        return $counts;
    }

    /**
     * Return all records that are stuck (migrating but started too long ago).
     */
    public static function get_stuck_records(): array
    {
        global $DB;
        $threshold = time() - self::STUCK_THRESHOLD_SECONDS;
        return $DB->get_records_select(
            'local_customgradeexport_tpl',
            "status = 'migrating' AND migration_started < :threshold",
            ['threshold' => $threshold],
            'timemodified DESC'
        );
    }

    /**
     * Return all records with migration_failed status.
     */
    public static function get_failed_records(): array
    {
        global $DB;
        return $DB->get_records(
            'local_customgradeexport_tpl',
            ['status' => self::STATUS_MIGRATION_FAILED],
            'timemodified DESC'
        );
    }

    /**
     * Return all records with migrated status (ready for cleanup).
     */
    public static function get_migrated_records(): array
    {
        global $DB;
        return $DB->get_records(
            'local_customgradeexport_tpl',
            ['status' => self::STATUS_MIGRATED],
            'timemodified DESC'
        );
    }

    // ── migration actions (called from admin page) ─────────────────────────

    /**
     * Mark all 'local' templates as 'migrating' so the cron task picks them up.
     * Returns the number of records queued.
     */
    public static function queue_all_for_migration(): int
    {
        global $DB;

        $now     = time();
        $records = $DB->get_records('local_customgradeexport_tpl', ['status' => self::STATUS_LOCAL]);

        foreach ($records as $rec) {
            $rec->status            = self::STATUS_MIGRATING;
            $rec->migration_started = $now;
            $rec->timemodified      = $now;
            $DB->update_record('local_customgradeexport_tpl', $rec);
        }

        return count($records);
    }

    /**
     * Re-queue a single failed or stuck template for migration.
     */
    public static function retry_migration(int $id): bool
    {
        global $DB;

        $rec = $DB->get_record('local_customgradeexport_tpl', ['id' => $id]);
        if (!$rec) {
            return false;
        }

        $retryable = [
            self::STATUS_MIGRATION_FAILED,
            self::STATUS_MIGRATING, // stuck record forced by admin
        ];

        if (!in_array($rec->status, $retryable, true)) {
            return false;
        }

        $rec->status            = self::STATUS_MIGRATING;
        $rec->migration_started = time();
        $rec->timemodified      = time();
        $DB->update_record('local_customgradeexport_tpl', $rec);

        return true;
    }

    /**
     * Re-queue all failed templates for migration.
     * Returns number of records re-queued.
     */
    public static function retry_all_failed(): int
    {
        global $DB;

        $now     = time();
        $records = $DB->get_records('local_customgradeexport_tpl', ['status' => self::STATUS_MIGRATION_FAILED]);

        foreach ($records as $rec) {
            $rec->status            = self::STATUS_MIGRATING;
            $rec->migration_started = $now;
            $rec->timemodified      = $now;
            $DB->update_record('local_customgradeexport_tpl', $rec);
        }

        return count($records);
    }

    /**
     * Cleanup: delete local files for all 'migrated' templates and mark them 's3'.
     * Returns ['ok' => int, 'failed' => int].
     */
    public static function cleanup_migrated(): array
    {
        global $DB;

        $records = $DB->get_records('local_customgradeexport_tpl', ['status' => self::STATUS_MIGRATED]);
        $ok      = 0;
        $failed  = 0;

        foreach ($records as $rec) {
            $localPath = self::legacy_local_path($rec->type, $rec->templateid, $rec->ext ?: null);

            if ($localPath !== null && file_exists($localPath)) {
                if (!@unlink($localPath)) {
                    $failed++;
                    continue; // leave as 'migrated' so admin can retry
                }
            }

            // Local file gone (deleted or never existed) — promote to 's3'.
            $rec->status       = self::STATUS_S3;
            $rec->timemodified = time();
            $DB->update_record('local_customgradeexport_tpl', $rec);
            $ok++;
        }

        return ['ok' => $ok, 'failed' => $failed];
    }

    // ── content retrieval ──────────────────────────────────────────────────

    /**
     * Fetch template bytes according to the storage status.
     * Returns false on failure.
     */
    public static function get_template_content(string $type, string $templateId): string|false
    {
        global $DB;

        $rec = $DB->get_record(
            'local_customgradeexport_tpl',
            ['type' => $type, 'templateid' => $templateId],
            's3key, ext, status'
        );
        if (!$rec) {
            return false;
        }

        return self::read_content($rec, $type, $templateId);
    }

    /**
     * Return a filesystem path suitable for PHPWord's TemplateProcessor.
     *
     * For local/failed/migrating records the local path is returned directly.
     * For migrated/s3 records the file is fetched from S3 into a temp file.
     */
    public static function get_template_path(string $type, string $templateId): ?string
    {
        global $DB;

        $rec = $DB->get_record(
            'local_customgradeexport_tpl',
            ['type' => $type, 'templateid' => $templateId],
            's3key, ext, status'
        );
        if (!$rec) {
            return null;
        }

        // ── Local-read statuses: return disk path directly ─────────────────
        if (in_array($rec->status, [
            self::STATUS_LOCAL,
            self::STATUS_MIGRATING,
            self::STATUS_MIGRATION_FAILED,
        ], true)) {
            return self::legacy_local_path($type, $templateId, $rec->ext ?: null);
        }

        // ── S3-read statuses: fetch into temp file ─────────────────────────
        $content = self::read_content($rec, $type, $templateId);
        if ($content === false || $content === '') {
            return null;
        }

        $ext  = $rec->ext ?: 'docx';
        $base = tempnam(sys_get_temp_dir(), 'mdl_tpl_');
        $tmp  = $base . '.' . $ext;
        @unlink($base);
        file_put_contents($tmp, $content);

        register_shutdown_function(static function () use ($tmp): void {
            if (file_exists($tmp)) {
                @unlink($tmp);
            }
        });

        return $tmp;
    }

    // ── write API ──────────────────────────────────────────────────────────

    /**
     * Save a template uploaded via $_FILES.
     */
    public static function save_template(string $type, string $name, array $file): string|false
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return false;
        }

        $finfo    = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $extMap = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'       => 'xlsx',
            'application/vnd.ms-excel'                                                 => 'xls',
        ];

        if (!isset($extMap[$mimeType])) {
            return false;
        }

        $content = file_get_contents($file['tmp_name']);
        if ($content === false) {
            return false;
        }

        return self::save_template_from_content($type, $name, $content, $extMap[$mimeType]) ?? false;
    }

    /**
     * Save a template from raw bytes.
     *
     * New templates always start as 'local'.
     * The admin can trigger migration to S3 from the management page.
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

        $templateId = self::unique_id($type, $name);
        $dir        = self::local_template_dir();
        $dest       = $dir . '/' . $type . '_' . $templateId . '.' . $ext;

        if (file_put_contents($dest, $content) === false) {
            return null;
        }

        self::upsert_metadata(
            type: $type,
            templateId: $templateId,
            name: $name,
            s3key: '',
            ext: $ext,
            filesize: strlen($content),
            status: self::STATUS_LOCAL
        );

        return $templateId;
    }

    /**
     * Update name and/or replace file for an existing template.
     */
    public static function update_template(
        string  $type,
        string  $templateId,
        string  $newName,
        ?string $newContent = null,
        ?string $newExt     = null
    ): bool {
        global $DB;

        $rec = $DB->get_record(
            'local_customgradeexport_tpl',
            ['type' => $type, 'templateid' => $templateId]
        );
        if (!$rec) {
            return false;
        }

        if ($newContent !== null && $newExt !== null) {
            // Always write the new content to local disk first.
            $dir     = self::local_template_dir();
            $newDest = $dir . '/' . $type . '_' . $templateId . '.' . $newExt;

            if (file_put_contents($newDest, $newContent) === false) {
                return false;
            }

            // Remove the old local file if extension changed.
            if ($rec->ext !== '' && $rec->ext !== $newExt) {
                $oldLocal = self::legacy_local_path($type, $templateId, $rec->ext);
                if ($oldLocal && file_exists($oldLocal)) {
                    @unlink($oldLocal);
                }
            }

            // If this template was already on S3, delete the old S3 object
            // and reset to 'local' so the cron re-migrates the new file.
            if (in_array($rec->status, [self::STATUS_MIGRATED, self::STATUS_S3], true)) {
                try {
                    $s3 = new s3_client();
                    if ($s3->is_configured() && !empty($rec->s3key)) {
                        $s3->delete_object($rec->s3key);
                    }
                } catch (\Throwable $e) {
                    debugging('S3 delete on update failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
                }
            }

            $rec->ext      = $newExt;
            $rec->filesize = strlen($newContent);
            $rec->s3key    = '';
            $rec->status   = self::STATUS_LOCAL;
            $rec->migration_started = null;
        }

        $rec->name         = $newName;
        $rec->timemodified = time();
        $DB->update_record('local_customgradeexport_tpl', $rec);

        return true;
    }

    /**
     * Delete a template: removes file from S3 and/or disk, then removes the DB row.
     */
    public static function delete_template(string $type, string $templateId): bool
    {
        global $DB;

        $rec = $DB->get_record(
            'local_customgradeexport_tpl',
            ['type' => $type, 'templateid' => $templateId]
        );
        if (!$rec) {
            return false;
        }

        // Delete from S3 if applicable.
        if (!empty($rec->s3key) && in_array($rec->status, [
            self::STATUS_MIGRATING,
            self::STATUS_MIGRATED,
            self::STATUS_S3,
        ], true)) {
            try {
                $s3 = new s3_client();
                if ($s3->is_configured()) {
                    $s3->delete_object($rec->s3key);
                }
            } catch (\Throwable $e) {
                debugging('S3 delete failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            }
        }

        // Delete local file if it might still be there.
        if ($rec->status !== self::STATUS_S3) {
            $localPath = self::legacy_local_path($type, $templateId, $rec->ext ?: null);
            if ($localPath && file_exists($localPath)) {
                @unlink($localPath);
            }
        }

        $DB->delete_records('local_customgradeexport_tpl', ['type' => $type, 'templateid' => $templateId]);
        return true;
    }

    // ── internal read helper ───────────────────────────────────────────────

    private static function read_content(\stdClass $rec, string $type, string $templateId): string|false
    {
        switch ($rec->status) {

            case self::STATUS_LOCAL:
            case self::STATUS_MIGRATING:
            case self::STATUS_MIGRATION_FAILED:
                // File must be on local disk.
                $path = self::legacy_local_path($type, $templateId, $rec->ext ?: null);
                if ($path === null || !file_exists($path)) {
                    return false;
                }
                return file_get_contents($path);

            case self::STATUS_MIGRATED:
                // Prefer S3; fall back to local disk as a safety net.
                if (!empty($rec->s3key)) {
                    $s3 = new s3_client();
                    if ($s3->is_configured()) {
                        $content = $s3->get_object($rec->s3key);
                        if ($content !== false) {
                            return $content;
                        }
                    }
                }
                // S3 read failed — fall through to local disk.
                $path = self::legacy_local_path($type, $templateId, $rec->ext ?: null);
                if ($path === null || !file_exists($path)) {
                    return false;
                }
                return file_get_contents($path);

            case self::STATUS_S3:
                if (empty($rec->s3key)) {
                    return false;
                }
                $s3 = new s3_client();
                if (!$s3->is_configured()) {
                    return false;
                }
                return $s3->get_object($rec->s3key);

            default:
                return false;
        }
    }

    // ── private helpers ────────────────────────────────────────────────────

    private static function unique_id(string $type, string $name): string
    {
        global $DB;

        $base = substr(clean_param($name, PARAM_ALPHANUMEXT), 0, 50);
        if ($base === '') {
            $base = 'template_' . time();
        }

        $id      = $base;
        $counter = 1;
        while ($DB->record_exists('local_customgradeexport_tpl', ['type' => $type, 'templateid' => $id])) {
            $id = substr($base, 0, 45) . '_' . $counter++;
        }

        return $id;
    }

    private static function upsert_metadata(
        string  $type,
        string  $templateId,
        string  $name,
        string  $s3key,
        string  $ext,
        int     $filesize,
        string  $status
    ): void {
        global $DB;

        $existing = $DB->get_record('local_customgradeexport_tpl', ['type' => $type, 'templateid' => $templateId]);

        if ($existing) {
            $existing->name         = $name;
            $existing->s3key        = $s3key;
            $existing->ext          = $ext;
            $existing->filesize     = $filesize;
            $existing->status       = $status;
            $existing->timemodified = time();
            $DB->update_record('local_customgradeexport_tpl', $existing);
        } else {
            $rec                    = new \stdClass();
            $rec->type              = $type;
            $rec->templateid        = $templateId;
            $rec->name              = $name;
            $rec->s3key             = $s3key;
            $rec->ext               = $ext;
            $rec->filesize          = $filesize;
            $rec->status            = $status;
            $rec->migration_started = null;
            $rec->timecreated       = time();
            $rec->timemodified      = time();
            $DB->insert_record('local_customgradeexport_tpl', $rec);
        }
    }

    // ── local filesystem helpers ───────────────────────────────────────────

    public static function local_template_dir(): string
    {
        global $CFG;
        $dir = $CFG->dataroot . '/local_customgradeexport/templates';
        if (!is_dir($dir)) {
            make_writable_directory($dir);
        }
        return $dir;
    }

    /**
     * Resolve local disk path. Public so the scheduled task can call it.
     */
    public static function legacy_local_path_public(string $type, string $templateId, ?string $ext): ?string
    {
        return self::legacy_local_path($type, $templateId, $ext);
    }

    private static function legacy_local_path(string $type, string $templateId, ?string $ext): ?string
    {
        $dir = self::local_template_dir();

        if ($ext !== null && $ext !== '') {
            $path = $dir . '/' . $type . '_' . $templateId . '.' . $ext;
            return file_exists($path) ? $path : null;
        }

        foreach (['docx', 'xlsx', 'xls'] as $candidate) {
            $path = $dir . '/' . $type . '_' . $templateId . '.' . $candidate;
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    private static function legacy_resolve_ext(string $type, string $templateId): string
    {
        $dir = self::local_template_dir();
        foreach (['docx', 'xlsx', 'xls'] as $ext) {
            if (file_exists($dir . '/' . $type . '_' . $templateId . '.' . $ext)) {
                return $ext;
            }
        }
        return '';
    }

    private static function ext_to_format(string $ext): string
    {
        return in_array($ext, ['xls', 'xlsx'], true) ? 'excel' : ($ext === 'docx' ? 'word' : '');
    }
}
