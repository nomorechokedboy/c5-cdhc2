<?php

/**
 * Excel Template Processor class
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/phpexcel/PHPExcel.php');

/**
 * Helper class for processing Excel templates
 */
class excel_template_processor
{

    /**
     * Check if PHPExcel is available
     * 
     * @return bool
     */
    public static function is_available()
    {
        return class_exists('PHPExcel');
    }

    /**
     * Export data using Excel template
     *
     * @param string $templatePath Path to template file
     * @param array $variables Variables to replace in template
     * @param array $tableData Table data to insert
     * @param string $filename Output filename
     */
    public static function export_from_template($templatePath, $variables, $tableData, $filename)
    {
        if (!self::is_available()) {
            throw new \moodle_exception('PHPExcel library not available');
        }

        if (!file_exists($templatePath)) {
            throw new \moodle_exception('Template file not found: ' . $templatePath);
        }

        // Load template
        $objPHPExcel = \PHPExcel_IOFactory::load($templatePath);
        $sheet = $objPHPExcel->getActiveSheet();

        // Replace simple variables
        self::replace_variables($sheet, $variables);

        // Insert table data
        if (!empty($tableData)) {
            self::insert_table_data($sheet, $tableData);
        }

        // Send download
        self::send_excel_download($objPHPExcel, $filename);
    }

    /**
     * Replace variables in sheet
     *
     * @param PHPExcel_Worksheet $sheet Worksheet
     * @param array $variables Variables to replace
     */
    protected static function replace_variables($sheet, $variables)
    {
        $highestRow = $sheet->getHighestRow();
        $highestCol = $sheet->getHighestColumn();

        // Iterate through cells
        for ($row = 1; $row <= $highestRow; $row++) {
            for ($col = 'A'; $col <= $highestCol; $col++) {
                $cell = $sheet->getCell($col . $row);
                $value = $cell->getValue();

                if (is_string($value)) {
                    // Replace variables like ${varname}
                    foreach ($variables as $key => $val) {
                        $value = str_replace('${' . $key . '}', $val, $value);
                    }
                    $cell->setValue($value);
                }
            }
        }
    }

    /**
     * Insert table data into sheet
     * Finds the data start row (first row with ${} placeholder) and inserts data
     *
     * @param PHPExcel_Worksheet $sheet Worksheet
     * @param array $tableData 2D array of table data
     */
    protected static function insert_table_data($sheet, $tableData)
    {
        // Find the template row (contains placeholders like ${firstname})
        $templateRow = self::find_template_row($sheet);

        if ($templateRow === null) {
            // No template row found, just append data at the end
            $startRow = $sheet->getHighestRow() + 2;
            self::append_table_data($sheet, $tableData, $startRow);
            return;
        }

        // Get template row styling
        $templateRowStyles = self::get_row_styles($sheet, $templateRow);

        // Skip header row in data (first row is headers)
        $dataRows = array_slice($tableData, 1);

        // Insert data rows
        $currentRow = $templateRow;
        foreach ($dataRows as $rowIndex => $rowData) {
            if ($rowIndex > 0) {
                // Insert new row after template
                $sheet->insertNewRowBefore($currentRow + 1, 1);
                $currentRow++;

                // Copy template row styles to new row
                self::copy_row_styles($sheet, $templateRow, $currentRow, $templateRowStyles);
            }

            // Fill data
            $colIndex = 0;
            foreach ($rowData as $cellData) {
                $col = \PHPExcel_Cell::stringFromColumnIndex($colIndex);
                $sheet->setCellValue($col . $currentRow, $cellData);
                $colIndex++;
            }
        }

        // Remove template row if it still has placeholders
        $sheet->removeRow($templateRow, 1);
    }

    /**
     * Find the row containing template placeholders
     *
     * @param PHPExcel_Worksheet $sheet Worksheet
     * @return int|null Row number or null if not found
     */
    protected static function find_template_row($sheet)
    {
        $highestRow = $sheet->getHighestRow();
        $highestCol = $sheet->getHighestColumn();

        for ($row = 1; $row <= $highestRow; $row++) {
            for ($col = 'A'; $col <= $highestCol; $col++) {
                $value = $sheet->getCell($col . $row)->getValue();
                if (is_string($value) && strpos($value, '${') !== false) {
                    return $row;
                }
            }
        }

        return null;
    }

    /**
     * Get row styles
     *
     * @param PHPExcel_Worksheet $sheet Worksheet
     * @param int $row Row number
     * @return array Array of styles
     */
    protected static function get_row_styles($sheet, $row)
    {
        $styles = [];
        $highestCol = $sheet->getHighestColumn();

        for ($col = 'A'; $col <= $highestCol; $col++) {
            $cell = $sheet->getCell($col . $row);
            $styles[$col] = [
                'font' => clone $cell->getStyle()->getFont(),
                'fill' => clone $cell->getStyle()->getFill(),
                'borders' => clone $cell->getStyle()->getBorders(),
                'alignment' => clone $cell->getStyle()->getAlignment(),
            ];
        }

        return $styles;
    }

    /**
     * Copy row styles
     *
     * @param PHPExcel_Worksheet $sheet Worksheet
     * @param int $sourceRow Source row number
     * @param int $targetRow Target row number
     * @param array $styles Pre-fetched styles
     */
    protected static function copy_row_styles($sheet, $sourceRow, $targetRow, $styles)
    {
        foreach ($styles as $col => $style) {
            $targetCell = $sheet->getCell($col . $targetRow);
            $targetCell->getStyle()->applyFromArray([
                'font' => $style['font'],
                'fill' => $style['fill'],
                'borders' => $style['borders'],
                'alignment' => $style['alignment'],
            ]);
        }
    }

    /**
     * Append table data at specified row
     *
     * @param PHPExcel_Worksheet $sheet Worksheet
     * @param array $tableData 2D array of table data
     * @param int $startRow Starting row number
     */
    protected static function append_table_data($sheet, $tableData, $startRow)
    {
        $currentRow = $startRow;

        foreach ($tableData as $rowData) {
            $colIndex = 0;
            foreach ($rowData as $cellData) {
                $col = \PHPExcel_Cell::stringFromColumnIndex($colIndex);
                $sheet->setCellValue($col . $currentRow, $cellData);
                $colIndex++;
            }
            $currentRow++;
        }
    }

    /**
     * Send Excel file download
     *
     * @param PHPExcel $objPHPExcel PHPExcel object
     * @param string $filename Output filename
     */
    protected static function send_excel_download($objPHPExcel, $filename)
    {
        // Determine file format
        if (substr($filename, -5) === '.xlsx') {
            $writerType = 'Excel2007';
            $mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else {
            $writerType = 'Excel5';
            $mimeType = 'application/vnd.ms-excel';
        }

        $objWriter = \PHPExcel_IOFactory::createWriter($objPHPExcel, $writerType);

        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $objWriter->save('php://output');
        exit;
    }
}
