<?php

/**
 * Stream a template file to the browser.
 *
 * Access: anyone with local/customgradeexport:export OR :uploadtemplate.
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

require_login();

$type       = required_param('type',       PARAM_ALPHA);
$templateid = required_param('templateid', PARAM_ALPHANUMEXT);

if (!in_array($type, ['quiz', 'assign', 'course'], true)) {
    throw new moodle_exception('invalidparameter', 'error');
}

$syscontext = context_system::instance();
if (
    !has_capability('local/customgradeexport:uploadtemplate', $syscontext)
    && !has_capability('local/customgradeexport:export', $syscontext)
) {
    throw new required_capability_exception($syscontext, 'local/customgradeexport:export', 'nopermissions', '');
}

global $DB;
$rec = $DB->get_record(
    'local_customgradeexport_tpl',
    ['type' => $type, 'templateid' => $templateid],
    'name, ext, status',
    MUST_EXIST
);

// Refuse download for templates that are mid-migration or have no file yet.
if ($rec->status === \local_customgradeexport\template_manager::STATUS_MIGRATING) {
    throw new moodle_exception('templatenotavailable', 'local_customgradeexport');
}

$content = \local_customgradeexport\template_manager::get_template_content($type, $templateid);

if ($content === false || $content === '') {
    throw new moodle_exception('templatenotfound', 'local_customgradeexport');
}

$mimeMap = [
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls'  => 'application/vnd.ms-excel',
];

$ext      = $rec->ext ?: 'docx';
$mime     = $mimeMap[$ext] ?? 'application/octet-stream';
$filename = clean_filename($rec->name . '.' . $ext);

header('Content-Type: ' . $mime);
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . strlen($content));
header('Cache-Control: private, no-cache');

echo $content;
exit;
