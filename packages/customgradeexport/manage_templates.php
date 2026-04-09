<?php

/**
 * Template management page.
 *
 * Actions handled (POST unless noted):
 *   migrate_all      — queue all 'local' templates for S3 migration
 *   retry_all        — re-queue all 'migration_failed' templates
 *   retry_one        — re-queue a single failed/stuck template (id param)
 *   cleanup          — delete local files for all 'migrated' templates (sync)
 *   upload           — save a new template
 *   update           — update name and/or file of an existing template
 *   delete (GET+POST) — delete a template entirely
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

require_login();

$type   = required_param('type',   PARAM_ALPHA);
$action = optional_param('action', '', PARAM_ALPHANUMEXT);
$tplid  = optional_param('id',     '', PARAM_ALPHANUMEXT);
$rowid  = optional_param('rowid',  0,  PARAM_INT);

if (!in_array($type, ['quiz', 'assign', 'course'], true)) {
    throw new moodle_exception('invalidparameter', 'error');
}

$context = context_system::instance();
require_capability('local/customgradeexport:uploadtemplate', $context);

$PAGE->set_context($context);
$PAGE->set_url('/local/customgradeexport/manage_templates.php', ['type' => $type]);
$PAGE->set_title(get_string('templatemanagement', 'local_customgradeexport'));
$PAGE->set_heading(get_string('templatemanagement', 'local_customgradeexport'));
$PAGE->set_pagelayout('admin');

use local_customgradeexport\template_manager as TM;

$notification = null;

// ── POST actions ───────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_sesskey();

    switch ($action) {

        // ── Migration actions ────────────────────────────────────────────
        case 'migrate_all':
            $n = TM::queue_all_for_migration();
            redirect(
                $PAGE->url,
                get_string('migration_queued', 'local_customgradeexport', $n),
                null,
                \core\output\notification::NOTIFY_SUCCESS
            );

        case 'retry_all':
            $n = TM::retry_all_failed();
            redirect(
                $PAGE->url,
                get_string('migration_retried', 'local_customgradeexport', $n),
                null,
                \core\output\notification::NOTIFY_SUCCESS
            );

        case 'retry_one':
            if ($rowid && TM::retry_migration($rowid)) {
                redirect(
                    $PAGE->url,
                    get_string('migration_retry_queued', 'local_customgradeexport'),
                    null,
                    \core\output\notification::NOTIFY_SUCCESS
                );
            }
            redirect(
                $PAGE->url,
                get_string('migration_retry_failed', 'local_customgradeexport'),
                null,
                \core\output\notification::NOTIFY_ERROR
            );

        case 'cleanup':
            $result = TM::cleanup_migrated();
            $msg    = get_string('cleanup_result', 'local_customgradeexport', $result);
            $level  = $result['failed'] > 0
                ? \core\output\notification::NOTIFY_WARNING
                : \core\output\notification::NOTIFY_SUCCESS;
            redirect($PAGE->url, $msg, null, $level);

            // ── Template CRUD ────────────────────────────────────────────────
        case 'upload':
            $name = required_param('templatename', PARAM_TEXT);
            if (!isset($_FILES['template']) || $_FILES['template']['error'] !== UPLOAD_ERR_OK) {
                $notification = ['type' => 'error', 'msg' => get_string('templateuploadfailed', 'local_customgradeexport')];
                break;
            }
            try {
                $id = TM::save_template($type, $name, $_FILES['template']);
                if ($id) {
                    redirect(
                        $PAGE->url,
                        get_string('templateuploaded', 'local_customgradeexport'),
                        null,
                        \core\output\notification::NOTIFY_SUCCESS
                    );
                }
                $notification = ['type' => 'error', 'msg' => get_string('templateuploadfailed', 'local_customgradeexport')];
            } catch (\moodle_exception $e) {
                $notification = ['type' => 'error', 'msg' => $e->getMessage()];
            }
            break;

        case 'update':
            $newName    = required_param('templatename', PARAM_TEXT);
            $newContent = null;
            $newExt     = null;

            if (isset($_FILES['template']) && $_FILES['template']['error'] === UPLOAD_ERR_OK) {
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mime  = finfo_file($finfo, $_FILES['template']['tmp_name']);
                finfo_close($finfo);
                $extMap = [
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'       => 'xlsx',
                    'application/vnd.ms-excel'                                                 => 'xls',
                ];
                if (!isset($extMap[$mime])) {
                    $notification = ['type' => 'error', 'msg' => get_string('templateuploadfailed', 'local_customgradeexport')];
                    break;
                }
                $newContent = file_get_contents($_FILES['template']['tmp_name']);
                $newExt     = $extMap[$mime];
            }

            try {
                if (TM::update_template($type, $tplid, $newName, $newContent, $newExt)) {
                    redirect(
                        $PAGE->url,
                        get_string('templateupdated', 'local_customgradeexport'),
                        null,
                        \core\output\notification::NOTIFY_SUCCESS
                    );
                }
                $notification = ['type' => 'error', 'msg' => get_string('templateupdatefailed', 'local_customgradeexport')];
            } catch (\moodle_exception $e) {
                $notification = ['type' => 'error', 'msg' => $e->getMessage()];
            }
            break;

        case 'delete':
            if (TM::delete_template($type, $tplid)) {
                redirect(
                    $PAGE->url,
                    get_string('templatedeleted', 'local_customgradeexport'),
                    null,
                    \core\output\notification::NOTIFY_SUCCESS
                );
            }
            redirect(
                $PAGE->url,
                get_string('templatedeletefailed', 'local_customgradeexport'),
                null,
                \core\output\notification::NOTIFY_ERROR
            );
    }
}

// ── GET delete ─────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'delete' && $tplid !== '' && confirm_sesskey()) {
    if (TM::delete_template($type, $tplid)) {
        redirect(
            $PAGE->url,
            get_string('templatedeleted', 'local_customgradeexport'),
            null,
            \core\output\notification::NOTIFY_SUCCESS
        );
    }
    redirect(
        $PAGE->url,
        get_string('templatedeletefailed', 'local_customgradeexport'),
        null,
        \core\output\notification::NOTIFY_ERROR
    );
}

// ── Data for render ────────────────────────────────────────────────────────
$s3ok      = (new \local_customgradeexport\s3_client())->is_configured();
$counts    = TM::get_migration_status_counts();
$templates = TM::get_templates($type);
$failed    = TM::get_failed_records();
$stuck     = TM::get_stuck_records();
$migrated  = TM::get_migrated_records();

// ── Render ─────────────────────────────────────────────────────────────────
echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('templatemanagement', 'local_customgradeexport'));

if ($notification) {
    echo $OUTPUT->notification(
        $notification['msg'],
        $notification['type'] === 'error'
            ? \core\output\notification::NOTIFY_ERROR
            : \core\output\notification::NOTIFY_SUCCESS
    );
}

// ── S3 config warning ──────────────────────────────────────────────────────
if (!$s3ok) {
    $settingsurl = new moodle_url('/admin/settings.php', ['section' => 'local_customgradeexport']);
    echo $OUTPUT->notification(
        get_string('s3notconfigured_warn', 'local_customgradeexport', $settingsurl->out()),
        \core\output\notification::NOTIFY_WARNING
    );
}

// ── Tabs ───────────────────────────────────────────────────────────────────
$tabs = [
    new tabobject('quiz',   new moodle_url($PAGE->url, ['type' => 'quiz']),   get_string('quiztemplates',   'local_customgradeexport')),
    new tabobject('assign', new moodle_url($PAGE->url, ['type' => 'assign']), get_string('assigntemplates', 'local_customgradeexport')),
    new tabobject('course', new moodle_url($PAGE->url, ['type' => 'course']), get_string('coursetemplates',  'local_customgradeexport')),
];
echo $OUTPUT->tabtree($tabs, $type);

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — Migration status overview (only shown when S3 is configured)
// ═══════════════════════════════════════════════════════════════════════════
if ($s3ok) {
    $total = array_sum(array_filter($counts, fn($k) => $k !== 'stuck', ARRAY_FILTER_USE_KEY));

    echo '<div class="card mb-4">';
    echo '<div class="card-header d-flex justify-content-between align-items-center">';
    echo '<h5 class="mb-0">' . get_string('migration_status', 'local_customgradeexport') . '</h5>';
    echo '</div>';
    echo '<div class="card-body">';

    // Status summary pills
    echo '<div class="d-flex flex-wrap gap-3 mb-3">';
    $pillMap = [
        TM::STATUS_LOCAL            => ['secondary', get_string('status_local',            'local_customgradeexport')],
        TM::STATUS_MIGRATING        => ['primary',   get_string('status_migrating',        'local_customgradeexport')],
        TM::STATUS_MIGRATION_FAILED => ['danger',    get_string('status_migration_failed', 'local_customgradeexport')],
        TM::STATUS_MIGRATED         => ['info',      get_string('status_migrated',         'local_customgradeexport')],
        TM::STATUS_S3               => ['success',   get_string('status_s3',               'local_customgradeexport')],
    ];
    foreach ($pillMap as $status => [$colour, $label]) {
        echo '<span class="badge bg-' . $colour . ' fs-6 px-3 py-2">'
            . $label . ': ' . $counts[$status]
            . '</span>';
    }
    if ($counts['stuck'] > 0) {
        echo '<span class="badge bg-warning text-dark fs-6 px-3 py-2">'
            . get_string('status_stuck', 'local_customgradeexport') . ': ' . $counts['stuck']
            . '</span>';
    }
    echo '</div>';

    // ── Migrate all (local → migrating) ──────────────────────────────────
    if ($counts[TM::STATUS_LOCAL] > 0) {
        echo '<form method="post" class="d-inline me-2">';
        echo '<input type="hidden" name="sesskey" value="' . sesskey() . '">';
        echo '<input type="hidden" name="action"  value="migrate_all">';
        echo '<button type="submit" class="btn btn-primary">';
        echo '<i class="fa fa-cloud-upload"></i> ';
        echo get_string('migrate_all', 'local_customgradeexport', $counts[TM::STATUS_LOCAL]);
        echo '</button></form>';
    }

    // ── Cleanup (migrated → s3) ───────────────────────────────────────────
    if ($counts[TM::STATUS_MIGRATED] > 0) {
        echo '<form method="post" class="d-inline me-2">';
        echo '<input type="hidden" name="sesskey" value="' . sesskey() . '">';
        echo '<input type="hidden" name="action"  value="cleanup">';
        echo '<button type="submit" class="btn btn-warning">';
        echo '<i class="fa fa-trash-o"></i> ';
        echo get_string('cleanup_local', 'local_customgradeexport', $counts[TM::STATUS_MIGRATED]);
        echo '</button></form>';
    }

    echo '</div></div>'; // card

    // ── Failed / stuck table ──────────────────────────────────────────────
    $problemRecords = array_merge(
        array_map(fn($r) => [$r, 'failed'], $failed),
        array_map(fn($r) => [$r, 'stuck'],  $stuck)
    );

    if (!empty($problemRecords)) {
        echo '<div class="card mb-4 border-danger">';
        echo '<div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">';
        echo '<h5 class="mb-0">' . get_string('migration_problems', 'local_customgradeexport') . '</h5>';

        // Retry all failed button
        if (!empty($failed)) {
            echo '<form method="post">';
            echo '<input type="hidden" name="sesskey" value="' . sesskey() . '">';
            echo '<input type="hidden" name="action"  value="retry_all">';
            echo '<button type="submit" class="btn btn-light btn-sm">';
            echo '<i class="fa fa-refresh"></i> ' . get_string('retry_all_failed', 'local_customgradeexport');
            echo '</button></form>';
        }

        echo '</div>';
        echo '<div class="card-body p-0">';
        echo '<table class="table table-sm mb-0">';
        echo '<thead class="table-light"><tr>';
        echo '<th>' . get_string('templatename', 'local_customgradeexport') . '</th>';
        echo '<th>' . get_string('type',         'local_customgradeexport') . '</th>';
        echo '<th>' . get_string('problem',       'local_customgradeexport') . '</th>';
        echo '<th>' . get_string('actions',       'local_customgradeexport') . '</th>';
        echo '</tr></thead><tbody>';

        foreach ($problemRecords as [$rec, $kind]) {
            $problemLabel = $kind === 'stuck'
                ? get_string('problem_stuck',  'local_customgradeexport')
                : get_string('problem_failed', 'local_customgradeexport');
            $rowClass = $kind === 'stuck' ? 'table-warning' : 'table-danger';

            echo '<tr class="' . $rowClass . '">';
            echo '<td>' . s($rec->name) . '</td>';
            echo '<td>' . s($rec->type) . '</td>';
            echo '<td>' . $problemLabel . '</td>';
            echo '<td>';
            echo '<form method="post" class="d-inline">';
            echo '<input type="hidden" name="sesskey" value="' . sesskey() . '">';
            echo '<input type="hidden" name="action"  value="retry_one">';
            echo '<input type="hidden" name="rowid"   value="' . (int) $rec->id . '">';
            echo '<button type="submit" class="btn btn-sm btn-outline-primary">';
            echo '<i class="fa fa-refresh"></i> ' . get_string('retry', 'local_customgradeexport');
            echo '</button></form>';
            echo '</td></tr>';
        }

        echo '</tbody></table>';
        echo '</div></div>'; // card
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — Template list
// ═══════════════════════════════════════════════════════════════════════════
echo '<div class="card mb-4">';
echo '<div class="card-header"><h5 class="mb-0">' . get_string('existingtemplates', 'local_customgradeexport') . '</h5></div>';
echo '<div class="card-body">';

$statusBadge = static function (string $status): string {
    $map = [
        TM::STATUS_LOCAL            => ['secondary', 'status_local'],
        TM::STATUS_MIGRATING        => ['primary',   'status_migrating'],
        TM::STATUS_MIGRATION_FAILED => ['danger',    'status_migration_failed'],
        TM::STATUS_MIGRATED         => ['info',      'status_migrated'],
        TM::STATUS_S3               => ['success',   'status_s3'],
    ];
    [$colour, $strkey] = $map[$status] ?? ['secondary', 'status_local'];
    return '<span class="badge bg-' . $colour . '">'
        . get_string($strkey, 'local_customgradeexport')
        . '</span>';
};

if (!empty($templates)) {
    echo '<div class="table-responsive">';
    echo '<table class="table table-striped align-middle mb-0">';
    echo '<thead class="table-light"><tr>';
    echo '<th>' . get_string('templatename', 'local_customgradeexport') . '</th>';
    echo '<th>' . get_string('format',       'local_customgradeexport') . '</th>';
    echo '<th>' . get_string('size',         'local_customgradeexport') . '</th>';
    echo '<th>' . get_string('status',       'local_customgradeexport') . '</th>';
    echo '<th>' . get_string('modified',     'local_customgradeexport') . '</th>';
    echo '<th>' . get_string('actions',      'local_customgradeexport') . '</th>';
    echo '</tr></thead><tbody>';

    foreach ($templates as $id => $tpl) {
        $isEditing = ($action === 'edit' && $tplid === $id);

        echo '<tr' . ($isEditing ? ' class="table-warning"' : '') . '>';
        echo '<td><strong>' . s($tpl['name']) . '</strong></td>';
        echo '<td>' . strtoupper($tpl['ext']) . '</td>';
        echo '<td>' . display_size($tpl['size']) . '</td>';
        echo '<td>' . $statusBadge($tpl['status']) . '</td>';
        echo '<td>' . userdate($tpl['modified']) . '</td>';
        echo '<td class="text-nowrap">';

        // Download
        $dlurl = new moodle_url('/local/customgradeexport/download_template.php', [
            'type' => $type,
            'templateid' => $id,
        ]);
        echo html_writer::link(
            $dlurl,
            '<i class="fa fa-download"></i> ' . get_string('download', 'local_customgradeexport'),
            ['class' => 'btn btn-sm btn-outline-secondary me-1']
        );

        // Edit
        if (!$isEditing) {
            $editurl = new moodle_url($PAGE->url, ['action' => 'edit', 'id' => $id]);
            echo html_writer::link(
                $editurl,
                '<i class="fa fa-pencil"></i> ' . get_string('edit'),
                ['class' => 'btn btn-sm btn-outline-primary me-1']
            );
        }

        // Delete
        $delurl = new moodle_url($PAGE->url, [
            'action' => 'delete',
            'id' => $id,
            'sesskey' => sesskey(),
        ]);
        echo html_writer::link(
            $delurl,
            '<i class="fa fa-trash"></i> ' . get_string('delete'),
            [
                'class'   => 'btn btn-sm btn-danger',
                'onclick' => 'return confirm(' . json_encode(get_string('confirmdelete', 'local_customgradeexport')) . ');',
            ]
        );

        echo '</td></tr>';

        // ── Inline edit form ──────────────────────────────────────────────
        if ($isEditing) {
            echo '<tr class="table-warning"><td colspan="6">';
            echo '<form method="post" enctype="multipart/form-data" class="p-2">';
            echo '<input type="hidden" name="sesskey" value="' . sesskey() . '">';
            echo '<input type="hidden" name="action"  value="update">';
            echo '<input type="hidden" name="id"      value="' . s($id) . '">';

            echo '<div class="row g-3 align-items-end">';

            echo '<div class="col-md-4">';
            echo '<label class="form-label fw-semibold">' . get_string('templatename', 'local_customgradeexport') . '</label>';
            echo '<input type="text" name="templatename" class="form-control" value="' . s($tpl['name']) . '" required>';
            echo '</div>';

            echo '<div class="col-md-5">';
            echo '<label class="form-label fw-semibold">' . get_string('replacefile', 'local_customgradeexport') . '</label>';
            echo '<input type="file" name="template" class="form-control" accept=".xls,.xlsx,.docx">';
            echo '<div class="form-text">' . get_string('replacefilehelp', 'local_customgradeexport') . '</div>';
            echo '</div>';

            echo '<div class="col-md-3 d-flex gap-2">';
            echo '<button type="submit" class="btn btn-primary"><i class="fa fa-save"></i> ' . get_string('savechanges') . '</button>';
            echo html_writer::link($PAGE->url, get_string('cancel'), ['class' => 'btn btn-secondary']);
            echo '</div>';

            echo '</div></form></td></tr>';
        }
    }

    echo '</tbody></table>';
    echo '</div>'; // table-responsive
} else {
    echo '<p class="alert alert-info mb-0">' . get_string('notemplatesyet', 'local_customgradeexport') . '</p>';
}

echo '</div></div>'; // card

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — Upload new template
// ═══════════════════════════════════════════════════════════════════════════
echo '<div class="card mb-4">';
echo '<div class="card-header"><h5 class="mb-0">' . get_string('uploadnewtemplate', 'local_customgradeexport') . '</h5></div>';
echo '<div class="card-body">';

echo '<form method="post" enctype="multipart/form-data">';
echo '<input type="hidden" name="sesskey" value="' . sesskey() . '">';
echo '<input type="hidden" name="action"  value="upload">';

echo '<div class="row g-3">';

echo '<div class="col-md-4">';
echo '<label class="form-label">' . get_string('templatename', 'local_customgradeexport') . '</label>';
echo '<input type="text" name="templatename" class="form-control" required'
    . ' placeholder="' . s(get_string('templatenameplaceholder', 'local_customgradeexport')) . '">';
echo '<div class="form-text">' . get_string('templatenamehelp', 'local_customgradeexport') . '</div>';
echo '</div>';

echo '<div class="col-md-5">';
echo '<label class="form-label">' . get_string('selecttemplatefile', 'local_customgradeexport') . '</label>';
echo '<input type="file" name="template" class="form-control" accept=".xls,.xlsx,.docx" required>';
echo '<div class="form-text">';
echo get_string('acceptedformats', 'local_customgradeexport') . ': .xls, .xlsx, .docx &nbsp;|&nbsp; ';
echo get_string('maxfilesize', 'local_customgradeexport') . ': ' . display_size(get_max_upload_file_size());
echo '</div>';
echo '</div>';

echo '<div class="col-md-3 d-flex align-items-end">';
echo '<button type="submit" class="btn btn-primary">'
    . '<i class="fa fa-upload"></i> ' . get_string('uploadtemplate', 'local_customgradeexport')
    . '</button>';
echo '</div>';

echo '</div></form>';
echo '</div></div>'; // card

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4 — Template variable reference
// ═══════════════════════════════════════════════════════════════════════════
echo '<div class="card">';
echo '<div class="card-header"><h5 class="mb-0">' . get_string('templateinstructions', 'local_customgradeexport') . '</h5></div>';
echo '<div class="card-body">';
echo \local_customgradeexport\template_processor::get_template_instructions($type);
echo '</div></div>';

echo $OUTPUT->footer();
