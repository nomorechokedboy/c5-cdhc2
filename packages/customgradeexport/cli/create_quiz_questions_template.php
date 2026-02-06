<?php

/**
 * Script to create example quiz questions export template
 * Run this to generate a sample DOCX template
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../vendor/autoload.php');

use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\SimpleType\Jc;

// Create new PHPWord object
$phpWord = new PhpWord();

// Set document properties
$phpWord->getDocInfo()
    ->setCreator('Moodle Custom Grade Export')
    ->setTitle('Quiz Questions Export Template')
    ->setSubject('Quiz Questions Template');

// Add section
$section = $phpWord->addSection([
    'marginLeft' => 1000,
    'marginRight' => 1000,
    'marginTop' => 1000,
    'marginBottom' => 1000,
]);

// --- Header Section ---
$section->addText(
    '${quiz_name}',
    ['bold' => true, 'size' => 18],
    ['alignment' => Jc::CENTER]
);

$section->addText(
    '${course_name}',
    ['size' => 12],
    ['alignment' => Jc::CENTER]
);

$section->addTextBreak(1);

// Quiz information table
$table = $section->addTable([
    'borderSize' => 6,
    'borderColor' => '999999',
    'cellMargin' => 80,
]);

$table->addRow();
$table->addCell(3000)->addText('Total Questions:', ['bold' => true]);
$table->addCell(3000)->addText('${total_questions}');

$table->addRow();
$table->addCell(3000)->addText('Total Marks:', ['bold' => true]);
$table->addCell(3000)->addText('${total_marks}');

$table->addRow();
$table->addCell(3000)->addText('Export Date:', ['bold' => true]);
$table->addCell(3000)->addText('${export_date}');

$section->addTextBreak(2);

// --- Instructions Section ---
$section->addText(
    'Instructions for Students',
    ['bold' => true, 'size' => 14]
);

$section->addTextBreak(1);

$section->addText('• Answer all questions');
$section->addText('• Write your answers clearly');
$section->addText('• Time allowed: _____ minutes');

$section->addTextBreak(2);

// --- Questions Section ---
$section->addText(
    'Questions',
    ['bold' => true, 'size' => 14, 'underline' => 'single']
);

$section->addTextBreak(1);

// Question template row
// This will be cloned for each question
$section->addText(
    'Question ${question_number} (${question_type}) - ${question_marks} marks',
    ['bold' => true, 'size' => 12]
);

$section->addTextBreak(0.5);

$section->addText(
    '${question_text}',
    ['size' => 11]
);

$section->addTextBreak(0.5);

$section->addText(
    '${question_answers}',
    ['size' => 11]
);

$section->addTextBreak(2);

// --- Answer Sheet Section (Optional) ---
$section->addPageBreak();

$section->addText(
    'Answer Sheet',
    ['bold' => true, 'size' => 16],
    ['alignment' => Jc::CENTER]
);

$section->addTextBreak(1);

$section->addText('Student Name: ___________________________');
$section->addText('Student ID: ___________________________');
$section->addText('Date: ___________________________');

$section->addTextBreak(2);

// Create answer table
$answerTable = $section->addTable([
    'borderSize' => 6,
    'borderColor' => '000000',
    'cellMargin' => 80,
]);

// Header row
$answerTable->addRow();
$answerTable->addCell(1500, ['bgColor' => 'CCCCCC'])->addText('Question', ['bold' => true]);
$answerTable->addCell(6000, ['bgColor' => 'CCCCCC'])->addText('Answer', ['bold' => true]);

// Sample answer rows (students will fill these)
for ($i = 1; $i <= 10; $i++) {
    $answerTable->addRow();
    $answerTable->addCell(1500)->addText($i);
    $answerTable->addCell(6000)->addText('');
}

// Save file
$outputPath = $CFG->dataroot . '/temp/quiz_questions_template_example.docx';

// Create directory if it doesn't exist
$dir = dirname($outputPath);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$objWriter = IOFactory::createWriter($phpWord, 'Word2007');
$objWriter->save($outputPath);

echo "✓ Example quiz questions template created: $outputPath\n";
echo "\nTemplate includes:\n";
echo "- Quiz information header with variables\n";
echo "- Question template row with placeholders\n";
echo "- Answer sheet section\n";
echo "\nYou can now:\n";
echo "1. Download this file\n";
echo "2. Customize it as needed\n";
echo "3. Upload it via: Manage Templates → Quiz Questions\n";
echo "\nVariable placeholders:\n";
echo "- \${quiz_name} - Quiz name\n";
echo "- \${course_name} - Course name\n";
echo "- \${total_questions} - Total number of questions\n";
echo "- \${total_marks} - Total marks\n";
echo "- \${export_date} - Export date\n";
echo "- \${question_number} - Question number (will be cloned)\n";
echo "- \${question_type} - Question type\n";
echo "- \${question_text} - Question text\n";
echo "- \${question_marks} - Question marks\n";
echo "- \${question_answers} - Question answers\n";
