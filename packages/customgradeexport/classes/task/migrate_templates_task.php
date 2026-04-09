<?php

/**
 * Scheduled task: migrate local templates to S3.
 *
 * Picks up every record with status = 'migrating', attempts the S3 upload,
 * and transitions to 'migrated' on success or 'migration_failed' on failure.
 *
 * The task is idempotent: re-running it is always safe.
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport\task;

defined('MOODLE_INTERNAL') || die();

class migrate_templates_task extends \core\task\scheduled_task
{

    public function get_name(): string
    {
        return get_string('task_migrate_templates', 'local_customgradeexport');
    }

    public function execute(): void
    {
        global $DB;

        $s3 = new \local_customgradeexport\s3_client();

        if (!$s3->is_configured()) {
            // Nothing to do — S3 not set up yet.
            mtrace('local_customgradeexport: S3 not configured, skipping migration task.');
            return;
        }

        $records = $DB->get_records(
            'local_customgradeexport_tpl',
            ['status' => 'migrating']
        );

        if (empty($records)) {
            // No work to do; exit silently so the cron log stays clean.
            return;
        }

        mtrace('local_customgradeexport: processing ' . count($records) . ' template(s) for S3 migration.');

        foreach ($records as $rec) {
            $this->process_record($DB, $s3, $rec);
        }
    }

    // ── private ────────────────────────────────────────────────────────────

    private function process_record(\moodle_database $DB, \local_customgradeexport\s3_client $s3, \stdClass $rec): void
    {
        $label = "[{$rec->type}/{$rec->templateid}]";

        // ── Resolve local file ────────────────────────────────────────────
        $localPath = \local_customgradeexport\template_manager::legacy_local_path_public(
            $rec->type,
            $rec->templateid,
            $rec->ext ?: null
        );

        if ($localPath === null || !file_exists($localPath)) {
            mtrace("  $label ERROR: local file not found, marking as migration_failed.");
            $this->set_status($DB, $rec, 'migration_failed', null);
            return;
        }

        $content = file_get_contents($localPath);
        if ($content === false) {
            mtrace("  $label ERROR: could not read local file, marking as migration_failed.");
            $this->set_status($DB, $rec, 'migration_failed', null);
            return;
        }

        // ── Build S3 key ──────────────────────────────────────────────────
        $ext   = $rec->ext ?: pathinfo($localPath, PATHINFO_EXTENSION);
        $s3key = 'templates/' . $rec->type . '/' . $rec->templateid . '.' . $ext;

        $mime = match ($ext) {
            'docx'  => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xlsx'  => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            default => 'application/vnd.ms-excel',
        };

        // ── Upload to S3 ──────────────────────────────────────────────────
        mtrace("  $label uploading to S3 key: $s3key");

        if (!$s3->put_object($s3key, $content, $mime)) {
            mtrace("  $label ERROR: S3 PUT failed, marking as migration_failed.");
            $this->set_status($DB, $rec, 'migration_failed', null);
            return;
        }

        // ── Success ───────────────────────────────────────────────────────
        $rec->s3key        = $s3key;
        $rec->ext          = $ext;
        $rec->filesize     = strlen($content);
        $rec->status       = 'migrated';
        $rec->timemodified = time();
        $DB->update_record('local_customgradeexport_tpl', $rec);

        mtrace("  $label migrated successfully.");
    }

    private function set_status(\moodle_database $DB, \stdClass $rec, string $status, ?string $s3key): void
    {
        $rec->status            = $status;
        $rec->migration_started = null;
        $rec->timemodified      = time();
        if ($s3key !== null) {
            $rec->s3key = $s3key;
        }
        $DB->update_record('local_customgradeexport_tpl', $rec);
    }
}
