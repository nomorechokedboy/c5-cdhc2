<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Web service definitions for local_oauth2userinfo
 *
 * @package    local_oauth2userinfo
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_oauth2userinfo_get_user_info' => [
        'classname'   => 'local_oauth2userinfo\external\get_oauth2_user_info',
        'methodname'  => 'get_oauth2_user_info',
        'description' => 'Get user information from OAuth2 access token',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => '', // No capability check - token validation is the authentication
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE],
        'loginrequired' => false, // Don't require Moodle login - OAuth2 token is used
    ],
];
