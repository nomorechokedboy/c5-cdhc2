<?php

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

$phpwordpath = __DIR__ . '/../vendor/autoload.php';
if (file_exists($phpwordpath)) {
    require_once($phpwordpath);
}

require_once(__DIR__ . '/fixed_template_processor.php');

use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\TemplateProcessor;

/**
 * Helper class for exporting to DOCX format.
 *
 * Methods ending in _content() return the raw file bytes (string).
 * Methods NOT ending in _content() stream directly to the browser and call exit.
 */
class docx_exporter
{

    public static function is_available(): bool
    {
        return class_exists('PhpOffice\PhpWord\PhpWord');
    }

    // ── shared private helper ─────────────────────────────────────────────

    private static function build_table_document(array $data): PhpWord
    {
        $phpWord = new PhpWord();
        $phpWord->getSettings()->setThemeFontLang(new \PhpOffice\PhpWord\Style\Language('vi-VN'));

        $section = $phpWord->addSection([
            'marginLeft'   => 600,
            'marginRight'  => 600,
            'marginTop'    => 600,
            'marginBottom' => 600,
        ]);

        $section->addText(
            'Bảng điểm',
            ['bold' => true, 'size' => 14],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]
        );
        $section->addTextBreak(1);

        $table = $section->addTable([
            'borderSize'  => 6,
            'borderColor' => '999999',
            'cellMargin'  => 80,
        ]);

        $isHeader = true;
        foreach ($data as $rowData) {
            $table->addRow();
            foreach ($rowData as $cellData) {
                if ($isHeader) {
                    $table->addCell(2000, ['bgColor' => 'CCCCCC'])
                        ->addText((string) $cellData, ['bold' => true, 'size' => 9]);
                } else {
                    $table->addCell(2000)
                        ->addText((string) $cellData, ['size' => 9]);
                }
            }
            $isHeader = false;
        }

        return $phpWord;
    }

    private static function phpword_to_string(PhpWord $phpWord): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'mdl_gradeexport_');
        try {
            IOFactory::createWriter($phpWord, 'Word2007')->save($tmp);
            return file_get_contents($tmp);
        } finally {
            @unlink($tmp);
        }
    }

    private static function template_processor_to_string(TemplateProcessor $tp): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'mdl_gradeexport_');
        try {
            $tp->saveAs($tmp);
            return file_get_contents($tmp);
        } finally {
            @unlink($tmp);
        }
    }

    // ── content-return (API) methods ──────────────────────────────────────

    public static function get_table_content(array $data): string
    {
        if (!self::is_available()) {
            throw new \moodle_exception('phpwordnotinstalled', 'local_customgradeexport');
        }
        return self::phpword_to_string(self::build_table_document($data));
    }

    public static function get_course_template_content(
        string $templatePath,
        array  $variables,
        array  $tableData
    ): string {
        if (!self::is_available()) {
            throw new \moodle_exception('phpwordnotinstalled', 'local_customgradeexport');
        }
        if (!file_exists($templatePath)) {
            throw new \moodle_exception('templatenotfound', 'local_customgradeexport', '', $templatePath);
        }

        $tp = new fixed_template_processor($templatePath);

        // Clone rows FIRST before scalar replacements
        if (!empty($tableData['rows_kv'])) {
            $rows = array_map(
                static fn(array $row) => array_map(
                    static fn($v) => $v === null ? '' : (string) $v,
                    $row
                ),
                $tableData['rows_kv']
            );
            $tp->cloneRowAndSetValues('stt', $rows);
        }

        // Scalar variable replacements AFTER cloneRow
        foreach ($variables as $key => $value) {
            $tp->setValue($key, (string) $value);
        }

        return self::template_processor_to_string($tp);
    }

    // ── streaming (browser) methods ───────────────────────────────────────

    public static function export_table(array $data, string $filename): void
    {
        if (!self::is_available()) {
            throw new \moodle_exception('phpwordnotinstalled', 'local_customgradeexport');
        }

        $content = self::phpword_to_string(self::build_table_document($data));

        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        echo $content;
        exit;
    }

    public static function export_from_template(
        string $templatePath,
        array  $variables,
        array  $tableData,
        string $filename
    ): void {
        if (!self::is_available()) {
            throw new \moodle_exception('phpwordnotinstalled', 'local_customgradeexport');
        }
        if (!file_exists($templatePath)) {
            throw new \moodle_exception('templatenotfound', 'local_customgradeexport', '', $templatePath);
        }

        $tp = new fixed_template_processor($templatePath);

        // Clone rows FIRST before scalar replacements
        if (!empty($tableData['rows_kv'])) {
            $rows = array_map(
                static fn(array $row) => array_map(
                    static fn($v) => $v === null ? '' : (string) $v,
                    $row
                ),
                $tableData['rows_kv']
            );
            $tp->cloneRowAndSetValues('stt', $rows);
        }

        // Scalar variable replacements AFTER cloneRow
        foreach ($variables as $key => $value) {
            $tp->setValue($key, (string) $value);
        }

        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        echo self::template_processor_to_string($tp);
        exit;
    }

    public static function export_course_template(
        string $templatePath,
        array  $variables,
        array  $tableData,
        string $filename
    ): void {
        $content = self::get_course_template_content($templatePath, $variables, $tableData);

        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        echo $content;
        exit;
    }
}
