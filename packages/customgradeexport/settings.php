<?php

/**
 * Admin settings for local_customgradeexport (S3 / MinIO storage).
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {

    $settings = new admin_settingpage(
        'local_customgradeexport',
        get_string('pluginname', 'local_customgradeexport')
    );

    $ADMIN->add('localplugins', $settings);

    if ($ADMIN->fulltree) {

        $settings->add(new admin_setting_heading(
            'local_customgradeexport/s3_heading',
            get_string('s3_heading', 'local_customgradeexport'),
            get_string('s3_heading_desc', 'local_customgradeexport')
        ));

        $settings->add(new admin_setting_configtext(
            'local_customgradeexport/s3_endpoint',
            get_string('s3_endpoint', 'local_customgradeexport'),
            get_string('s3_endpoint_desc', 'local_customgradeexport'),
            '',
            PARAM_RAW
        ));

        $settings->add(new admin_setting_configtext(
            'local_customgradeexport/s3_bucket',
            get_string('s3_bucket', 'local_customgradeexport'),
            get_string('s3_bucket_desc', 'local_customgradeexport'),
            'grade-export-templates',
            PARAM_TEXT
        ));

        $settings->add(new admin_setting_configtext(
            'local_customgradeexport/s3_region',
            get_string('s3_region', 'local_customgradeexport'),
            get_string('s3_region_desc', 'local_customgradeexport'),
            'us-east-1',
            PARAM_TEXT
        ));

        $settings->add(new admin_setting_configtext(
            'local_customgradeexport/s3_access_key',
            get_string('s3_access_key', 'local_customgradeexport'),
            '',
            '',
            PARAM_TEXT
        ));

        $settings->add(new admin_setting_configpasswordunmask(
            'local_customgradeexport/s3_secret_key',
            get_string('s3_secret_key', 'local_customgradeexport'),
            '',
            ''
        ));

        $settings->add(new admin_setting_configcheckbox(
            'local_customgradeexport/s3_path_style',
            get_string('s3_path_style', 'local_customgradeexport'),
            get_string('s3_path_style_desc', 'local_customgradeexport'),
            1
        ));

        // ── Connection test button ─────────────────────────────────────────
        // Placed after all credential fields so the admin can fill them in
        // and immediately verify without leaving the page.
        $settings->add(new \local_customgradeexport\admin_setting_s3_test());
    }
}
