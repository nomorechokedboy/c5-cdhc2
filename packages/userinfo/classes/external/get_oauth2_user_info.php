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
    public static function get_oauth2_user_info_parameters()
    {
        return new external_function_parameters([
            'accesstoken' => new external_value(PARAM_TEXT, 'OAuth2 access token', VALUE_DEFAULT, ''),
            'userid'      => new external_value(PARAM_INT, 'User ID', VALUE_DEFAULT, 0),
            'courseid'    => new external_value(PARAM_INT, 'Course ID for role context (optional)', VALUE_DEFAULT, 0),
        ]);
    }

    public static function get_oauth2_user_info($accesstoken = '', $userid = 0, $courseid = 0)
    {
        global $DB;

        $params = self::validate_parameters(
            self::get_oauth2_user_info_parameters(),
            ['accesstoken' => $accesstoken, 'userid' => $userid, 'courseid' => $courseid]
        );

        $context = context_system::instance();
        self::validate_context($context);

        $accesstoken = trim($params['accesstoken']);
        $userid      = (int)$params['userid'];
        $courseid    = (int)$params['courseid'];

        if (empty($accesstoken) && empty($userid)) {
            throw new \moodle_exception(
                'missingparameter',
                'local_oauth2userinfo',
                '',
                null,
                'Either accesstoken or userid must be provided'
            );
        }

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

        if (!empty($accesstoken)) {
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
            $useridToFetch = $userid;
        }

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

        $roles = self::get_user_roles($useridToFetch, $courseid);

        return [
            'userid'      => $user->id,
            'username'    => $user->username,
            'firstname'   => $user->firstname,
            'lastname'    => $user->lastname,
            'email'       => $user->email,
            'idnumber'    => $user->idnumber ?? '',
            'auth'        => $user->auth,
            'suspended'   => $user->suspended,
            'deleted'     => $user->deleted,
            'roles'       => $roles['roles'],
            'systemroles' => $roles['systemroles'],
            'isteacher'   => $roles['isteacher'],
            'isstudent'   => $roles['isstudent'],
            'role'        => $roles['role'],
        ];
    }

    /**
     * Determine a single canonical role for the user, in priority order:
     *   admin > manager > teacher > student
     *
     * - admin:   Moodle site administrator (is_siteadmin)
     * - manager: Has the 'manager' archetype at system context
     * - teacher: Has 'editingteacher' or 'teacher' archetype in any course
     * - student: Everything else
     */
    private static function determine_role($userid, $systemroles, $isteacher)
    {
        // Site administrators trump everything
        if (is_siteadmin($userid)) {
            return 'admin';
        }

        // System-level manager role
        foreach ($systemroles as $sr) {
            if ($sr['archetype'] === 'manager' || $sr['shortname'] === 'manager') {
                return 'manager';
            }
        }

        if ($isteacher) {
            return 'teacher';
        }

        return 'student';
    }

    private static function get_user_roles($userid, $courseid = 0)
    {
        global $DB;

        $roles       = [];
        $systemroles = [];
        $isteacher   = false;
        $isstudent   = false;

        // Check all course-level role archetypes for this user
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

        // System-wide roles
        $systemcontext        = \context_system::instance();
        $systemroleassignments = $DB->get_records_sql(
            "SELECT r.id, r.shortname, r.name, r.archetype
             FROM {role_assignments} ra
             JOIN {role} r ON r.id = ra.roleid
             WHERE ra.userid = :userid AND ra.contextid = :contextid",
            ['userid' => $userid, 'contextid' => $systemcontext->id]
        );

        foreach ($systemroleassignments as $role) {
            $systemroles[] = [
                'roleid'    => $role->id,
                'shortname' => $role->shortname,
                'name'      => $role->name,
                'archetype' => $role->archetype ?? '',
            ];
        }

        // Course-level roles
        if ($courseid > 0) {
            $course = $DB->get_record('course', ['id' => $courseid]);
            if ($course) {
                $coursecontext        = \context_course::instance($courseid);
                $courseroleassignments = $DB->get_records_sql(
                    "SELECT r.id, r.shortname, r.name, r.archetype
                     FROM {role_assignments} ra
                     JOIN {role} r ON r.id = ra.roleid
                     JOIN {context} ctx ON ctx.id = ra.contextid
                     WHERE ra.userid = :userid
                     AND (ctx.id = :contextid OR ctx.path LIKE :contextpath)",
                    [
                        'userid'      => $userid,
                        'contextid'   => $coursecontext->id,
                        'contextpath' => $coursecontext->path . '/%',
                    ]
                );

                foreach ($courseroleassignments as $role) {
                    $roles[] = [
                        'roleid'    => $role->id,
                        'shortname' => $role->shortname,
                        'name'      => $role->name,
                        'archetype' => $role->archetype ?? '',
                        'courseid'  => $courseid,
                    ];
                }
            }
        } else {
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
                $roles[] = [
                    'roleid'     => $role->id,
                    'shortname'  => $role->shortname,
                    'name'       => $role->name,
                    'archetype'  => $role->archetype ?? '',
                    'courseid'   => $role->courseid ?? 0,
                    'coursename' => $role->coursename ?? '',
                ];
            }
        }

        $role = self::determine_role($userid, $systemroles, $isteacher);

        return [
            'roles'       => $roles,
            'systemroles' => $systemroles,
            'isteacher'   => $isteacher,
            'isstudent'   => $isstudent,
            'role'        => $role,
        ];
    }

    public static function get_oauth2_user_info_returns()
    {
        return new external_single_structure([
            'userid'    => new external_value(PARAM_INT, 'User ID'),
            'username'  => new external_value(PARAM_TEXT, 'Username'),
            'firstname' => new external_value(PARAM_TEXT, 'First name'),
            'lastname'  => new external_value(PARAM_TEXT, 'Last name'),
            'email'     => new external_value(PARAM_EMAIL, 'Email address'),
            'idnumber'  => new external_value(PARAM_TEXT, 'ID number'),
            'auth'      => new external_value(PARAM_TEXT, 'Authentication method'),
            'suspended' => new external_value(PARAM_INT, 'Is user suspended (1=yes, 0=no)'),
            'deleted'   => new external_value(PARAM_INT, 'Is user deleted (1=yes, 0=no)'),
            'roles'     => new external_multiple_structure(
                new external_single_structure([
                    'roleid'     => new external_value(PARAM_INT, 'Role ID'),
                    'shortname'  => new external_value(PARAM_TEXT, 'Role short name'),
                    'name'       => new external_value(PARAM_TEXT, 'Role name'),
                    'archetype'  => new external_value(PARAM_TEXT, 'Role archetype'),
                    'courseid'   => new external_value(PARAM_INT, 'Course ID', VALUE_OPTIONAL),
                    'coursename' => new external_value(PARAM_TEXT, 'Course name', VALUE_OPTIONAL),
                ]),
                'User roles in courses',
                VALUE_OPTIONAL
            ),
            'systemroles' => new external_multiple_structure(
                new external_single_structure([
                    'roleid'    => new external_value(PARAM_INT, 'Role ID'),
                    'shortname' => new external_value(PARAM_TEXT, 'Role short name'),
                    'name'      => new external_value(PARAM_TEXT, 'Role name'),
                    'archetype' => new external_value(PARAM_TEXT, 'Role archetype'),
                ]),
                'User system-wide roles',
                VALUE_OPTIONAL
            ),
            'isteacher' => new external_value(PARAM_BOOL, 'Has teacher role in any course'),
            'isstudent' => new external_value(PARAM_BOOL, 'Has student role in any course'),
            'role'      => new external_value(
                PARAM_TEXT,
                'Canonical role: admin | manager | teacher | student'
            ),
        ]);
    }
}
