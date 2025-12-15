<?php
/**
 * Script to create example course export template
 * Run this to generate a sample Excel template
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/phpexcel/PHPExcel.php');

// Create new PHPExcel object
$objPHPExcel = new PHPExcel();

// Set document properties
$objPHPExcel->getProperties()
    ->setCreator("Moodle Custom Grade Export")
    ->setTitle("Course Grade Export Template")
    ->setSubject("Grade Export Template")
    ->setDescription("Template for exporting course grades with exam types");

// Get active sheet
$sheet = $objPHPExcel->getActiveSheet();
$sheet->setTitle('Grades');

// Set up styles
$headerStyle = [
    'font' => ['bold' => true, 'size' => 14],
    'alignment' => ['horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_CENTER],
];

$subHeaderStyle = [
    'font' => ['bold' => true, 'size' => 11],
];

$tableHeaderStyle = [
    'font' => ['bold' => true],
    'fill' => [
        'type' => PHPExcel_Style_Fill::FILL_SOLID,
        'color' => ['rgb' => 'CCCCCC']
    ],
    'borders' => [
        'allborders' => [
            'style' => PHPExcel_Style_Border::BORDER_THIN
        ]
    ],
    'alignment' => [
        'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_CENTER,
        'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER,
    ],
];

$dataCellStyle = [
    'borders' => [
        'allborders' => [
            'style' => PHPExcel_Style_Border::BORDER_THIN
        ]
    ],
];

// --- Header Section ---
$sheet->setCellValue('A1', 'KẾT QUẢ TỔNG KẾT MÔN HỌC');
$sheet->mergeCells('A1:Q1');
$sheet->getStyle('A1')->applyFromArray($headerStyle);
$sheet->getRowDimension('1')->setRowHeight(25);

$sheet->setCellValue('A2', 'MÔN: ${coursename}');
$sheet->getStyle('A2')->applyFromArray($subHeaderStyle);

$sheet->setCellValue('A3', 'LỚP: ${courseshortname}');
$sheet->getStyle('A3')->applyFromArray($subHeaderStyle);

$sheet->setCellValue('A4', 'Ngày xuất: ${exportdate} ${exporttime}');

// --- Table Headers ---
$currentRow = 6;

// Main header row 1 - Merged cells
$sheet->setCellValue('A' . $currentRow, 'TT');
$sheet->mergeCells('A' . $currentRow . ':A' . ($currentRow + 2));

$sheet->setCellValue('B' . $currentRow, 'Họ và tên');
$sheet->mergeCells('B' . $currentRow . ':B' . ($currentRow + 2));

$sheet->setCellValue('C' . $currentRow, 'Mã số');
$sheet->mergeCells('C' . $currentRow . ':C' . ($currentRow + 2));

// CÁC ĐIỂM KIỂM TRA (D-L)
$sheet->setCellValue('D' . $currentRow, 'CÁC ĐIỂM KIỂM TRA');
$sheet->mergeCells('D' . $currentRow . ':L' . $currentRow);

// ĐIỂM THI (M-N)
$sheet->setCellValue('M' . $currentRow, 'ĐIỂM THI');
$sheet->mergeCells('M' . $currentRow . ':N' . $currentRow);

// TỔNG KẾT MH (O-P)
$sheet->setCellValue('O' . $currentRow, 'TỔNG KẾT MH');
$sheet->mergeCells('O' . $currentRow . ':P' . $currentRow);

// Ghi chú
$sheet->setCellValue('Q' . $currentRow, 'Ghi chú');
$sheet->mergeCells('Q' . $currentRow . ':Q' . ($currentRow + 2));

// Sub-header row 1
$currentRow++;

// Thường xuyên (D-F)
$sheet->setCellValue('D' . $currentRow, 'Thường xuyên');
$sheet->mergeCells('D' . $currentRow . ':F' . $currentRow);

// Định kỳ (G-I)  
$sheet->setCellValue('G' . $currentRow, 'Định kỳ');
$sheet->mergeCells('G' . $currentRow . ':I' . $currentRow);

// TB kiểm tra (J-L)
$sheet->setCellValue('J' . $currentRow, 'TB kiểm tra');
$sheet->mergeCells('J' . $currentRow . ':L' . $currentRow);

// Điểm thi columns
$sheet->setCellValue('M' . $currentRow, 'Lần thứ');
$sheet->mergeCells('M' . $currentRow . ':N' . $currentRow);

// TKMH columns
$sheet->setCellValue('O' . $currentRow, 'Tổng kết');
$sheet->mergeCells('O' . $currentRow . ':O' . ($currentRow + 1));

$sheet->setCellValue('P' . $currentRow, 'Xếp loại');
$sheet->mergeCells('P' . $currentRow . ':P' . ($currentRow + 1));

// Column numbers row
$currentRow++;

// 15P columns (D-F)
$sheet->setCellValue('D' . $currentRow, '01');
$sheet->setCellValue('E' . $currentRow, '02');
$sheet->setCellValue('F' . $currentRow, '03');

// 1T columns (G-I)
$sheet->setCellValue('G' . $currentRow, '01');
$sheet->setCellValue('H' . $currentRow, '02');
$sheet->setCellValue('I' . $currentRow, '03');

// TB columns (J-L)
$sheet->setCellValue('J' . $currentRow, '15P');
$sheet->setCellValue('K' . $currentRow, '1T');
$sheet->setCellValue('L' . $currentRow, 'Chung');

// Thi columns (M-N)
$sheet->setCellValue('M' . $currentRow, '01');
$sheet->setCellValue('N' . $currentRow, '02');

// Apply header styles
for ($row = 6; $row <= 8; $row++) {
    for ($col = 'A'; $col <= 'Q'; $col++) {
        $sheet->getStyle($col . $row)->applyFromArray($tableHeaderStyle);
    }
}

// --- Data Row Template ---
$currentRow = 9;

$sheet->setCellValue('A' . $currentRow, '${rownum}');
$sheet->setCellValue('B' . $currentRow, '${firstname} ${lastname}');
$sheet->setCellValue('C' . $currentRow, '${idnumber}');
$sheet->setCellValue('D' . $currentRow, '${15p_01}');
$sheet->setCellValue('E' . $currentRow, '${15p_02}');
$sheet->setCellValue('F' . $currentRow, '${15p_03}');
$sheet->setCellValue('G' . $currentRow, '${1t_01}');
$sheet->setCellValue('H' . $currentRow, '${1t_02}');
$sheet->setCellValue('I' . $currentRow, '${1t_03}');
$sheet->setCellValue('J' . $currentRow, '${avg_15p}');
$sheet->setCellValue('K' . $currentRow, '${avg_1t}');
$sheet->setCellValue('L' . $currentRow, '${avg_check}');
$sheet->setCellValue('M' . $currentRow, '${thi_01}');
$sheet->setCellValue('N' . $currentRow, '${thi_02}');
$sheet->setCellValue('O' . $currentRow, '${tkmh}');
$sheet->setCellValue('P' . $currentRow, '${classification}');
$sheet->setCellValue('Q' . $currentRow, '');

// Apply data cell styles
for ($col = 'A'; $col <= 'Q'; $col++) {
    $sheet->getStyle($col . $currentRow)->applyFromArray($dataCellStyle);
}

// --- Set column widths ---
$sheet->getColumnDimension('A')->setWidth(5);   // TT
$sheet->getColumnDimension('B')->setWidth(25);  // Họ tên
$sheet->getColumnDimension('C')->setWidth(12);  // Mã số
$sheet->getColumnDimension('D')->setWidth(7);   // 15P-01
$sheet->getColumnDimension('E')->setWidth(7);   // 15P-02
$sheet->getColumnDimension('F')->setWidth(7);   // 15P-03
$sheet->getColumnDimension('G')->setWidth(7);   // 1T-01
$sheet->getColumnDimension('H')->setWidth(7);   // 1T-02
$sheet->getColumnDimension('I')->setWidth(7);   // 1T-03
$sheet->getColumnDimension('J')->setWidth(7);   // TB 15P
$sheet->getColumnDimension('K')->setWidth(7);   // TB 1T
$sheet->getColumnDimension('L')->setWidth(7);   // TB Chung
$sheet->getColumnDimension('M')->setWidth(7);   // Thi-01
$sheet->getColumnDimension('N')->setWidth(7);   // Thi-02
$sheet->getColumnDimension('O')->setWidth(8);   // TKMH
$sheet->getColumnDimension('P')->setWidth(10);  // Xếp loại
$sheet->getColumnDimension('Q')->setWidth(15);  // Ghi chú

// --- Summary Section ---
$summaryRow = $currentRow + 2;

$sheet->setCellValue('A' . $summaryRow, 'Kết quả: Xuất sắc _____ tỷ lệ _____%; Giỏi _____ tỷ lệ _____%; Khá _____ tỷ lệ _____%;');
$sheet->mergeCells('A' . $summaryRow . ':Q' . $summaryRow);

$summaryRow++;
$sheet->setCellValue('A' . $summaryRow, 'Trung bình _____ tỷ lệ _____%; Yếu _____ tỷ lệ _____%;');
$sheet->mergeCells('A' . $summaryRow . ':Q' . $summaryRow);

// --- Footer Section ---
$footerRow = $summaryRow + 2;

$sheet->setCellValue('C' . $footerRow, 'Trưởng ban KT&ĐBCLGDĐT');
$sheet->setCellValue('H' . $footerRow, 'Chủ nhiệm khoa');
$sheet->setCellValue('M' . $footerRow, 'Giảng viên');

// Save Excel file
$outputPath = $CFG->dataroot . '/temp/course_template_example.xlsx';
$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel2007');
$objWriter->save($outputPath);

echo "✓ Example template created: $outputPath\n";
echo "\nYou can now:\n";
echo "1. Download this file\n";
echo "2. Customize it as needed\n";
echo "3. Upload it via: Site admin → Plugins → Local plugins → Custom Grade Export\n";
echo "\nTemplate includes:\n";
echo "- Variable placeholders for course info\n";
echo "- Dynamic columns for 15P, 1T, Thi grades\n";
echo "- TKMH calculation column\n";
echo "- Classification column\n";
