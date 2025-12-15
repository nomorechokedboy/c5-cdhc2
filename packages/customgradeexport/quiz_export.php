<?php
/**
 * Quiz grade export script with format selection
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

$cmid = required_param('cmid', PARAM_INT);
$format = optional_param('format', '', PARAM_ALPHA); // 'excel', 'docx', or empty for selection

$cm = get_coursemodule_from_id('quiz', $cmid, 0, false, MUST_EXIST);
$course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
$quiz = $DB->get_record('quiz', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, false, $cm);

$context = context_module::instance($cm->id);

// Check capabilities
require_capability('mod/quiz:viewreports', $context);
require_capability('local/customgradeexport:export', $context);

// If format is specified, do the export
if ($format) {
    $exporter = new \local_customgradeexport\quiz_export_helper($quiz, $cm, $course);
    
    if ($format === 'docx') {
        $exporter->export_grades_docx();
    } else {
        $exporter->export_grades(); // Default Excel export
    }
    exit;
}

// Show format selection page
$PAGE->set_url('/local/customgradeexport/quiz_export.php', ['cmid' => $cmid]);
$PAGE->set_context($context);
$PAGE->set_title(get_string('exportgrades', 'local_customgradeexport'));
$PAGE->set_heading($course->fullname);

echo $OUTPUT->header();

echo $OUTPUT->heading(get_string('selectformat', 'local_customgradeexport'));

echo html_writer::tag('p', 'Quiz: ' . format_string($quiz->name));

// Show available formats
echo '<div class="export-format-selection" style="margin: 20px 0;">';

// Excel export
$excelurl = new moodle_url('/local/customgradeexport/quiz_export.php', [
    'cmid' => $cmid,
    'format' => 'excel'
]);

echo '<div class="card" style="display: inline-block; width: 300px; margin: 10px; padding: 20px; vertical-align: top;">';
echo '<h3><i class="fa fa-file-excel-o"></i> ' . get_string('exportexcel', 'local_customgradeexport') . '</h3>';
echo '<p>Export to Microsoft Excel format (.xls)</p>';
echo '<p><strong>Best for:</strong> Data analysis, spreadsheets</p>';
echo $OUTPUT->single_button($excelurl, 'Export to Excel', 'get', ['class' => 'btn-primary']);
echo '</div>';

// DOCX export
$docxurl = new moodle_url('/local/customgradeexport/quiz_export.php', [
    'cmid' => $cmid,
    'format' => 'docx'
]);

echo '<div class="card" style="display: inline-block; width: 300px; margin: 10px; padding: 20px; vertical-align: top;">';
echo '<h3><i class="fa fa-file-word-o"></i> ' . get_string('exportdocx', 'local_customgradeexport') . '</h3>';
echo '<p>Export to Microsoft Word format (.docx)</p>';

// Check if template exists
$hasTemplate = \local_customgradeexport\template_processor::has_template('quiz');
if ($hasTemplate) {
    echo '<p><strong>Using custom template</strong></p>';
} else {
    echo '<p><strong>Using default table format</strong></p>';
}

echo $OUTPUT->single_button($docxurl, 'Export to Word', 'get', ['class' => 'btn-primary']);
echo '</div>';

echo '</div>';

// Template management link for admins
if (has_capability('local/customgradeexport:uploadtemplate', context_system::instance())) {
    echo '<div class="alert alert-info">';
    echo '<strong>Template Management:</strong> ';
    $templateurl = new moodle_url('/local/customgradeexport/upload_template.php', ['type' => 'quiz']);
    echo html_writer::link($templateurl, 'Manage export templates');
    echo '</div>';
}

echo $OUTPUT->footer();
