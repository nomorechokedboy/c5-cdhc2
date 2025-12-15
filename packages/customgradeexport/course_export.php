<?php

/**
 * Course grade export script with template selection
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

$courseid = required_param('id', PARAM_INT);
$templateid = optional_param('template', '', PARAM_ALPHANUMEXT);
$action = optional_param('action', 'select', PARAM_ALPHA); // 'select' or 'export'

$course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);

require_login($course);

$context = context_course::instance($course->id);

// Check capabilities
require_capability('moodle/grade:viewall', $context);
require_capability('local/customgradeexport:export', $context);

// If action is export, do the export
if ($action === 'export') {
    $exporter = new \local_customgradeexport\course_export_helper($course);

    if ($templateid) {
        $templatePath = \local_customgradeexport\template_manager::get_template_path('course', $templateid);
        $exporter->export_grades($templatePath);
    } else {
        $exporter->export_grades();
    }
    exit;
}

// Show template selection page
$PAGE->set_url('/local/customgradeexport/course_export.php', ['id' => $courseid]);
$PAGE->set_context($context);
$PAGE->set_title(get_string('exportcoursegrades', 'local_customgradeexport'));
$PAGE->set_heading($course->fullname);
$PAGE->set_pagelayout('incourse');

echo $OUTPUT->header();

echo $OUTPUT->heading(get_string('exportcoursegrades', 'local_customgradeexport'));

echo html_writer::tag('p', get_string('exportcoursegradeshelp', 'local_customgradeexport'));

// Get available templates
$templates = \local_customgradeexport\template_manager::get_templates('course');

echo '<div class="export-template-selection" style="margin: 20px 0;">';

// Default export (no template)
echo '<div class="card" style="margin: 10px 0; padding: 20px;">';
echo '<h4><i class="fa fa-file-excel-o"></i> ' . get_string('exportdefault', 'local_customgradeexport') . '</h4>';
echo '<p>' . get_string('exportdefaulthelp', 'local_customgradeexport') . '</p>';

$defaulturl = new moodle_url('/local/customgradeexport/course_export.php', [
    'id' => $courseid,
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

        $exporturl = new moodle_url('/local/customgradeexport/course_export.php', [
            'id' => $courseid,
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
    $templateurl = new moodle_url('/local/customgradeexport/manage_templates.php', ['type' => 'course']);
    echo html_writer::link($templateurl, get_string('managetemplates', 'local_customgradeexport'));
    echo '</div>';
}

// Help section
echo '<div class="card" style="margin-top: 20px; padding: 20px; background-color: #f8f9fa;">';
echo '<h5>' . get_string('aboutcourseexport', 'local_customgradeexport') . '</h5>';
echo '<p>' . get_string('aboutcourseexporthelp', 'local_customgradeexport') . '</p>';

echo '<h6>' . get_string('gradecolumns', 'local_customgradeexport') . '</h6>';
echo '<ul>';
echo '<li><strong>15P (Thường xuyên):</strong> ' . get_string('examtype15p', 'local_customgradeexport') . '</li>';
echo '<li><strong>1T (Định kỳ):</strong> ' . get_string('examtype1t', 'local_customgradeexport') . '</li>';
echo '<li><strong>Thi:</strong> ' . get_string('examtypethi', 'local_customgradeexport') . '</li>';
echo '<li><strong>TKMH:</strong> ' . get_string('tkmhformula', 'local_customgradeexport') . '</li>';
echo '</ul>';
echo '</div>';

echo $OUTPUT->footer();
