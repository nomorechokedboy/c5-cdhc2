<?php
/**
 * Database schema for template metadata
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

function xmldb_local_customgradeexport_upgrade($oldversion) {
    global $DB;
    $dbman = $DB->get_manager();
    
    if ($oldversion < 2024121302) {
        
        // Define table local_customgradeexport_tpl to be created.
        $table = new xmldb_table('local_customgradeexport_tpl');
        
        // Adding fields to table local_customgradeexport_tpl.
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('type', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL, null, null);
        $table->add_field('templateid', XMLDB_TYPE_CHAR, '100', null, XMLDB_NOTNULL, null, null);
        $table->add_field('name', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL, null, null);
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        
        // Adding keys to table local_customgradeexport_tpl.
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        
        // Adding indexes to table local_customgradeexport_tpl.
        $table->add_index('type_templateid', XMLDB_INDEX_UNIQUE, ['type', 'templateid']);
        
        // Conditionally launch create table for local_customgradeexport_tpl.
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        
        // Customgradeexport savepoint reached.
        upgrade_plugin_savepoint(true, 2024121302, 'local', 'customgradeexport');
    }
    
    return true;
}
