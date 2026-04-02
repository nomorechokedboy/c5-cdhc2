<?php
/**
 * Webservice function definitions for local_customgradeexport
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [

    // ── Teacher / export consumer ────────────────────────────────────────

    'local_customgradeexport_get_course_templates' => [
        'classname'   => 'local_customgradeexport\external',
        'methodname'  => 'get_course_templates',
        'description' => 'Get available export templates for a specific course.',
        'type'        => 'read',
        'capabilities' => 'local/customgradeexport:export',
        'ajax'        => false,
    ],

    'local_customgradeexport_export_course_grades' => [
        'classname'   => 'local_customgradeexport\external',
        'methodname'  => 'export_course_grades',
        'description' => 'Export course grade data as a base64-encoded file (DOCX/XLSX).',
        'type'        => 'read',
        'capabilities' => 'local/customgradeexport:export',
        'ajax'        => false,
    ],

    // ── Admin / template management ───────────────────────────────────────

    'local_customgradeexport_get_all_templates' => [
        'classname'   => 'local_customgradeexport\external',
        'methodname'  => 'get_all_templates',
        'description' => 'Get all templates for a given type (admin).',
        'type'        => 'read',
        'capabilities' => 'local/customgradeexport:uploadtemplate',
        'ajax'        => false,
    ],

    'local_customgradeexport_upload_template' => [
        'classname'   => 'local_customgradeexport\external',
        'methodname'  => 'upload_template',
        'description' => 'Upload a new export template via base64 content (admin).',
        'type'        => 'write',
        'capabilities' => 'local/customgradeexport:uploadtemplate',
        'ajax'        => false,
    ],

    'local_customgradeexport_delete_template' => [
        'classname'   => 'local_customgradeexport\external',
        'methodname'  => 'delete_template',
        'description' => 'Delete an export template (admin).',
        'type'        => 'write',
        'capabilities' => 'local/customgradeexport:uploadtemplate',
        'ajax'        => false,
    ],
];
