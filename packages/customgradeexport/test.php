<?php
/**
 * Test page for custom grade export plugin
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

require_login();

$PAGE->set_context(context_system::instance());
$PAGE->set_url('/local/customgradeexport/test.php');
$PAGE->set_title('Custom Grade Export - Test Page');
$PAGE->set_heading('Custom Grade Export - Test Page');

echo $OUTPUT->header();

echo html_writer::tag('h2', 'Plugin Installation Test');

// Check if plugin is installed
$pluginman = core_plugin_manager::instance();
$plugin = $pluginman->get_plugin_info('local_customgradeexport');

if ($plugin) {
    echo html_writer::div('✓ Plugin is installed', 'alert alert-success');
    echo html_writer::tag('p', 'Version: ' . $plugin->versiondisk);
    echo html_writer::tag('p', 'Release: ' . $plugin->release);
} else {
    echo html_writer::div('✗ Plugin is NOT installed', 'alert alert-danger');
}

// Check capabilities
echo html_writer::tag('h3', 'Capability Check');
$context = context_system::instance();
if (has_capability('local/customgradeexport:export', $context)) {
    echo html_writer::div('✓ You have export capability', 'alert alert-success');
} else {
    echo html_writer::div('✗ You do NOT have export capability', 'alert alert-warning');
}

// Check for quiz and assignment modules
echo html_writer::tag('h3', 'Find Quiz/Assignment to Test');

echo html_writer::tag('p', 'To test the export functionality, go to any Quiz or Assignment activity.');

// List some quizzes and assignments if user has access
$courses = enrol_get_my_courses();
if (!empty($courses)) {
    echo html_writer::tag('h4', 'Your Courses with Activities:');
    
    foreach (array_slice($courses, 0, 5) as $course) {
        echo html_writer::tag('h5', $course->fullname);
        
        // Get quizzes
        $quizzes = $DB->get_records('quiz', ['course' => $course->id], '', '*', 0, 5);
        if ($quizzes) {
            echo html_writer::tag('strong', 'Quizzes:');
            echo '<ul>';
            foreach ($quizzes as $quiz) {
                $cm = get_coursemodule_from_instance('quiz', $quiz->id);
                $url = new moodle_url('/mod/quiz/view.php', ['id' => $cm->id]);
                $exporturl = new moodle_url('/local/customgradeexport/quiz_export.php', ['cmid' => $cm->id]);
                echo '<li>';
                echo html_writer::link($url, $quiz->name);
                echo ' - ';
                echo html_writer::link($exporturl, 'Export Grades', ['class' => 'btn btn-sm btn-secondary']);
                echo '</li>';
            }
            echo '</ul>';
        }
        
        // Get assignments
        $assigns = $DB->get_records('assign', ['course' => $course->id], '', '*', 0, 5);
        if ($assigns) {
            echo html_writer::tag('strong', 'Assignments:');
            echo '<ul>';
            foreach ($assigns as $assign) {
                $cm = get_coursemodule_from_instance('assign', $assign->id);
                $url = new moodle_url('/mod/assign/view.php', ['id' => $cm->id]);
                $exporturl = new moodle_url('/local/customgradeexport/assign_export.php', ['cmid' => $cm->id]);
                echo '<li>';
                echo html_writer::link($url, $assign->name);
                echo ' - ';
                echo html_writer::link($exporturl, 'Export Grades', ['class' => 'btn btn-sm btn-secondary']);
                echo '</li>';
            }
            echo '</ul>';
        }
    }
}

// Debug information
echo html_writer::tag('h3', 'Debug Information');
echo '<pre>';
echo "Moodle version: " . $CFG->version . "\n";
echo "Plugin directory: " . __DIR__ . "\n";
echo "Plugin installed: " . ($plugin ? 'Yes' : 'No') . "\n";

// Check if callbacks exist
echo "\nCallbacks check:\n";
echo "extend_settings_navigation: " . (function_exists('local_customgradeexport_extend_settings_navigation') ? 'Yes' : 'No') . "\n";
echo "before_footer: " . (function_exists('local_customgradeexport_before_footer') ? 'Yes' : 'No') . "\n";

// Check helper classes
echo "\nHelper classes:\n";
echo "quiz_export_helper: " . (class_exists('\\local_customgradeexport\\quiz_export_helper') ? 'Yes' : 'No') . "\n";
echo "assign_export_helper: " . (class_exists('\\local_customgradeexport\\assign_export_helper') ? 'Yes' : 'No') . "\n";

echo '</pre>';

echo $OUTPUT->footer();
