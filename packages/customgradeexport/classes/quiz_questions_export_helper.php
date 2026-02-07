<?php

/**
 * Quiz questions export helper class - Exports quiz questions
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_once($CFG->dirroot . '/question/engine/lib.php');
require_once($CFG->dirroot . '/lib/weblib.php');

/**
 * Helper class for exporting quiz questions to DOCX
 */
class quiz_questions_export_helper
{
    /** @var \stdClass Quiz instance */
    protected $quiz;

    /** @var \stdClass Course module */
    protected $cm;

    /** @var \stdClass Course */
    protected $course;

    /** @var \context_module Context */
    protected $context;

    /**
     * Constructor
     *
     * @param \stdClass $quiz Quiz instance
     * @param \stdClass $cm Course module
     * @param \stdClass $course Course
     */
    public function __construct($quiz, $cm, $course)
    {
        $this->quiz = $quiz;
        $this->cm = $cm;
        $this->course = $course;
        $this->context = \context_module::instance($cm->id);
    }

    /**
     * Export quiz questions to DOCX
     *
     * @param string|null $templatePath Optional path to template file
     * @param bool $includeAnswers Whether to include answers
     * @param bool $randomize Whether to randomize questions (not used for now)
     */
    public function export_questions($templatePath = null, $includeAnswers = false, $randomize = true)
    {
        global $CFG;

        require_capability('mod/quiz:viewreports', $this->context);
        require_capability('local/customgradeexport:export', $this->context);

        // Get quiz questions
        $questions = $this->get_quiz_questions();

        // Prepare export data
        $exportdata = $this->prepare_questions_data($questions, $includeAnswers);

        $filename = clean_filename($this->course->shortname . '_' .
            $this->quiz->name . '_questions.docx');

        if ($templatePath && file_exists($templatePath)) {
            // Use provided template
            $this->export_with_template($exportdata, $templatePath, $filename);
        } else {
            // Use default format
            $this->export_with_default_format($exportdata, $filename);
        }
    }

    /**
     * Get quiz questions from slots
     *
     * @return array Array of question data
     */
    protected function get_quiz_questions()
    {
        global $DB;

        $questions = [];
        $questionNumber = 1;

        // Get all slots for this quiz
        $slots = $DB->get_records('quiz_slots', ['quizid' => $this->quiz->id], 'slot ASC');

        foreach ($slots as $slot) {
            // Check if this slot has a real question ID or is random
            if (empty($slot->questionid) || $slot->questionid == 0) {
                // This is a random question slot
                $questions[] = $this->format_random_question($slot, $questionNumber++);
            } else {
                // This is a fixed question
                try {
                    $question = \question_bank::load_question($slot->questionid);
                    $question->qtype->get_question_options($question);
                    $questions[] = $this->format_question($question, $questionNumber++, $slot);
                } catch (\Exception $e) {
                    debugging('Could not load question ' . $slot->questionid . ': ' . $e->getMessage(), DEBUG_DEVELOPER);
                    // Add placeholder for broken question
                    $questions[] = [
                        'number' => $questionNumber++,
                        'slot' => $slot->slot,
                        'type' => 'unknown',
                        'name' => '[Question Not Found]',
                        'text' => 'Question ID ' . $slot->questionid . ' could not be loaded.',
                        'questiontext' => 'Question ID ' . $slot->questionid . ' could not be loaded.',
                        'answers' => [],
                        'grade' => $slot->maxmark,
                        'is_random' => false,
                    ];
                }
            }
        }

        return $questions;
    }

    /**
     * Format a random question slot - fetch an actual question from the category
     *
     * @param \stdClass $slot Slot record
     * @param int $questionNumber Question number
     * @return array Question data
     */
    protected function format_random_question($slot, $questionNumber)
    {
        global $DB;

        // Try to get category information from question_set_references
        $qsetref = $DB->get_record('question_set_references', [
            'component' => 'mod_quiz',
            'questionarea' => 'slot',
            'itemid' => $slot->id
        ]);

        if ($qsetref && !empty($qsetref->filtercondition)) {
            $filter = json_decode($qsetref->filtercondition, true);
            if (isset($filter['questioncategoryid'])) {
                $categoryid = $filter['questioncategoryid'];

                // Moodle 5.0 uses question_bank_entries and question_versions
                $sql = "SELECT q.*
                        FROM {question} q
                        JOIN {question_versions} qv ON qv.questionid = q.id
                        JOIN {question_bank_entries} qbe ON qbe.id = qv.questionbankentryid
                        WHERE qbe.questioncategoryid = :categoryid
                          AND q.qtype != 'random'
                          AND q.parent = 0
                          AND qv.status = 'ready'
                        ORDER BY RAND()
                        LIMIT 1";

                $questionrecord = $DB->get_record_sql($sql, ['categoryid' => $categoryid]);

                if ($questionrecord) {
                    // We found a question! Load it fully and format it
                    try {
                        $question = \question_bank::load_question($questionrecord->id);
                        $question->qtype->get_question_options($question);
                        $formattedQuestion = $this->format_question($question, $questionNumber, $slot);
                        // Mark it as coming from a random slot
                        $formattedQuestion['is_random'] = true;
                        // Ensure type is a string before concatenation
                        $originalType = (string)$formattedQuestion['type'];
                        $formattedQuestion['type'] = 'random-' . $originalType; // e.g., "random-multichoice"
                        return $formattedQuestion;
                    } catch (\Exception $e) {
                        debugging('Could not load random question ' . $questionrecord->id . ': ' . $e->getMessage(), DEBUG_DEVELOPER);
                    }
                }

                // If we couldn't get a question, show placeholder with category info
                $category = $DB->get_record('question_categories', ['id' => $categoryid]);
                $categoryInfo = $category ? 'category "' . $category->name . '"' : 'category ID ' . $categoryid;

                return [
                    'number' => $questionNumber,
                    'slot' => $slot->slot,
                    'type' => 'random',
                    'name' => '[No Questions Available]',
                    'text' => 'No questions found in ' . $categoryInfo . '. Please add questions to this category.',
                    'questiontext' => 'No questions found in ' . $categoryInfo . '. Please add questions to this category.',
                    'answers' => [],
                    'grade' => $slot->maxmark,
                    'is_random' => true,
                ];
            }
        }

        // Fallback if we can't determine the category
        return [
            'number' => $questionNumber,
            'slot' => $slot->slot,
            'type' => 'random',
            'name' => '[Random Question]',
            'text' => 'A random question will be selected from the question bank when students take this quiz.',
            'questiontext' => 'A random question will be selected from the question bank when students take this quiz.',
            'answers' => [],
            'grade' => $slot->maxmark,
            'is_random' => true,
        ];
    }

    /**
     * Format question for export
     *
     * @param \stdClass $question Question object
     * @param int $number Question number
     * @param \stdClass $slot Slot record
     * @return array Question data array
     */
    protected function format_question($question, $number, $slot)
    {
        // Ensure qtype is a string
        $qtype = $question->qtype->name();

        $data = [
            'number' => $number,
            'slot' => $slot->slot,
            'type' => $qtype,
            'name' => $question->name,
            'text' => $this->clean_question_text($question->questiontext),
            'questiontext' => $this->clean_question_text($question->questiontext),
            'grade' => $slot->maxmark,
            'is_random' => false,
            'answers' => [],
        ];

        // Add type-specific formatting
        switch ($qtype) {
            case 'multichoice':
                $data['answers'] = $this->format_multichoice_answers($question);
                $data['single_answer'] = $question->options->single ?? 1;
                break;

            case 'truefalse':
                $data['answers'] = $this->format_truefalse_answers($question);
                break;

            case 'shortanswer':
                $data['answers'] = $this->format_shortanswer_answers($question);
                break;

            case 'essay':
                $data['response_format'] = $this->get_essay_response_format($question);
                break;

            case 'matching':
                $data['subquestions'] = $this->format_matching_subquestions($question);
                break;

            case 'numerical':
                $data['answers'] = $this->format_numerical_answers($question);
                break;

            case 'calculated':
                $data['formula'] = $question->options->formula ?? '';
                $data['answers'] = $this->format_calculated_answers($question);
                break;
        }

        return $data;
    }

    /**
     * Clean question text (remove HTML, keep formatting)
     *
     * @param string $text Question text
     * @return string Cleaned text
     */
    protected function clean_question_text($text)
    {
        // Remove HTML tags but keep line breaks
        $text = html_to_text($text, 0, false);
        return trim($text);
    }

    /**
     * Format multichoice answers
     *
     * @param \stdClass $question Question object
     * @return array Array of answers
     */
    protected function format_multichoice_answers($question)
    {
        $answers = [];

        if (isset($question->options->answers)) {
            foreach ($question->options->answers as $answer) {
                $answers[] = [
                    'text' => $this->clean_question_text($answer->answer ?? ''),
                    'fraction' => $answer->fraction,
                    'is_correct' => $answer->fraction > 0,
                    'feedback' => $this->clean_question_text($answer->feedback ?? ''),
                ];
            }
        }

        return $answers;
    }

    /**
     * Format true/false answers
     *
     * @param \stdClass $question Question object
     * @return array Array of answers
     */
    protected function format_truefalse_answers($question)
    {
        $answers = [];

        if (!empty($question->options->trueanswer)) {
            $answers[] = [
                'text' => 'True',
                'is_correct' => $question->options->trueanswer->fraction > 0,
            ];
        }

        if (!empty($question->options->falseanswer)) {
            $answers[] = [
                'text' => 'False',
                'is_correct' => $question->options->falseanswer->fraction > 0,
            ];
        }

        return $answers;
    }

    /**
     * Format short answer answers
     *
     * @param \stdClass $question Question object
     * @return array Array of answers
     */
    protected function format_shortanswer_answers($question)
    {
        $answers = [];

        if (isset($question->options->answers)) {
            foreach ($question->options->answers as $answer) {
                $answers[] = [
                    'text' => $answer->answer,
                    'fraction' => $answer->fraction,
                    'is_correct' => $answer->fraction > 0,
                ];
            }
        }

        return $answers;
    }

    /**
     * Get essay response format
     *
     * @param \stdClass $question Question object
     * @return string Response format description
     */
    protected function get_essay_response_format($question)
    {
        $formats = [
            'editor' => 'HTML editor',
            'editorfilepicker' => 'HTML editor with file picker',
            'plain' => 'Plain text',
            'monospaced' => 'Plain text (monospaced)',
        ];

        $format = $question->options->responseformat ?? 'editor';
        return $formats[$format] ?? 'HTML editor';
    }

    /**
     * Format matching subquestions
     *
     * @param \stdClass $question Question object
     * @return array Array of subquestions
     */
    protected function format_matching_subquestions($question)
    {
        $subquestions = [];

        if (isset($question->options->subquestions)) {
            foreach ($question->options->subquestions as $subq) {
                $subquestions[] = [
                    'question' => $this->clean_question_text($subq->questiontext),
                    'answer' => $subq->answertext,
                ];
            }
        }

        return $subquestions;
    }

    /**
     * Format numerical answers
     *
     * @param \stdClass $question Question object
     * @return array Array of answers
     */
    protected function format_numerical_answers($question)
    {
        $answers = [];

        if (isset($question->options->answers)) {
            foreach ($question->options->answers as $answer) {
                $answers[] = [
                    'value' => $answer->answer,
                    'tolerance' => $answer->tolerance ?? 0,
                    'fraction' => $answer->fraction,
                ];
            }
        }

        return $answers;
    }

    /**
     * Format calculated answers
     *
     * @param \stdClass $question Question object
     * @return array Array of answers
     */
    protected function format_calculated_answers($question)
    {
        $answers = [];

        if (isset($question->options->answers)) {
            foreach ($question->options->answers as $answer) {
                $answers[] = [
                    'answer' => $answer->answer,
                    'tolerance' => $answer->tolerance ?? 0,
                    'tolerancetype' => $answer->tolerancetype ?? 1,
                    'fraction' => $answer->fraction,
                ];
            }
        }

        return $answers;
    }

    /**
     * Prepare questions data for export
     *
     * @param array $questions Array of question data
     * @param bool $includeAnswers Whether to include answers
     * @return array Prepared data
     */
    protected function prepare_questions_data($questions, $includeAnswers)
    {
        $data = [
            'quiz_name' => $this->quiz->name,
            'course_name' => $this->course->fullname,
            'course_shortname' => $this->course->shortname,
            'total_questions' => count($questions),
            'total_marks' => array_sum(array_column($questions, 'grade')),
            'export_date' => userdate(time(), '%d/%m/%Y'),
            'export_datetime' => userdate(time(), '%d/%m/%Y %H:%M:%S'),
            'questions' => [],
            'questions_kv' => [], // Key-value format for template processing
        ];

        foreach ($questions as $question) {
            $basetype = $question['type'];
            if (strpos($basetype, 'random-') === 0) {
                $basetype = substr($basetype, 7); // remove "random-"
            }

            $qdata = [
                'number' => $question['number'],
                'type' => $this->get_question_type_name($question['type']),
                'text' => $question['text'],
                'marks' => $question['grade'],
            ];

            // Key-value format for easier template variable replacement
            $qdata_kv = [
                'question_number' => $question['number'],
                'question_type' => $this->get_question_type_name($question['type']),
                'question_text' => $question['text'],
                'question_marks' => $question['grade'],
                'question_answers' => '',
            ];

            if ($includeAnswers) {

                // Multiple choice / truefalse / shortanswer
                if (!empty($question['answers']) && is_array($question['answers'])) {
                    $answersText = '';

                    foreach ($question['answers'] as $idx => $answer) {
                        $letter = chr(65 + $idx);
                        $text = $answer['text'] ?? $answer['answer'] ?? $answer['value'] ?? '';

                        if ($text === '') {
                            continue;
                        }

                        $answersText .= $letter . ') ';
                        if (!empty($answer['is_correct']) || ($answer['fraction'] ?? 0) > 0) {
                            $answersText .=  $text . '✔';
                        } else {
                            $answersText .= $text;
                        }
                        $answersText .= "<w:br/>";
                    }

                    $qdata_kv['question_answers'] = trim($answersText) ?: '[No answer data]';

                    // Matching questions
                } elseif (!empty($question['subquestions'])) {
                    $subqText = '';
                    foreach ($question['subquestions'] as $idx => $subq) {
                        $subqText .= ($idx + 1) . '. '
                            . $subq['question'] . ' → ' . $subq['answer'] . "\n";
                    }
                    $qdata_kv['question_answers'] = trim($subqText);

                    // Essay
                } elseif (($basetype ?? '') === 'essay') {
                    $qdata_kv['question_answers'] = '[Essay – no fixed answer]';

                    // Fallback
                } else {
                    $qdata_kv['question_answers'] = '[Open-ended question]';
                }
            } else {
                $qdata_kv['question_answers'] = '';
            }

            // Add type-specific data
            if ($basetype === 'matching' && isset($question['subquestions'])) {
                $qdata['subquestions'] = $question['subquestions'];

                // Format subquestions for template
                $subqText = '';
                foreach ($question['subquestions'] as $idx => $subq) {
                    $subqText .= ($idx + 1) . '. ' . $subq['question'] . ' → ' . $subq['answer'] . "\n";
                }
                $qdata_kv['question_answers'] = trim($subqText);
            }

            if ($basetype === 'essay') {
                $qdata['response_format'] = $question['response_format'] ?? 'HTML editor';
                $qdata_kv['response_format'] = $question['response_format'] ?? 'HTML editor';
            }

            $data['questions'][] = $qdata;
            $data['questions_kv'][] = $qdata_kv;
        }

        return $data;
    }

    /**
     * Get human-readable question type name
     *
     * @param string $type Question type
     * @return string Type name
     */
    protected function get_question_type_name($type)
    {
        $types = [
            'multichoice' => 'Multiple Choice',
            'truefalse' => 'True/False',
            'shortanswer' => 'Short Answer',
            'essay' => 'Essay',
            'matching' => 'Matching',
            'numerical' => 'Numerical',
            'calculated' => 'Calculated',
            'random' => 'Random Question',
            'random-multichoice' => 'Multiple Choice (Random)',
            'random-truefalse' => 'True/False (Random)',
            'random-shortanswer' => 'Short Answer (Random)',
            'random-essay' => 'Essay (Random)',
            'random-matching' => 'Matching (Random)',
            'random-numerical' => 'Numerical (Random)',
            'random-calculated' => 'Calculated (Random)',
            'unknown' => 'Unknown',
        ];

        return $types[$type] ?? ucfirst($type);
    }

    /**
     * Export with template
     *
     * @param array $data Export data
     * @param string $templatePath Template file path
     * @param string $filename Output filename
     */
    protected function export_with_template($data, $templatePath, $filename)
    {
        if (!docx_exporter::is_available()) {
            throw new \moodle_exception('PHPWord library not installed');
        }

        try {
            $processor = new \PhpOffice\PhpWord\TemplateProcessor($templatePath);

            // ===== Basic variables =====
            $processor->setValue('quiz_name', $data['quiz_name']);
            $processor->setValue('course_name', $data['course_name']);
            $processor->setValue('course_shortname', $data['course_shortname']);
            $processor->setValue('total_questions', $data['total_questions']);
            $processor->setValue('total_marks', $data['total_marks']);
            $processor->setValue('export_date', $data['export_date']);
            $processor->setValue('export_datetime', $data['export_datetime']);

            // ===== QUESTIONS BLOCK =====
            $questions = $data['questions_kv'];

            if (!empty($questions)) {
                // Clone the block ONCE
                $processor->cloneBlock('questions_block', count($questions), true, true);

                // Fill indexed placeholders
                foreach ($questions as $index => $q) {
                    $i = $index + 1;

                    $processor->setValue("question_number#{$i}", $q['question_number']);
                    $processor->setValue("question_type#{$i}", $q['question_type']);
                    $processor->setValue("question_marks#{$i}", $q['question_marks']);
                    $processor->setValue("question_text#{$i}", $q['question_text']);
                    $processor->setValue("question_answers#{$i}", $q['question_answers']);
                }
            }

            // ===== Output =====
            header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Cache-Control: max-age=0');
            header('Pragma: public');

            $processor->saveAs('php://output');
            exit;
        } catch (\Exception $e) {
            debugging('Template processing error: ' . $e->getMessage(), DEBUG_DEVELOPER);
            throw new \moodle_exception(
                'errorprocessingtemplate',
                'local_customgradeexport',
                '',
                null,
                $e->getMessage()
            );
        }
    }

    /**
     * Export with default format
     *
     * @param array $data Export data
     * @param string $filename Output filename
     */
    protected function export_with_default_format($data, $filename)
    {
        if (!docx_exporter::is_available()) {
            throw new \moodle_exception('PHPWord library not installed');
        }

        $phpWord = new \PhpOffice\PhpWord\PhpWord();

        // Add section
        $section = $phpWord->addSection([
            'marginLeft' => 1000,
            'marginRight' => 1000,
            'marginTop' => 1000,
            'marginBottom' => 1000,
        ]);

        // Title
        $section->addText(
            $data['quiz_name'],
            ['bold' => true, 'size' => 18],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]
        );

        $section->addText(
            $data['course_name'],
            ['size' => 12],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]
        );

        $section->addTextBreak(1);

        // Quiz info
        $section->addText(
            'Total Questions: ' . $data['total_questions'] . ' | Total Marks: ' . $data['total_marks'],
            ['bold' => true, 'size' => 11]
        );

        $section->addText(
            'Exported: ' . $data['export_datetime'],
            ['size' => 10, 'color' => '666666']
        );

        $section->addTextBreak(2);

        // Questions
        foreach ($data['questions'] as $question) {
            // Question number and type
            $section->addText(
                'Question ' . $question['number'] . ' (' . $question['type'] . ') - ' . $question['marks'] . ' marks',
                ['bold' => true, 'size' => 12]
            );

            $section->addTextBreak(1);

            // Question text
            $section->addText(
                $question['text'],
                ['size' => 11]
            );

            $section->addTextBreak(1);

            // Answers
            if (!empty($question['answers'])) {
                foreach ($question['answers'] as $idx => $answer) {
                    $letter = chr(65 + $idx);
                    $isBold = !empty($answer['is_correct']);

                    $section->addText(
                        '    ' . $letter . ') ' . $answer['text'],
                        ['size' => 11, 'bold' => $isBold]
                    );
                }
            } else {
                $section->addText(
                    '    [Open-ended question]',
                    ['size' => 11, 'italic' => true, 'color' => '666666']
                );
            }

            $section->addTextBreak(2);
        }

        // Save
        $objWriter = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');

        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        header('Cache-Control: max-age=1');
        header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT');
        header('Cache-Control: cache, must-revalidate');
        header('Pragma: public');

        $objWriter->save('php://output');
        exit;
    }
}
