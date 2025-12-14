<?php
/**
 * Script to create sample DOCX template
 * Run this once to generate example templates
 */

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/vendor/autoload.php');

use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\SimpleType\Jc;

// Create sample quiz template
function create_quiz_template() {
    $phpWord = new PhpWord();
    $section = $phpWord->addSection();
    
    // Title
    $section->addText('QUIZ GRADE REPORT', 
        ['bold' => true, 'size' => 18], 
        ['alignment' => Jc::CENTER]
    );
    $section->addTextBreak(1);
    
    // Course info
    $section->addText('Course: ${coursename}', ['size' => 12]);
    $section->addText('Quiz: ${activityname}', ['size' => 12]);
    $section->addText('Export Date: ${exportdate} at ${exporttime}', ['size' => 10]);
    $section->addTextBreak(2);
    
    // Instructions
    $section->addText('Student Grades', ['bold' => true, 'size' => 14]);
    $section->addTextBreak(1);
    
    // Table
    $table = $section->addTable(['borderSize' => 6, 'borderColor' => '000000']);
    
    // Header row
    $table->addRow(400);
    $table->addCell(1500, ['bgColor' => 'CCCCCC'])->addText('First Name', ['bold' => true]);
    $table->addCell(1500, ['bgColor' => 'CCCCCC'])->addText('Last Name', ['bold' => true]);
    $table->addCell(1200, ['bgColor' => 'CCCCCC'])->addText('ID Number', ['bold' => true]);
    $table->addCell(2000, ['bgColor' => 'CCCCCC'])->addText('Institution', ['bold' => true]);
    $table->addCell(2000, ['bgColor' => 'CCCCCC'])->addText('Department', ['bold' => true]);
    $table->addCell(800, ['bgColor' => 'CCCCCC'])->addText('Grade', ['bold' => true]);
    $table->addCell(1000, ['bgColor' => 'CCCCCC'])->addText('Percentage', ['bold' => true]);
    
    // Data row with placeholders
    $table->addRow();
    $table->addCell(1500)->addText('${firstname}');
    $table->addCell(1500)->addText('${lastname}');
    $table->addCell(1200)->addText('${idnumber}');
    $table->addCell(2000)->addText('${institution}');
    $table->addCell(2000)->addText('${department}');
    $table->addCell(800)->addText('${grade}');
    $table->addCell(1000)->addText('${percentage}');
    
    // Save
    $objWriter = IOFactory::createWriter($phpWord, 'Word2007');
    $objWriter->save('/tmp/quiz_template_sample.docx');
    
    echo "Quiz template created: /tmp/quiz_template_sample.docx\n";
}

// Create sample assignment template
function create_assign_template() {
    $phpWord = new PhpWord();
    $section = $phpWord->addSection();
    
    // Title
    $section->addText('ASSIGNMENT GRADE REPORT', 
        ['bold' => true, 'size' => 18], 
        ['alignment' => Jc::CENTER]
    );
    $section->addTextBreak(1);
    
    // Course info
    $section->addText('Course: ${coursename}', ['size' => 12]);
    $section->addText('Assignment: ${activityname}', ['size' => 12]);
    $section->addText('Export Date: ${exportdate} at ${exporttime}', ['size' => 10]);
    $section->addTextBreak(2);
    
    // Table
    $table = $section->addTable(['borderSize' => 6, 'borderColor' => '000000']);
    
    // Header row
    $table->addRow(400);
    $table->addCell(1500, ['bgColor' => 'CCCCCC'])->addText('First Name', ['bold' => true]);
    $table->addCell(1500, ['bgColor' => 'CCCCCC'])->addText('Last Name', ['bold' => true]);
    $table->addCell(2000, ['bgColor' => 'CCCCCC'])->addText('Department', ['bold' => true]);
    $table->addCell(1000, ['bgColor' => 'CCCCCC'])->addText('Status', ['bold' => true]);
    $table->addCell(800, ['bgColor' => 'CCCCCC'])->addText('Grade', ['bold' => true]);
    $table->addCell(1000, ['bgColor' => 'CCCCCC'])->addText('Percentage', ['bold' => true]);
    
    // Data row
    $table->addRow();
    $table->addCell(1500)->addText('${firstname}');
    $table->addCell(1500)->addText('${lastname}');
    $table->addCell(2000)->addText('${department}');
    $table->addCell(1000)->addText('${status}');
    $table->addCell(800)->addText('${grade}');
    $table->addCell(1000)->addText('${percentage}');
    
    // Save
    $objWriter = IOFactory::createWriter($phpWord, 'Word2007');
    $objWriter->save('/tmp/assign_template_sample.docx');
    
    echo "Assignment template created: /tmp/assign_template_sample.docx\n";
}

// Run
if (php_sapi_name() === 'cli') {
    create_quiz_template();
    create_assign_template();
    echo "\nSample templates created successfully!\n";
    echo "Upload them via: Site admin → Plugins → Local plugins → Custom Grade Export\n";
}
