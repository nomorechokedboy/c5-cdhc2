<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * External API for getting user info via OAuth2 token or user ID
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
            'accesstoken' => new external_value(PARAM_TEXT, 'OAuth2 access token', VALUE_DEFAULT, ''),
            'userid' => new external_value(PARAM_INT, 'User ID', VALUE_DEFAULT, 0),
            'courseid' => new external_value(PARAM_INT, 'Course ID for role context (optional)', VALUE_DEFAULT, 0)
        ]);
    }

    /**
     * Get user info from OAuth2 access token or user ID
     *
     * @param string $accesstoken OAuth2 access token
     * @param int $userid User ID
     * @param int $courseid Course ID for context-specific roles
     * @return array User information
     */
    public static function get_oauth2_user_info($accesstoken = '', $userid = 0, $courseid = 0)
    {
        global $DB;

        // Parameter validation
        $params = self::validate_parameters(
            self::get_oauth2_user_info_parameters(),
            ['accesstoken' => $accesstoken, 'userid' => $userid, 'courseid' => $courseid]
        );

        // Validate context
        $context = context_system::instance();
        self::validate_context($context);

        // Normalize parameters
        $accesstoken = trim($params['accesstoken']);
        $userid = (int)$params['userid'];
        $courseid = (int)$params['courseid'];

        // Check that at least one parameter is provided
        if (empty($accesstoken) && empty($userid)) {
            throw new \moodle_exception(
                'missingparameter',
                'local_oauth2userinfo',
                '',
                null,
                'Either accesstoken or userid must be provided'
            );
        }

        // Check that only one parameter is provided
        if (!empty($accesstoken) && !empty($userid)) {
            throw new \moodle_exception(
                'toomanyparameters',
                'local_oauth2userinfo',
                '',
                null,
                'Only one of accesstoken or userid should be provided'
            );
        }

        $useridToFetch = null;

        // If access token is provided, validate it and get user ID
        if (!empty($accesstoken)) {
            // Look up the access token (without mdl_ prefix - Moodle adds it automatically)
            $tokenrecord = $DB->get_record(
                'local_oauth2_access_token',
                ['access_token' => $accesstoken],
                'user_id, expires'
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

            $useridToFetch = $tokenrecord->user_id;
        } else {
            // Use the provided user ID directly
            $useridToFetch = $userid;
        }

        // Get user information
        $user = $DB->get_record(
            'user',
            ['id' => $useridToFetch],
            'id, username, firstname, lastname, email, idnumber, auth, suspended, deleted'
        );

        if (!$user) {
            throw new \moodle_exception(
                'usernotfound',
                'local_oauth2userinfo',
                '',
                null,
                'User not found with ID: ' . $useridToFetch
            );
        }

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

        // Get user roles
        $roles = self::get_user_roles($useridToFetch, $courseid);

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
            'roles' => $roles['roles'],
            'systemroles' => $roles['systemroles'],
            'isteacher' => $roles['isteacher'],
            'isstudent' => $roles['isstudent'],
        ];
    }

    /**
     * Get user roles
     *
     * @param int $userid User ID
     * @param int $courseid Course ID (0 for system-wide roles)
     * @return array Role information
     */
    private static function get_user_roles($userid, $courseid = 0)
    {
        global $DB;

        $roles = [];
        $systemroles = [];
        $isteacher = false;
        $isstudent = false;

        // First, check across ALL course enrollments if user has ever been a teacher or student
        // This query checks all role assignments in course contexts
        $allarchetypes = $DB->get_records_sql(
            "SELECT DISTINCT r.archetype
             FROM {role_assignments} ra
             JOIN {role} r ON r.id = ra.roleid
             JOIN {context} ctx ON ctx.id = ra.contextid
             WHERE ra.userid = :userid 
             AND ctx.contextlevel = 50
             AND r.archetype IN ('student', 'teacher', 'editingteacher')",
            ['userid' => $userid]
        );

        foreach ($allarchetypes as $archetyperecord) {
            if (in_array($archetyperecord->archetype, ['teacher', 'editingteacher'])) {
                $isteacher = true;
            }
            if ($archetyperecord->archetype === 'student') {
                $isstudent = true;
            }
        }

        // Get system-wide roles
        $systemcontext = \context_system::instance();
        $systemroleassignments = $DB->get_records_sql(
            "SELECT r.id, r.shortname, r.name, r.archetype
             FROM {role_assignments} ra
             JOIN {role} r ON r.id = ra.roleid
             WHERE ra.userid = :userid AND ra.contextid = :contextid",
            ['userid' => $userid, 'contextid' => $systemcontext->id]
        );

        foreach ($systemroleassignments as $role) {
            $systemroles[] = [
                'roleid' => $role->id,
                'shortname' => $role->shortname,
                'name' => $role->name,
                'archetype' => $role->archetype ?? '',
            ];
        }

        // If courseid is provided, get course-specific roles
        if ($courseid > 0) {
            $course = $DB->get_record('course', ['id' => $courseid]);
            if ($course) {
                $coursecontext = \context_course::instance($courseid);
                $courseroleassignments = $DB->get_records_sql(
                    "SELECT r.id, r.shortname, r.name, r.archetype
                     FROM {role_assignments} ra
                     JOIN {role} r ON r.id = ra.roleid
                     JOIN {context} ctx ON ctx.id = ra.contextid
                     WHERE ra.userid = :userid 
                     AND (ctx.id = :contextid OR ctx.path LIKE :contextpath)",
                    [
                        'userid' => $userid,
                        'contextid' => $coursecontext->id,
                        'contextpath' => $coursecontext->path . '/%'
                    ]
                );

                foreach ($courseroleassignments as $role) {
                    $roleinfo = [
                        'roleid' => $role->id,
                        'shortname' => $role->shortname,
                        'name' => $role->name,
                        'archetype' => $role->archetype ?? '',
                        'courseid' => $courseid,
                    ];
                    $roles[] = $roleinfo;
                }
            }
        } else {
            // Get all roles across all courses
            $allroles = $DB->get_records_sql(
                "SELECT r.id, r.shortname, r.name, r.archetype, c.id as courseid, c.fullname as coursename
                 FROM {role_assignments} ra
                 JOIN {role} r ON r.id = ra.roleid
                 JOIN {context} ctx ON ctx.id = ra.contextid
                 LEFT JOIN {course} c ON c.id = ctx.instanceid AND ctx.contextlevel = 50
                 WHERE ra.userid = :userid AND ctx.contextlevel = 50",
                ['userid' => $userid]
            );

            foreach ($allroles as $role) {
                $roleinfo = [
                    'roleid' => $role->id,
                    'shortname' => $role->shortname,
                    'name' => $role->name,
                    'archetype' => $role->archetype ?? '',
                    'courseid' => $role->courseid ?? 0,
                    'coursename' => $role->coursename ?? '',
                ];
                $roles[] = $roleinfo;
            }
        }

        return [
            'roles' => $roles,
            'systemroles' => $systemroles,
            'isteacher' => $isteacher,
            'isstudent' => $isstudent,
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
            'roles' => new external_multiple_structure(
                new external_single_structure([
                    'roleid' => new external_value(PARAM_INT, 'Role ID'),
                    'shortname' => new external_value(PARAM_TEXT, 'Role short name'),
                    'name' => new external_value(PARAM_TEXT, 'Role name'),
                    'archetype' => new external_value(PARAM_TEXT, 'Role archetype'),
                    'courseid' => new external_value(PARAM_INT, 'Course ID', VALUE_OPTIONAL),
                    'coursename' => new external_value(PARAM_TEXT, 'Course name', VALUE_OPTIONAL),
                ]),
                'User roles in courses',
                VALUE_OPTIONAL
            ),
            'systemroles' => new external_multiple_structure(
                new external_single_structure([
                    'roleid' => new external_value(PARAM_INT, 'Role ID'),
                    'shortname' => new external_value(PARAM_TEXT, 'Role short name'),
                    'name' => new external_value(PARAM_TEXT, 'Role name'),
                    'archetype' => new external_value(PARAM_TEXT, 'Role archetype'),
                ]),
                'User system-wide roles',
                VALUE_OPTIONAL
            ),
            'isteacher' => new external_value(PARAM_BOOL, 'Has teacher role in any course'),
            'isstudent' => new external_value(PARAM_BOOL, 'Has student role in any course'),
        ]);
    }
}
