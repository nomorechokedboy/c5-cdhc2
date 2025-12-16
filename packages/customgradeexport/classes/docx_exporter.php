<?php

/**
 * DOCX Exporter class
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

// Try to load PHPWord
$phpwordpath = __DIR__ . '/../vendor/autoload.php';
if (file_exists($phpwordpath)) {
    require_once($phpwordpath);
}

use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\TemplateProcessor;

/**
 * Helper class for exporting to DOCX format
 */
class docx_exporter
{

    /**
     * Check if PHPWord is available
     * 
     * @return bool
     */
    public static function is_available()
    {
        return class_exists('PhpOffice\PhpWord\PhpWord');
    }

    /**
     * Export data to DOCX using a table
     *
     * @param array $data 2D array of export data
     * @param string $filename Output filename
     */
    public static function export_table($data, $filename)
    {
        if (!self::is_available()) {
            throw new \moodle_exception('PHPWord library not installed');
        }

        $phpWord = new PhpWord();

        // Add section
        $section = $phpWord->addSection([
            'marginLeft' => 600,
            'marginRight' => 600,
            'marginTop' => 600,
            'marginBottom' => 600,
        ]);

        // Add title
        $section->addText(
            'Grade Export Report',
            ['bold' => true, 'size' => 16],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]
        );

        $section->addTextBreak(1);

        // Add export date
        $section->addText(
            'Exported: ' . date('Y-m-d H:i:s'),
            ['size' => 10],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::RIGHT]
        );

        $section->addTextBreak(1);

        // Create table
        $table = $section->addTable([
            'borderSize' => 6,
            'borderColor' => '999999',
            'cellMargin' => 80,
            'alignment' => \PhpOffice\PhpWord\SimpleType\JcTable::CENTER,
            'width' => 100 * 50, // 100% width
        ]);

        // Add rows
        $isHeader = true;
        foreach ($data as $rowData) {
            $table->addRow();

            foreach ($rowData as $cellData) {
                if ($isHeader) {
                    // Header style
                    $table->addCell(2000, ['bgColor' => 'CCCCCC'])
                        ->addText($cellData, ['bold' => true, 'size' => 10]);
                } else {
                    // Data cell style
                    $table->addCell(2000)
                        ->addText($cellData, ['size' => 9]);
                }
            }

            $isHeader = false;
        }

        // Save file
        $objWriter = IOFactory::createWriter($phpWord, 'Word2007');

        // Send headers
        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $objWriter->save('php://output');
        exit;
    }

    /**
     * Export data using a template file
     *
     * @param string $templatePath Path to template file
     * @param array $variables Variables to replace in template
     * @param array $tableData Optional table data to insert
     * @param string $filename Output filename
     */
    public static function export_from_template($templatePath, $variables, $tableData, $filename)
    {
        if (!self::is_available()) {
            throw new \moodle_exception('PHPWord library not installed');
        }

        if (!file_exists($templatePath)) {
            throw new \moodle_exception('Template file not found: ' . $templatePath);
        }

        $templateProcessor = new TemplateProcessor($templatePath);

        // Replace simple variables
        foreach ($variables as $key => $value) {
            $templateProcessor->setValue($key, $value);
        }

        // Clone table rows if template has a table block
        if (!empty($tableData) && count($tableData) > 1) {
            // First row is headers, skip it for cloning
            $dataRows = array_slice($tableData, 1);

            // Try to clone the row (requires ${} placeholders in template)
            try {
                $templateProcessor->cloneRow('firstname', count($dataRows));

                // Fill in the data
                $rowNum = 1;
                foreach ($dataRows as $row) {
                    $colNum = 0;
                    foreach ($tableData[0] as $headerIndex => $header) {
                        $placeholder = self::get_placeholder_for_column($headerIndex);
                        if (isset($row[$colNum])) {
                            $templateProcessor->setValue($placeholder . '#' . $rowNum, $row[$colNum]);
                        }
                        $colNum++;
                    }
                    $rowNum++;
                }
            } catch (\Exception $e) {
                // If cloning fails, just use simple variable replacement
                // This means template doesn't have proper table structure
            }
        }

        // Send headers
        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $templateProcessor->saveAs('php://output');
        exit;
    }

    /**
     * Get placeholder name for column index
     *
     * @param int $index Column index
     * @return string Placeholder name
     */
    protected static function get_placeholder_for_column($index)
    {
        $placeholders = [
            'firstname',
            'lastname',
            'idnumber',
            'institution',
            'department',
            'email',
            'attempt',
            'status',
            'grade',
            'outof',
            'percentage',
            'timestarted',
            'timefinished',
            'timetaken'
        ];

        return isset($placeholders[$index]) ? $placeholders[$index] : 'col' . $index;
    }
}
