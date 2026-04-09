<?php

/**
 * Plugin version
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_customgradeexport';
$plugin->version   = 2026040202;   // S3 migration via scheduled task + status field
$plugin->requires  = 2024042200;   // Moodle 5.0+
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.2.0';
