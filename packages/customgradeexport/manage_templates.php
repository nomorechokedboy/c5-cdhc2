<?php

/**
 * Enhanced template management page - supports multiple templates
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

require_login();

$type = required_param('type', PARAM_ALPHA); // 'quiz', 'assign', or 'course'
$action = optional_param('action', '', PARAM_ALPHA);
$templateid = optional_param('templateid', '', PARAM_ALPHANUMEXT);

// Check capability
$context = context_system::instance();
require_capability('local/customgradeexport:uploadtemplate', $context);

$PAGE->set_context($context);
$PAGE->set_url('/local/customgradeexport/manage_templates.php', ['type' => $type]);
$PAGE->set_title(get_string('templatemanagement', 'local_customgradeexport'));
$PAGE->set_heading(get_string('templatemanagement', 'local_customgradeexport'));
$PAGE->set_pagelayout('admin');

// Handle actions
if ($action === 'delete' && $templateid && confirm_sesskey()) {
    if (\local_customgradeexport\template_manager::delete_template($type, $templateid)) {
        redirect($PAGE->url, get_string('templatedeleted', 'local_customgradeexport'), null, \core\output\notification::NOTIFY_SUCCESS);
    } else {
        redirect($PAGE->url, get_string('templatedeletefailed', 'local_customgradeexport'), null, \core\output\notification::NOTIFY_ERROR);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['template'])) {
    require_sesskey();

    $templatename = required_param('templatename', PARAM_TEXT);

    $templateId = \local_customgradeexport\template_manager::save_template($type, $templatename, $_FILES['template']);

    if ($templateId) {
        redirect($PAGE->url, get_string('templateuploaded', 'local_customgradeexport'), null, \core\output\notification::NOTIFY_SUCCESS);
    } else {
        $error = get_string('templateuploadfailed', 'local_customgradeexport');
    }
}

echo $OUTPUT->header();

echo $OUTPUT->heading(get_string('templatemanagement', 'local_customgradeexport'));

// Show tabs for quiz/assign/course
$tabs = [];
$tabs[] = new tabobject(
    'quiz',
    new moodle_url('/local/customgradeexport/manage_templates.php', ['type' => 'quiz']),
    get_string('quiztemplates', 'local_customgradeexport')
);
$tabs[] = new tabobject(
    'assign',
    new moodle_url('/local/customgradeexport/manage_templates.php', ['type' => 'assign']),
    get_string('assigntemplates', 'local_customgradeexport')
);
$tabs[] = new tabobject(
    'course',
    new moodle_url('/local/customgradeexport/manage_templates.php', ['type' => 'course']),
    get_string('coursetemplates', 'local_customgradeexport')
);

echo $OUTPUT->tabtree($tabs, $type);

// Show error if any
if (isset($error)) {
    echo $OUTPUT->notification($error, \core\output\notification::NOTIFY_ERROR);
}

// Current templates
$templates = \local_customgradeexport\template_manager::get_templates($type);

echo '<div class="card mb-3">';
echo '<div class="card-body">';
echo '<h5 class="card-title">' . get_string('existingtemplates', 'local_customgradeexport') . '</h5>';

if (!empty($templates)) {
    echo '<table class="table table-striped">';
    echo '<thead><tr>';
    echo '<th>' . get_string('templatename', 'local_customgradeexport') . '</th>';
    echo '<th>' . get_string('format', 'local_customgradeexport') . '</th>';
    echo '<th>' . get_string('size', 'local_customgradeexport') . '</th>';
    echo '<th>' . get_string('modified', 'local_customgradeexport') . '</th>';
    echo '<th>' . get_string('actions', 'local_customgradeexport') . '</th>';
    echo '</tr></thead>';
    echo '<tbody>';

    foreach ($templates as $id => $template) {
        echo '<tr>';
        echo '<td><strong>' . s($template['name']) . '</strong></td>';
        echo '<td>' . strtoupper($template['format']) . '</td>';
        echo '<td>' . display_size($template['size']) . '</td>';
        echo '<td>' . userdate($template['modified']) . '</td>';
        echo '<td>';

        // Delete button
        $deleteurl = new moodle_url('/local/customgradeexport/manage_templates.php', [
            'type' => $type,
            'action' => 'delete',
            'templateid' => $id,
            'sesskey' => sesskey()
        ]);

        echo html_writer::link(
            $deleteurl,
            '<i class="fa fa-trash"></i> ' . get_string('delete'),
            ['class' => 'btn btn-sm btn-danger', 'onclick' => 'return confirm("' . get_string('confirmdelete', 'local_customgradeexport') . '");']
        );

        echo '</td>';
        echo '</tr>';
    }

    echo '</tbody>';
    echo '</table>';
} else {
    echo '<p class="alert alert-info">' . get_string('notemplatesyet', 'local_customgradeexport') . '</p>';
}

echo '</div>';
echo '</div>';

// Upload form
echo '<div class="card mb-3">';
echo '<div class="card-body">';
echo '<h5 class="card-title">' . get_string('uploadnewtemplate', 'local_customgradeexport') . '</h5>';

echo '<form method="post" enctype="multipart/form-data">';
echo '<input type="hidden" name="sesskey" value="' . sesskey() . '">';

echo '<div class="form-group">';
echo '<label>' . get_string('templatename', 'local_customgradeexport') . ':</label>';
echo '<input type="text" name="templatename" class="form-control" required placeholder="' . get_string('templatenameplaceholder', 'local_customgradeexport') . '">';
echo '<small class="form-text text-muted">' . get_string('templatenamehelp', 'local_customgradeexport') . '</small>';
echo '</div>';

echo '<div class="form-group">';
echo '<label>' . get_string('selecttemplatefile', 'local_customgradeexport') . ':</label>';
echo '<input type="file" name="template" class="form-control" accept=".xls,.xlsx,.docx" required>';
echo '<small class="form-text text-muted">';
echo get_string('acceptedformats', 'local_customgradeexport') . ': .xls, .xlsx, .docx<br>';
echo get_string('maxfilesize', 'local_customgradeexport') . ': ' . display_size(get_max_upload_file_size());
echo '</small>';
echo '</div>';

echo '<button type="submit" class="btn btn-primary">' . get_string('uploadtemplate', 'local_customgradeexport') . '</button>';
echo '</form>';

echo '</div>';
echo '</div>';

// Template instructions based on type
echo '<div class="card">';
echo '<div class="card-body">';
echo '<h5 class="card-title">' . get_string('templateinstructions', 'local_customgradeexport') . '</h5>';

if ($type === 'course') {
    // Course template instructions
    echo '<p>' . get_string('coursetemplateinstructions', 'local_customgradeexport') . '</p>';

    echo '<h6>' . get_string('availablevariables', 'local_customgradeexport') . '</h6>';
    echo '<table class="table table-sm table-bordered">';
    echo '<thead><tr><th>' . get_string('variable', 'local_customgradeexport') . '</th><th>' . get_string('description', 'local_customgradeexport') . '</th></tr></thead>';
    echo '<tbody>';
    echo '<tr><td><code>${coursename}</code></td><td>' . get_string('var_coursename', 'local_customgradeexport') . '</td></tr>';
    echo '<tr><td><code>${exportdate}</code></td><td>' . get_string('var_exportdate', 'local_customgradeexport') . '</td></tr>';
    echo '<tr><td><code>${exporttime}</code></td><td>' . get_string('var_exporttime', 'local_customgradeexport') . '</td></tr>';
    echo '</tbody>';
    echo '</table>';

    echo '<h6>' . get_string('dynamiccolumns', 'local_customgradeexport') . '</h6>';
    echo '<p>' . get_string('dynamiccolumnshelp', 'local_customgradeexport') . '</p>';

    echo '<h6>' . get_string('exampletemplate', 'local_customgradeexport') . '</h6>';
    echo '<p>' . get_string('downloadexampletemplate', 'local_customgradeexport') . ': ';

    $exampleurl = new moodle_url('/local/customgradeexport/example_templates/course_template_example.xlsx');
    echo html_writer::link($exampleurl, get_string('downloadexample', 'local_customgradeexport'), ['class' => 'btn btn-sm btn-secondary']);
    echo '</p>';
} else {
    // Quiz/Assignment template instructions
    $variables = \local_customgradeexport\template_processor::get_available_variables($type);

    echo '<p>' . get_string('activitytemplateinstructions', 'local_customgradeexport') . '</p>';

    echo '<table class="table table-bordered table-sm">';
    echo '<thead><tr><th>' . get_string('variable', 'local_customgradeexport') . '</th><th>' . get_string('description', 'local_customgradeexport') . '</th></tr></thead>';
    echo '<tbody>';
    foreach ($variables as $var => $desc) {
        echo '<tr>';
        echo '<td><code>${' . $var . '}</code></td>';
        echo '<td>' . $desc . '</td>';
        echo '</tr>';
    }
    echo '</tbody>';
    echo '</table>';
}

echo '</div>';
echo '</div>';

echo $OUTPUT->footer();
