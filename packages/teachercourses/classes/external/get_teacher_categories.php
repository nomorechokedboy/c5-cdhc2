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
 * Returns categories that contain courses where the user is a teacher,
 * PLUS all ancestor categories so the frontend can build a proper tree.
 *
 * Example: if a teacher teaches in "Lớp NVQYcK42A1" (parent=27),
 * the response will also include id=27 "Nhân viên quân y đại đội khoá 42"
 * (parent=26) and id=26 "Nhân viên quân y đại đội" (parent=0) even if
 * the teacher has no courses directly in those intermediate categories.
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

        // ── Step 1: find categories the teacher directly teaches in ──────────
        $directsql = "
            SELECT DISTINCT c.category AS catid
              FROM {course} c
              JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = 50
              JOIN {role_assignments} ra ON ra.contextid = ctx.id
              JOIN {role} r ON r.id = ra.roleid
             WHERE ra.userid = :userid
               AND r.archetype IN ('editingteacher', 'teacher')
               AND c.id != 1
        ";
        $directrows = $DB->get_records_sql($directsql, ['userid' => $params['userid']]);
        $directids = array_column($directrows, 'catid');

        if (empty($directids)) {
            return [
                'userid'          => (int)$params['userid'],
                'username'        => $user->username,
                'firstname'       => $user->firstname,
                'lastname'        => $user->lastname,
                'email'           => $user->email,
                'totalcategories' => 0,
                'categories'      => [],
            ];
        }

        // ── Step 2: collect all ancestors of those categories ─────────────────
        // Walk up the parent chain until we reach parent=0.
        $allids = array_flip($directids); // use as a set

        $queue = $directids;
        while (!empty($queue)) {
            list($chunk, $queue) = [array_splice($queue, 0, 200), []];
            if (empty($chunk)) break;

            list($insql, $inparams) = $DB->get_in_or_equal($chunk, SQL_PARAMS_NAMED);
            $parents = $DB->get_records_sql(
                "SELECT id, parent FROM {course_categories} WHERE id $insql",
                $inparams
            );
            foreach ($parents as $row) {
                if ((int)$row->parent > 0 && !isset($allids[$row->parent])) {
                    $allids[$row->parent] = true;
                    $queue[] = (int)$row->parent; // need to check its parent too
                }
            }
        }

        $allcatids = array_keys($allids);

        // ── Step 3: fetch full records for every collected category id ────────
        if (empty($allcatids)) {
            $allcatids = $directids;
        }

        list($insql, $inparams) = $DB->get_in_or_equal($allcatids, SQL_PARAMS_NAMED);
        $catrecords = $DB->get_records_sql(
            "SELECT id, name, description, parent, path, depth, visible, sortorder, idnumber
               FROM {course_categories}
              WHERE id $insql
              ORDER BY name",
            $inparams
        );

        // ── Step 4: for direct categories, also count courses ─────────────────
        $directset = array_flip($directids);

        $categories = [];
        foreach ($catrecords as $cat) {
            $courseids = [];
            if (isset($directset[$cat->id])) {
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
            }

            $categories[] = [
                'id'          => (int)$cat->id,
                'name'        => $cat->name,
                'description' => strip_tags($cat->description ?? ''),
                'parent'      => (int)$cat->parent,
                'parentname'  => '',   // not needed by frontend
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
            'totalcategories' => new external_value(PARAM_INT,   'Total categories (including ancestors)'),
            'categories'      => new external_multiple_structure(
                new external_single_structure([
                    'id'          => new external_value(PARAM_INT,  'Category ID'),
                    'name'        => new external_value(PARAM_TEXT, 'Category name'),
                    'description' => new external_value(PARAM_RAW,  'Category description'),
                    'parent'      => new external_value(PARAM_INT,  'Parent category ID (0 = root)'),
                    'parentname'  => new external_value(PARAM_TEXT, 'Parent category name'),
                    'path'        => new external_value(PARAM_TEXT, 'Category path'),
                    'depth'       => new external_value(PARAM_INT,  'Depth'),
                    'visible'     => new external_value(PARAM_INT,  'Visible'),
                    'sortorder'   => new external_value(PARAM_INT,  'Sort order'),
                    'coursecount' => new external_value(PARAM_INT,  'Courses taught in this category (0 for ancestor-only nodes)'),
                    'courseids'   => new external_multiple_structure(
                        new external_value(PARAM_INT, 'Course ID'),
                        'Taught course IDs (empty for ancestor-only nodes)'
                    ),
                    'idnumber'    => new external_value(PARAM_TEXT, 'ID number'),
                ])
            ),
        ]);
    }
}
