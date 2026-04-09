<?php

/**
 * AJAX endpoint: test S3 / MinIO connectivity.
 *
 * Performs a real PUT → GET → DELETE round-trip with a tiny probe object
 * so every credential and permission is verified in one call.
 *
 * Returns JSON: { success: bool, message: string }
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../config.php');

require_login();
require_sesskey();

$context = context_system::instance();
require_capability('local/customgradeexport:uploadtemplate', $context);

header('Content-Type: application/json');

$respond = static function (bool $success, string $message): void {
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
};

$s3 = new \local_customgradeexport\s3_client();

if (!$s3->is_configured()) {
    $respond(false, get_string('s3test_not_configured', 'local_customgradeexport'));
}

$key     = 'templates/.connection_test_' . time();
$payload = 'local_customgradeexport connection test';
$mime    = 'text/plain';

// ── PUT ───────────────────────────────────────────────────────────────────
if (!$s3->put_object($key, $payload, $mime)) {
    $respond(false, get_string('s3test_put_failed', 'local_customgradeexport'));
}

// ── GET ───────────────────────────────────────────────────────────────────
$fetched = $s3->get_object($key);
if ($fetched === false) {
    // Clean up best-effort before reporting failure.
    $s3->delete_object($key);
    $respond(false, get_string('s3test_get_failed', 'local_customgradeexport'));
}

if ($fetched !== $payload) {
    $s3->delete_object($key);
    $respond(false, get_string('s3test_content_mismatch', 'local_customgradeexport'));
}

// ── DELETE ────────────────────────────────────────────────────────────────
if (!$s3->delete_object($key)) {
    // Not a fatal error — the probe object is tiny and harmless, but tell the
    // admin so they know the access key may lack delete permission.
    $respond(true, get_string('s3test_delete_warning', 'local_customgradeexport'));
}

$respond(true, get_string('s3test_ok', 'local_customgradeexport'));
