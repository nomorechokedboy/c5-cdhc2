<?php
/**
 * Library functions
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Get user's institution from built-in user field
 * 
 * @param int $userid User ID
 * @return string Institution name
 */
function local_customgradeexport_get_institution($userid)
{
    global $DB;

    $user = $DB->get_record('user', ['id' => $userid], 'institution');

    return $user && !empty($user->institution) ? $user->institution : '';
}

/**
 * Get user's department from built-in user field
 * 
 * @param int $userid User ID
 * @return string Department name
 */
function local_customgradeexport_get_department($userid)
{
    global $DB;

    $user = $DB->get_record('user', ['id' => $userid], 'department');

    return $user && !empty($user->department) ? $user->department : '';
}

/**
 * Get both institution and department in one query (more efficient)
 * 
 * @param int $userid User ID
 * @return object Object with institution and department properties
 */
function local_customgradeexport_get_user_org_data($userid)
{
    global $DB;

    $user = $DB->get_record('user', ['id' => $userid], 'institution, department');

    if (!$user) {
        return (object)['institution' => '', 'department' => ''];
    }

    return (object)[
        'institution' => $user->institution ?: '',
        'department' => $user->department ?: ''
    ];
}

/**
 * Extend settings navigation - Main callback for adding export link
 * 
 * @param settings_navigation $settingsnav Settings navigation object
 * @param context $context Context object
 */
function local_customgradeexport_extend_settings_navigation($settingsnav, $context)
{
    global $PAGE;
    
    // Debug logging to file
    $debug = false; // Set to true to enable debug logging
    $logfile = '/tmp/moodle_customexport_debug.log';
    
    if ($debug) {
        file_put_contents($logfile, "\n" . date('Y-m-d H:i:s') . " - extend_settings_navigation called\n", FILE_APPEND);
        file_put_contents($logfile, "Context level: " . $context->contextlevel . "\n", FILE_APPEND);
    }
    
    // Only in module context
    if ($context->contextlevel != CONTEXT_MODULE) {
        if ($debug) file_put_contents($logfile, "Not module context\n", FILE_APPEND);
        return;
    }

    $cm = $PAGE->cm;
    if (!$cm) {
        if ($debug) file_put_contents($logfile, "No cm found\n", FILE_APPEND);
        return;
    }
    
    if ($debug) file_put_contents($logfile, "Module: " . $cm->modname . "\n", FILE_APPEND);

    // Only for quiz and assignment
    if (!in_array($cm->modname, ['quiz', 'assign'])) {
        if ($debug) file_put_contents($logfile, "Not quiz/assign\n", FILE_APPEND);
        return;
    }

    // Check capabilities
    if (!has_capability('local/customgradeexport:export', $context)) {
        if ($debug) file_put_contents($logfile, "No export capability\n", FILE_APPEND);
        return;
    }

    $capability = ($cm->modname == 'quiz') ? 'mod/quiz:viewreports' : 'mod/assign:grade';
    if (!has_capability($capability, $context)) {
        if ($debug) file_put_contents($logfile, "No module capability\n", FILE_APPEND);
        return;
    }
    
    if ($debug) file_put_contents($logfile, "All checks passed, adding node\n", FILE_APPEND);

    // Create the export URL
    $url = new moodle_url('/local/customgradeexport/' . $cm->modname . '_export.php', ['cmid' => $cm->id]);

    // Method 1: Try to add to module settings
    if ($modulenode = $settingsnav->find('modulesettings', navigation_node::TYPE_SETTING)) {
        if ($debug) file_put_contents($logfile, "Adding to modulesettings\n", FILE_APPEND);
        $modulenode->add(
            get_string('exportgrades', 'local_customgradeexport'),
            $url,
            navigation_node::TYPE_SETTING,
            null,
            'customgradeexport',
            new pix_icon('i/download', '')
        );
    } else {
        // Method 2: Try different node names for quiz
        if ($cm->modname == 'quiz') {
            $possiblenodes = ['quiz', 'quizreports', 'results'];
            foreach ($possiblenodes as $nodename) {
                if ($node = $settingsnav->find($nodename, navigation_node::TYPE_SETTING)) {
                    if ($debug) file_put_contents($logfile, "Adding to $nodename node\n", FILE_APPEND);
                    $node->add(
                        get_string('exportgrades', 'local_customgradeexport'),
                        $url,
                        navigation_node::TYPE_SETTING,
                        null,
                        'customgradeexport',
                        new pix_icon('i/download', '')
                    );
                    break;
                }
            }
        }
    }
}

/**
 * Inject export button directly into page using JavaScript
 * This is a fallback method that always works
 */
function local_customgradeexport_before_footer()
{
    global $PAGE;
    
    // Only on quiz and assignment pages
    if (!$PAGE->cm || !in_array($PAGE->cm->modname, ['quiz', 'assign'])) {
        return;
    }
    
    $context = context_module::instance($PAGE->cm->id);
    
    // Check capabilities
    if (!has_capability('local/customgradeexport:export', $context)) {
        return;
    }
    
    $capability = ($PAGE->cm->modname == 'quiz') ? 'mod/quiz:viewreports' : 'mod/assign:grade';
    if (!has_capability($capability, $context)) {
        return;
    }
    
    // Create the export URL
    $url = new moodle_url('/local/customgradeexport/' . $PAGE->cm->modname . '_export.php', 
                          ['cmid' => $PAGE->cm->id]);
    
    $buttontext = get_string('exportgrades', 'local_customgradeexport');
    $urlout = $url->out(false);
    
    // Inject button via JavaScript - this will ALWAYS work
    $PAGE->requires->js_amd_inline("
        require(['jquery'], function($) {
            $(document).ready(function() {
                // Create export button with Moodle styling
                var exportButton = $('<div class=\"custom-export-wrapper\" style=\"margin: 15px 0; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;\">' +
                    '<a href=\"{$urlout}\" class=\"btn btn-secondary\" style=\"margin-right: 10px;\">' +
                    '<i class=\"icon fa fa-download fa-fw\"></i> {$buttontext}' +
                    '</a>' +
                    '<span class=\"text-muted\">Export grades with institution and department</span>' +
                    '</div>');
                
                var inserted = false;
                
                // For quiz: Try multiple insertion points
                if ($('.path-mod-quiz').length) {
                    // After quiz navigation tabs
                    if ($('.tertiary-navigation').length) {
                        $('.tertiary-navigation').after(exportButton);
                        inserted = true;
                    }
                    // After quiz attempts count
                    else if ($('.quizattemptcounts').length) {
                        $('.quizattemptcounts').after(exportButton);
                        inserted = true;
                    }
                    // Before quiz report table
                    else if ($('#mod_quiz_navblock').length) {
                        $('#mod_quiz_navblock').before(exportButton);
                        inserted = true;
                    }
                }
                
                // For assignment: Try multiple insertion points
                if (!inserted && $('.path-mod-assign').length) {
                    // After assignment header
                    if ($('.submissionstatustable').length) {
                        $('.submissionstatustable').before(exportButton);
                        inserted = true;
                    }
                    // At the top of grading table
                    else if ($('.gradingtable').length) {
                        $('.gradingtable').before(exportButton);
                        inserted = true;
                    }
                }
                
                // Fallback: Insert at the top of the page content
                if (!inserted) {
                    if ($('.region-main-box').length) {
                        $('.region-main-box').prepend(exportButton);
                        inserted = true;
                    } else if ($('.region-main').length) {
                        $('.region-main').prepend(exportButton);
                        inserted = true;
                    } else if ($('#region-main').length) {
                        $('#region-main').prepend(exportButton);
                        inserted = true;
                    }
                }
                
                // Debug: Alert if button wasn't inserted
                if (!inserted) {
                    console.log('Custom export button could not find insertion point');
                    // Last resort: append to body
                    $('body').prepend(exportButton);
                }
            });
        });
    ");
}

/**
 * Add to page header - Alternative method
 */
function local_customgradeexport_before_standard_html_head()
{
    global $PAGE;
    
    // Only on quiz and assignment pages
    if (!$PAGE->cm || !in_array($PAGE->cm->modname, ['quiz', 'assign'])) {
        return '';
    }
    
    $context = context_module::instance($PAGE->cm->id);
    
    // Check capabilities
    if (!has_capability('local/customgradeexport:export', $context)) {
        return '';
    }
    
    $capability = ($PAGE->cm->modname == 'quiz') ? 'mod/quiz:viewreports' : 'mod/assign:grade';
    if (!has_capability($capability, $context)) {
        return '';
    }
    
    // Add CSS to style the button
    $PAGE->requires->css('/local/customgradeexport/styles.css');
    
    return '';
}
