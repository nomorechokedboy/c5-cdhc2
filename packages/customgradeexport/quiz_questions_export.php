<?php

/**
 * Quiz questions export script with template selection
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

$cmid           = required_param('cmid', PARAM_INT);
$templateid     = optional_param('template', '', PARAM_ALPHANUMEXT);
$action         = optional_param('action', 'select', PARAM_ALPHA);
$includeanswers = optional_param('includeanswers', 0, PARAM_INT);
$randomize      = optional_param('randomize', 1, PARAM_INT);

$cm     = get_coursemodule_from_id('quiz', $cmid, 0, false, MUST_EXIST);
$course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
$quiz   = $DB->get_record('quiz', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, false, $cm);

$context = context_module::instance($cm->id);

// Capability checks
require_capability('mod/quiz:viewreports', $context);
require_capability('local/customgradeexport:export', $context);

/**
 * ==========================================================
 * EXPORT ACTION
 * ==========================================================
 */
if ($action === 'export') {
    $exporter = new \local_customgradeexport\quiz_questions_export_helper(
        $quiz,
        $cm,
        $course
    );

    $templatePath = null;

    if (!empty($templateid)) {
        $templatePath = \local_customgradeexport\template_manager::get_template_path(
            'quiz_questions',
            $templateid
        );
    }

    $exporter->export_questions(
        $templatePath,
        (bool)$includeanswers,
        (bool)$randomize
    );

    exit;
}

/**
 * ==========================================================
 * UI
 * ==========================================================
 */

$PAGE->set_url('/local/customgradeexport/quiz_questions_export.php', ['cmid' => $cmid]);
$PAGE->set_context($context);
$PAGE->set_title(get_string('exportquestions', 'local_customgradeexport'));
$PAGE->set_heading($course->fullname);

echo $OUTPUT->header();

echo $OUTPUT->heading(get_string('exportquestions', 'local_customgradeexport'));
echo html_writer::tag('p', get_string('quiz') . ': ' . format_string($quiz->name));

echo '<div class="export-template-selection" style="margin: 20px 0;">';

/**
 * ==========================================================
 * DEFAULT EXPORT (NO TEMPLATE)
 * ==========================================================
 */
echo '<div class="card" style="margin: 10px 0; padding: 20px;">';
echo '<h4><i class="fa fa-file-word-o"></i> ' . get_string('exportdefault', 'local_customgradeexport') . '</h4>';

// Form for default export with checkbox option
echo '<form method="get" action="">';
echo '<input type="hidden" name="cmid" value="' . $cmid . '">';
echo '<input type="hidden" name="action" value="export">';

echo '<div class="form-check mb-2">';
echo '<input type="checkbox" name="includeanswers" value="1" class="form-check-input" id="answers_default">';
echo '<label class="form-check-label" for="answers_default">';
echo get_string('includeanswers', 'local_customgradeexport');
echo '</label>';
echo '</div>';

echo '<button type="submit" class="btn btn-secondary">';
echo '<i class="fa fa-download"></i> ';
echo get_string('exportquestions', 'local_customgradeexport');
echo '</button>';

echo '</form>';
echo '</div>';

/**
 * ==========================================================
 * TEMPLATE EXPORTS
 * ==========================================================
 */

$templates = \local_customgradeexport\template_manager::get_templates('quiz_questions');

if (!empty($templates)) {
    echo '<h4>' . get_string('exportwithtemplates', 'local_customgradeexport') . '</h4>';

    foreach ($templates as $id => $template) {
        echo '<div class="card" style="margin: 10px 0; padding: 20px;">';

        echo '<h5><i class="fa fa-file-word-o"></i> ' . s($template['name']) . '</h5>';

        echo '<p class="text-muted">';
        echo 'Format: ' . strtoupper($template['format']) . ' | ';
        echo 'Size: ' . display_size($template['size']) . ' | ';
        echo 'Modified: ' . userdate($template['modified']);
        echo '</p>';

        echo '<form method="get" action="">';
        echo '<input type="hidden" name="cmid" value="' . $cmid . '">';
        echo '<input type="hidden" name="action" value="export">';
        echo '<input type="hidden" name="template" value="' . s($id) . '">';

        echo '<div class="form-check mb-2">';
        echo '<input type="checkbox" name="includeanswers" value="1" class="form-check-input" id="answers_' . s($id) . '">';
        echo '<label class="form-check-label" for="answers_' . s($id) . '">';
        echo get_string('includeanswers', 'local_customgradeexport');
        echo '</label>';
        echo '</div>';

        echo '<button type="submit" class="btn btn-primary">';
        echo '<i class="fa fa-download"></i> ';
        echo get_string('exportwithtemplate', 'local_customgradeexport');
        echo '</button>';

        echo '</form>';
        echo '</div>';
    }
}

echo '</div>'; // End export-template-selection

/**
 * ==========================================================
 * TEMPLATE MANAGEMENT (ADMINS)
 * ==========================================================
 */
if (has_capability('local/customgradeexport:uploadtemplate', context_system::instance())) {
    echo '<div class="alert alert-info" style="margin-top: 20px;">';
    echo '<strong>' . get_string('templatemanagement', 'local_customgradeexport') . ':</strong> ';
    $templateurl = new moodle_url(
        '/local/customgradeexport/manage_templates.php',
        ['type' => 'quiz_questions']
    );
    echo html_writer::link($templateurl, get_string('managetemplates', 'local_customgradeexport'));
    echo '</div>';
}

echo $OUTPUT->footer();
