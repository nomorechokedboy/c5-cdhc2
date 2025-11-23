<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * External API for getting user info via OAuth2 token
 *
 * @package    local_oauth2userinfo
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oauth2userinfo\external;

defined('MOODLE_INTERNAL') || die();

require_once("$CFG->libdir/externallib.php");

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;
use context_system;

/**
 * External API class for getting OAuth2 user info
 *
 * @package    local_oauth2userinfo
 * @copyright  2025 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_oauth2_user_info extends external_api
{

    /**
     * Returns description of method parameters
     *
     * @return external_function_parameters
     */
    public static function get_oauth2_user_info_parameters()
    {
        return new external_function_parameters([
            'accesstoken' => new external_value(PARAM_TEXT, 'OAuth2 access token')
        ]);
    }

    /**
     * Get user info from OAuth2 access token
     *
     * @param string $accesstoken OAuth2 access token
     * @return array User information
     */
    public static function get_oauth2_user_info($accesstoken)
    {
        global $DB;

        // Parameter validation
        $params = self::validate_parameters(
            self::get_oauth2_user_info_parameters(),
            ['accesstoken' => $accesstoken]
        );

        // Validate context
        $context = context_system::instance();
        self::validate_context($context);

        // Look up the access token in oauth2_access_token table
        $tokenrecord = $DB->get_record(
            'oauth2_access_token',
            ['token' => $params['accesstoken']],
            'userid, issuerid, expires'
        );

        if (!$tokenrecord) {
            throw new \moodle_exception(
                'invalidtoken',
                'local_oauth2userinfo',
                '',
                null,
                'Access token not found or invalid'
            );
        }

        // Check if token is expired
        if ($tokenrecord->expires > 0 && $tokenrecord->expires < time()) {
            throw new \moodle_exception(
                'tokenexpired',
                'local_oauth2userinfo',
                '',
                null,
                'Access token has expired'
            );
        }

        // Get user information
        $user = $DB->get_record(
            'user',
            ['id' => $tokenrecord->userid],
            'id, username, firstname, lastname, email, idnumber, auth, suspended, deleted',
            MUST_EXIST
        );

        // Check if user is suspended or deleted
        if ($user->deleted) {
            throw new \moodle_exception(
                'userdeleted',
                'local_oauth2userinfo',
                '',
                null,
                'User account has been deleted'
            );
        }

        if ($user->suspended) {
            throw new \moodle_exception(
                'usersuspended',
                'local_oauth2userinfo',
                '',
                null,
                'User account is suspended'
            );
        }

        return [
            'userid' => $user->id,
            'username' => $user->username,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'idnumber' => $user->idnumber ?? '',
            'auth' => $user->auth,
            'suspended' => $user->suspended,
            'deleted' => $user->deleted,
        ];
    }

    /**
     * Returns description of method result value
     *
     * @return external_single_structure
     */
    public static function get_oauth2_user_info_returns()
    {
        return new external_single_structure([
            'userid' => new external_value(PARAM_INT, 'User ID'),
            'username' => new external_value(PARAM_TEXT, 'Username'),
            'firstname' => new external_value(PARAM_TEXT, 'First name'),
            'lastname' => new external_value(PARAM_TEXT, 'Last name'),
            'email' => new external_value(PARAM_EMAIL, 'Email address'),
            'idnumber' => new external_value(PARAM_TEXT, 'ID number'),
            'auth' => new external_value(PARAM_TEXT, 'Authentication method'),
            'suspended' => new external_value(PARAM_INT, 'Is user suspended (1=yes, 0=no)'),
            'deleted' => new external_value(PARAM_INT, 'Is user deleted (1=yes, 0=no)'),
        ]);
    }
}
