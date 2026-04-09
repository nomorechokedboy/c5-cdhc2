<?php

/**
 * Upgrade steps for local_customgradeexport.
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

function xmldb_local_customgradeexport_upgrade($oldversion)
{
    global $DB;
    $dbman = $DB->get_manager();

    // ── 2024121302 : create initial table ─────────────────────────────────
    if ($oldversion < 2024121302) {
        $table = new xmldb_table('local_customgradeexport_tpl');
        $table->add_field('id',           XMLDB_TYPE_INTEGER, '10',  null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('type',         XMLDB_TYPE_CHAR,    '20',  null, XMLDB_NOTNULL, null, null);
        $table->add_field('templateid',   XMLDB_TYPE_CHAR,    '100', null, XMLDB_NOTNULL, null, null);
        $table->add_field('name',         XMLDB_TYPE_CHAR,    '255', null, XMLDB_NOTNULL, null, null);
        $table->add_field('timecreated',  XMLDB_TYPE_INTEGER, '10',  null, XMLDB_NOTNULL, null, null);
        $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10',  null, XMLDB_NOTNULL, null, null);
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_index('type_templateid', XMLDB_INDEX_UNIQUE, ['type', 'templateid']);

        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        upgrade_plugin_savepoint(true, 2024121302, 'local', 'customgradeexport');
    }

    // ── 2026040201 : add s3key, ext, filesize ─────────────────────────────
    if ($oldversion < 2026040201) {
        $table = new xmldb_table('local_customgradeexport_tpl');

        $field = new xmldb_field('s3key', XMLDB_TYPE_CHAR, '500', null, XMLDB_NOTNULL, null, '');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        $field = new xmldb_field('ext', XMLDB_TYPE_CHAR, '10', null, XMLDB_NOTNULL, null, '');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        $field = new xmldb_field('filesize', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        upgrade_plugin_savepoint(true, 2026040201, 'local', 'customgradeexport');
    }

    // ── 2026040202 : add status, migration_started; index on status ───────
    if ($oldversion < 2026040202) {
        $table = new xmldb_table('local_customgradeexport_tpl');

        // status column — default 'local' so all existing rows are treated
        // as local-disk templates, which is correct.
        $field = new xmldb_field('status', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL, null, 'local');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // migration_started — nullable timestamp.
        $field = new xmldb_field('migration_started', XMLDB_TYPE_INTEGER, '10', null, null, null, null);
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Index on status so the scheduled task query is fast.
        $index = new xmldb_index('status', XMLDB_INDEX_NOTUNIQUE, ['status']);
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Any rows that already have a non-empty s3key were successfully
        // migrated before this status column existed — mark them as 's3'.
        $DB->execute(
            "UPDATE {local_customgradeexport_tpl} SET status = 's3' WHERE s3key <> ''",
        );

        upgrade_plugin_savepoint(true, 2026040202, 'local', 'customgradeexport');
    }

    return true;
}
