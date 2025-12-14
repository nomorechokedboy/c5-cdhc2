<?php
/**
 * Template management page
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

require_login();

$type = required_param('type', PARAM_ALPHA); // 'quiz' or 'assign'
$action = optional_param('action', '', PARAM_ALPHA);

// Check capability
$context = context_system::instance();
require_capability('local/customgradeexport:uploadtemplate', $context);

$PAGE->set_context($context);
$PAGE->set_url('/local/customgradeexport/upload_template.php', ['type' => $type]);
$PAGE->set_title(get_string('templatemanagement', 'local_customgradeexport'));
$PAGE->set_heading(get_string('templatemanagement', 'local_customgradeexport'));
$PAGE->set_pagelayout('admin');

// Handle actions
if ($action === 'delete' && confirm_sesskey()) {
    if (\local_customgradeexport\template_processor::delete_template($type)) {
        redirect($PAGE->url, 'Template deleted successfully', null, \core\output\notification::NOTIFY_SUCCESS);
    } else {
        redirect($PAGE->url, 'Failed to delete template', null, \core\output\notification::NOTIFY_ERROR);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['template'])) {
    require_sesskey();
    
    if (\local_customgradeexport\template_processor::save_template($type, $_FILES['template'])) {
        redirect($PAGE->url, get_string('templateuploaded', 'local_customgradeexport'), null, \core\output\notification::NOTIFY_SUCCESS);
    } else {
        $error = 'Failed to upload template. Please ensure it is a valid DOCX file.';
    }
}

echo $OUTPUT->header();

echo $OUTPUT->heading(get_string('templatemanagement', 'local_customgradeexport'));

// Show tabs for quiz/assign
$tabs = [];
$tabs[] = new tabobject('quiz', 
    new moodle_url('/local/customgradeexport/upload_template.php', ['type' => 'quiz']),
    get_string('quiztemplate', 'local_customgradeexport')
);
$tabs[] = new tabobject('assign', 
    new moodle_url('/local/customgradeexport/upload_template.php', ['type' => 'assign']),
    get_string('assigntemplate', 'local_customgradeexport')
);

echo $OUTPUT->tabtree($tabs, $type);

// Show error if any
if (isset($error)) {
    echo $OUTPUT->notification($error, \core\output\notification::NOTIFY_ERROR);
}

// Current template status
echo '<div class="card mb-3">';
echo '<div class="card-body">';
echo '<h5 class="card-title">' . get_string('currenttemplate', 'local_customgradeexport') . '</h5>';

$hasTemplate = \local_customgradeexport\template_processor::has_template($type);
if ($hasTemplate) {
    $templatePath = \local_customgradeexport\template_processor::get_template_path($type);
    echo '<p class="alert alert-success"><i class="fa fa-check"></i> Template file exists</p>';
    echo '<p><strong>File:</strong> ' . basename($templatePath) . '</p>';
    echo '<p><strong>Size:</strong> ' . number_format(filesize($templatePath) / 1024, 2) . ' KB</p>';
    echo '<p><strong>Modified:</strong> ' . userdate(filemtime($templatePath)) . '</p>';
    
    // Delete button
    $deleteurl = new moodle_url('/local/customgradeexport/upload_template.php', [
        'type' => $type,
        'action' => 'delete',
        'sesskey' => sesskey()
    ]);
    echo $OUTPUT->single_button($deleteurl, 'Delete Template', 'get', ['class' => 'btn-danger']);
} else {
    echo '<p class="alert alert-warning"><i class="fa fa-exclamation-triangle"></i> ' . get_string('notemplate', 'local_customgradeexport') . '</p>';
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
echo '<label>Select DOCX template file:</label>';
echo '<input type="file" name="template" class="form-control" accept=".docx" required>';
echo '<small class="form-text text-muted">Maximum file size: ' . display_size(get_max_upload_file_size()) . '</small>';
echo '</div>';
echo '<button type="submit" class="btn btn-primary">Upload Template</button>';
echo '</form>';

echo '</div>';
echo '</div>';

// Template instructions
echo '<div class="card">';
echo '<div class="card-body">';
echo '<h5 class="card-title">Template Instructions</h5>';

echo '<p>Create a DOCX template with placeholders for dynamic content. Use the following variables:</p>';

$variables = \local_customgradeexport\template_processor::get_available_variables($type);

echo '<table class="table table-bordered table-sm">';
echo '<thead><tr><th>Variable</th><th>Description</th></tr></thead>';
echo '<tbody>';
foreach ($variables as $var => $desc) {
    echo '<tr>';
    echo '<td><code>${' . $var . '}</code></td>';
    echo '<td>' . $desc . '</td>';
    echo '</tr>';
}
echo '</tbody>';
echo '</table>';

echo '<h6>Example Template Structure:</h6>';
echo '<pre style="background: #f5f5f5; padding: 10px; border: 1px solid #ddd;">';
echo 'Grade Report for ${coursename}
Activity: ${activityname}
Exported on: ${exportdate} at ${exporttime}

Student Grades:
First Name: ${firstname}
Last Name: ${lastname}
ID Number: ${idnumber}
Institution: ${institution}
Department: ${department}
Grade: ${grade} / ${outof} (${percentage})
</pre>';

echo '<h6>For Table Data:</h6>';
echo '<p>Create a table in your DOCX with one row containing variable placeholders. The plugin will clone this row for each student:</p>';
echo '<pre style="background: #f5f5f5; padding: 10px; border: 1px solid #ddd;">';
echo '| ${firstname} | ${lastname} | ${grade} | ${percentage} |
</pre>';

echo '</div>';
echo '</div>';

echo $OUTPUT->footer();
