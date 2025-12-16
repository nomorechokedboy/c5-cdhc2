<?php

/**
 * Assignment grade export script with template selection
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->dirroot . '/mod/assign/locallib.php');

$cmid = required_param('cmid', PARAM_INT);
$templateid = optional_param('template', '', PARAM_ALPHANUMEXT);
$action = optional_param('action', 'select', PARAM_ALPHA); // 'select' or 'export'

$cm = get_coursemodule_from_id('assign', $cmid, 0, false, MUST_EXIST);
$course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
$assignment = $DB->get_record('assign', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, false, $cm);

$context = context_module::instance($cm->id);

// Check capabilities
require_capability('mod/assign:grade', $context);
require_capability('local/customgradeexport:export', $context);

// If action is export, do the export
if ($action === 'export') {
    $exporter = new \local_customgradeexport\assign_export_helper($assignment, $cm, $course);

    if ($templateid) {
        $templatePath = \local_customgradeexport\template_manager::get_template_path('assign', $templateid);
        $format = \local_customgradeexport\template_manager::get_template_format('assign', $templateid);

        if ($format === 'word') {
            $exporter->export_grades_docx($templatePath);
        } else {
            $exporter->export_grades_excel($templatePath);
        }
    } else {
        // Default Excel export
        $exporter->export_grades();
    }
    exit;
}

// Show template selection page
$PAGE->set_url('/local/customgradeexport/assign_export.php', ['cmid' => $cmid]);
$PAGE->set_context($context);
$PAGE->set_title(get_string('exportgrades', 'local_customgradeexport'));
$PAGE->set_heading($course->fullname);

echo $OUTPUT->header();

echo $OUTPUT->heading(get_string('exportgrades', 'local_customgradeexport'));

echo html_writer::tag('p', 'Assignment: ' . format_string($assignment->name));

// Get available templates
$templates = \local_customgradeexport\template_manager::get_templates('assign');

echo '<div class="export-template-selection" style="margin: 20px 0;">';

// Default export (no template)
echo '<div class="card" style="margin: 10px 0; padding: 20px;">';
echo '<h4><i class="fa fa-file-excel-o"></i> ' . get_string('exportdefault', 'local_customgradeexport') . '</h4>';
echo '<p>' . get_string('exportdefaulthelp', 'local_customgradeexport') . '</p>';

$defaulturl = new moodle_url('/local/customgradeexport/assign_export.php', [
    'cmid' => $cmid,
    'action' => 'export'
]);

echo $OUTPUT->single_button($defaulturl, get_string('export', 'local_customgradeexport'), 'get', ['class' => 'btn-secondary']);
echo '</div>';

// Template exports
if (!empty($templates)) {
    echo '<h4>' . get_string('exportwithtemplates', 'local_customgradeexport') . '</h4>';

    foreach ($templates as $id => $template) {
        echo '<div class="card" style="margin: 10px 0; padding: 20px;">';

        $formatIcon = $template['format'] === 'docx' ? 'fa-file-word-o' : 'fa-file-excel-o';

        echo '<h5><i class="fa ' . $formatIcon . '"></i> ' . s($template['name']) . '</h5>';
        echo '<p class="text-muted">';
        echo 'Format: ' . strtoupper($template['format']) . ' | ';
        echo 'Size: ' . display_size($template['size']) . ' | ';
        echo 'Modified: ' . userdate($template['modified']);
        echo '</p>';

        $exporturl = new moodle_url('/local/customgradeexport/assign_export.php', [
            'cmid' => $cmid,
            'action' => 'export',
            'template' => $id
        ]);

        echo $OUTPUT->single_button($exporturl, get_string('exportwithtemplate', 'local_customgradeexport'), 'get', ['class' => 'btn-primary']);
        echo '</div>';
    }
}

echo '</div>';

// Template management link for admins
if (has_capability('local/customgradeexport:uploadtemplate', context_system::instance())) {
    echo '<div class="alert alert-info" style="margin-top: 20px;">';
    echo '<strong>' . get_string('templatemanagement', 'local_customgradeexport') . ':</strong> ';
    $templateurl = new moodle_url('/local/customgradeexport/manage_templates.php', ['type' => 'assign']);
    echo html_writer::link($templateurl, get_string('managetemplates', 'local_customgradeexport'));
    echo '</div>';
}

echo $OUTPUT->footer();
