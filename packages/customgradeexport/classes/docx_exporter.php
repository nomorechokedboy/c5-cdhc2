<?php
defined('MOODLE_INTERNAL') || die();

use PhpOffice\PhpWord\TemplateProcessor;

class docx_exporter
{

    /**
     * @param string $templatePath
     * @param array  $variables   simple placeholders (course name, teacher, etc.)
     * @param array  $exportData  output of prepare_export_data()
     * @param string $filename
     */
    public static function export_course_template(
        string $templatePath,
        array $variables,
        array $exportData,
        string $filename
    ) {
        $templateProcessor = new TemplateProcessor($templatePath);

        // Simple placeholders
        foreach ($variables as $key => $value) {
            $templateProcessor->setValue($key, $value);
        }

        // Table rows
        $rows = $exportData['docx'] ?? [];

        if (!empty($rows)) {

            // Clone table row using ${stt}
            $templateProcessor->cloneRow('stt', count($rows));

            $rowNum = 1;
            foreach ($rows as $row) {
                foreach ($row as $key => $value) {
                    $templateProcessor->setValue(
                        $key . '#' . $rowNum,
                        $value === null ? '' : $value
                    );
                }
                $rowNum++;
            }
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'docx_');
        $templateProcessor->saveAs($tempFile);

        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($tempFile));

        readfile($tempFile);
        unlink($tempFile);
        exit;
    }
}
