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
 * Returns ALL visible course categories in the system.
 * Intended for admin / manager roles who need full visibility.
 */
class get_all_categories extends external_api {

    public static function get_all_categories_parameters() {
        return new external_function_parameters([]);
    }

    public static function get_all_categories() {
        global $DB;

        $context = context_system::instance();
        self::validate_context($context);

        $sql = "
            SELECT cat.id, cat.name, cat.description, cat.parent,
                   cat.path, cat.depth, cat.visible, cat.sortorder,
                   cat.idnumber,
                   (SELECT COUNT(*) FROM {course} c WHERE c.category = cat.id AND c.id != 1) AS coursecount
              FROM {course_categories} cat
             WHERE cat.visible = 1
             ORDER BY cat.name
        ";
        $catrecords = $DB->get_records_sql($sql);

        $categories = [];
        foreach ($catrecords as $cat) {
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
                'coursecount' => (int)$cat->coursecount,
                'courseids'   => [], // not needed for admin sidebar
                'idnumber'    => $cat->idnumber ?? '',
            ];
        }

        return [
            'userid'          => 0,
            'username'        => '',
            'firstname'       => '',
            'lastname'        => '',
            'email'           => '',
            'totalcategories' => count($categories),
            'categories'      => $categories,
        ];
    }

    public static function get_all_categories_returns() {
        return new external_single_structure([
            'userid'          => new external_value(PARAM_INT,   'Always 0 for admin endpoint'),
            'username'        => new external_value(PARAM_TEXT,  'Empty'),
            'firstname'       => new external_value(PARAM_TEXT,  'Empty'),
            'lastname'        => new external_value(PARAM_TEXT,  'Empty'),
            'email'           => new external_value(PARAM_TEXT,  'Empty'),
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
                    'coursecount' => new external_value(PARAM_INT,  'Total courses in category'),
                    'courseids'   => new external_multiple_structure(
                        new external_value(PARAM_INT, 'Course ID'),
                        'Empty for admin endpoint'
                    ),
                    'idnumber'    => new external_value(PARAM_TEXT, 'ID number'),
                ])
            ),
        ]);
    }
}
