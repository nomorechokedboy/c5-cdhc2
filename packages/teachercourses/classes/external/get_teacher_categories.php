<?php

namespace local_teachercourses\external;

defined('MOODLE_INTERNAL') || die();

require_once("$CFG->libdir/externallib.php");

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;
use context_system;

/**
 * Returns categories that contain courses where the user is assigned
 * as editingteacher or teacher via role_assignments — mirrors the SQL
 * used by the Go sms-api categories/mysql_repo.go exactly.
 */
class get_teacher_categories extends external_api
{

    public static function get_teacher_categories_parameters()
    {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'User ID (0 for current user)', VALUE_DEFAULT, 0)
        ]);
    }

    public static function get_teacher_categories($userid = 0)
    {
        global $DB, $USER;

        $params = self::validate_parameters(
            self::get_teacher_categories_parameters(),
            ['userid' => $userid]
        );

        if ($params['userid'] == 0) {
            $params['userid'] = $USER->id;
        }

        $context = context_system::instance();
        self::validate_context($context);

        $user = $DB->get_record('user', ['id' => $params['userid']], '*', MUST_EXIST);

        // ── Distinct categories via role assignments (same logic as Go mysql_repo) ──
        $catsql = "
            SELECT DISTINCT cat.id, cat.name, cat.description,
                            cat.parent, cat.path, cat.depth,
                            cat.visible, cat.sortorder, cat.idnumber
              FROM {course} c
              JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = 50
              JOIN {role_assignments} ra ON ra.contextid = ctx.id
              JOIN {role} r ON r.id = ra.roleid
              JOIN {course_categories} cat ON cat.id = c.category
             WHERE ra.userid = :userid
               AND r.archetype IN ('editingteacher', 'teacher')
               AND c.id != 1
             ORDER BY cat.name
        ";
        $catrecords = $DB->get_records_sql($catsql, ['userid' => $params['userid']]);

        $categories = [];
        foreach ($catrecords as $cat) {
            // Course IDs for this category where the user is a teacher
            $coursesql = "
                SELECT c.id
                  FROM {course} c
                  JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = 50
                  JOIN {role_assignments} ra ON ra.contextid = ctx.id
                  JOIN {role} r ON r.id = ra.roleid
                 WHERE ra.userid = :userid
                   AND r.archetype IN ('editingteacher', 'teacher')
                   AND c.category = :catid
                   AND c.id != 1
            ";
            $courserows = $DB->get_records_sql($coursesql, [
                'userid' => $params['userid'],
                'catid'  => $cat->id,
            ]);

            $courseids = array_keys($courserows);

            // Parent name
            $parentname = '';
            if ($cat->parent > 0) {
                $parent = $DB->get_record('course_categories', ['id' => $cat->parent], 'name', IGNORE_MISSING);
                $parentname = $parent ? $parent->name : '';
            }

            $categories[] = [
                'id'          => (int)$cat->id,
                'name'        => $cat->name,
                'description' => strip_tags($cat->description ?? ''),
                'parent'      => (int)$cat->parent,
                'parentname'  => $parentname,
                'path'        => $cat->path,
                'depth'       => (int)$cat->depth,
                'visible'     => (int)$cat->visible,
                'sortorder'   => (int)$cat->sortorder,
                'coursecount' => count($courseids),
                'courseids'   => $courseids,
                'idnumber'    => $cat->idnumber ?? '',
            ];
        }

        return [
            'userid'          => (int)$params['userid'],
            'username'        => $user->username,
            'firstname'       => $user->firstname,
            'lastname'        => $user->lastname,
            'email'           => $user->email,
            'totalcategories' => count($categories),
            'categories'      => $categories,
        ];
    }

    public static function get_teacher_categories_returns()
    {
        return new external_single_structure([
            'userid'          => new external_value(PARAM_INT,   'User ID'),
            'username'        => new external_value(PARAM_TEXT,  'Username'),
            'firstname'       => new external_value(PARAM_TEXT,  'First name'),
            'lastname'        => new external_value(PARAM_TEXT,  'Last name'),
            'email'           => new external_value(PARAM_EMAIL, 'Email'),
            'totalcategories' => new external_value(PARAM_INT,   'Total categories'),
            'categories'      => new external_multiple_structure(
                new external_single_structure([
                    'id'          => new external_value(PARAM_INT,  'Category ID'),
                    'name'        => new external_value(PARAM_TEXT, 'Category name'),
                    'description' => new external_value(PARAM_RAW,  'Category description'),
                    'parent'      => new external_value(PARAM_INT,  'Parent category ID'),
                    'parentname'  => new external_value(PARAM_TEXT, 'Parent category name'),
                    'path'        => new external_value(PARAM_TEXT, 'Category path'),
                    'depth'       => new external_value(PARAM_INT,  'Depth'),
                    'visible'     => new external_value(PARAM_INT,  'Visible'),
                    'sortorder'   => new external_value(PARAM_INT,  'Sort order'),
                    'coursecount' => new external_value(PARAM_INT,  'Courses taught in this category'),
                    'courseids'   => new external_multiple_structure(
                        new external_value(PARAM_INT, 'Course ID'),
                        'Taught course IDs in this category'
                    ),
                    'idnumber'    => new external_value(PARAM_TEXT, 'ID number'),
                ])
            ),
        ]);
    }
}
