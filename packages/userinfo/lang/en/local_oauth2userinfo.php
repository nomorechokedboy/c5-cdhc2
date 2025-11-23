<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Language strings for local_oauth2userinfo
 *
 * @package    local_oauth2userinfo
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'OAuth2 User Info API';
$string['privacy:metadata'] = 'The OAuth2 User Info plugin does not store any personal data. It only provides an API endpoint to retrieve user information based on OAuth2 access tokens.';

// Error messages
$string['invalidtoken'] = 'Invalid or expired OAuth2 access token';
$string['tokenexpired'] = 'OAuth2 access token has expired';
$string['userdeleted'] = 'User account has been deleted';
$string['usersuspended'] = 'User account is suspended';

// Web service descriptions
$string['get_user_info'] = 'Get user information from OAuth2 token';
