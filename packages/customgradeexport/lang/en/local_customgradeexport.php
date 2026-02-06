<?php

/**
 * English language strings - Enhanced version
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

// Basic strings
$string['pluginname'] = 'Custom Grade Export';
$string['department'] = 'Department';
$string['exportgrades'] = 'Export grades (Custom)';
$string['exportexcel'] = 'Export to Excel';
$string['exportdocx'] = 'Export to Word (DOCX)';
$string['privacy:metadata'] = 'The Custom Grade Export plugin does not store any personal data.';
$string['customgradeexport:export'] = 'Export custom grade reports';
$string['customgradeexport:uploadtemplate'] = 'Upload export templates';
$string['nopermission'] = 'You do not have permission to export grades';
$string['invalidcoursemodule'] = 'Invalid course module';
$string['selectformat'] = 'Select export format';
$string['uploadtemplate'] = 'Upload Template';
$string['templatemanagement'] = 'Template Management';
$string['quiztemplate'] = 'Quiz Export Template';
$string['assigntemplate'] = 'Assignment Export Template';
$string['uploadnewtemplate'] = 'Upload new template';
$string['currenttemplate'] = 'Current template';
$string['notemplate'] = 'No template uploaded';
$string['templateuploaded'] = 'Template uploaded successfully';
$string['usetemplate'] = 'Use template';
$string['notemplatewarning'] = 'No template found. Using default format.';

// Course export strings
$string['exportcoursegrades'] = 'Export Course Grades';
$string['exportcoursegradeshelp'] = 'Export final course grades with exam type breakdown (15P, 1T, Thi) and calculated TKMH scores.';
$string['exportdefault'] = 'Default Export (No Template)';
$string['exportdefaulthelp'] = 'Export grades in standard Excel format without custom template.';
$string['exportwithtemplates'] = 'Export with Templates';
$string['exportwithtemplate'] = 'Export with this template';
$string['export'] = 'Export';
$string['aboutcourseexport'] = 'About Course Grade Export';
$string['aboutcourseexporthelp'] = 'This export includes all student grades organized by exam type with automatic TKMH calculation and classification.';
$string['gradecolumns'] = 'Grade Columns';
$string['examtype15p'] = 'Regular assessment grades (15-minute tests)';
$string['examtype1t'] = 'Periodic assessment grades (1-period tests)';
$string['examtypethi'] = 'Final exam grades';
$string['tkmhformula'] = 'Final score calculated as: ((avg(15P) + avg(1T) × 2) / 3) × 0.4 + avg(Thi) × 0.6';

// Template management strings
$string['quiztemplates'] = 'Quiz Templates';
$string['assigntemplates'] = 'Assignment Templates';
$string['coursetemplates'] = 'Course Templates';
$string['existingtemplates'] = 'Existing Templates';
$string['templatename'] = 'Template Name';
$string['format'] = 'Format';
$string['size'] = 'Size';
$string['modified'] = 'Modified';
$string['actions'] = 'Actions';
$string['templatedeleted'] = 'Template deleted successfully';
$string['templatedeletefailed'] = 'Failed to delete template';
$string['confirmdelete'] = 'Are you sure you want to delete this template?';
$string['notemplatesyet'] = 'No templates uploaded yet.';
$string['templatenameplaceholder'] = 'e.g., Default Course Template';
$string['templatenamehelp'] = 'Enter a descriptive name for this template.';
$string['selecttemplatefile'] = 'Select template file';
$string['acceptedformats'] = 'Accepted formats';
$string['maxfilesize'] = 'Maximum file size';
$string['templateuploadfailed'] = 'Failed to upload template. Please ensure it is a valid Excel or Word file.';
$string['templateinstructions'] = 'Template Instructions';
$string['coursetemplateinstructions'] = 'Course templates support dynamic columns for exam types. The system will automatically insert columns for 15P, 1T, and Thi grades based on your course\'s grade items.';
$string['activitytemplateinstructions'] = 'Create a template file with placeholders for dynamic content using the variables below.';
$string['availablevariables'] = 'Available Variables';
$string['variable'] = 'Variable';
$string['description'] = 'Description';
$string['var_coursename'] = 'Course full name';
$string['var_exportdate'] = 'Export date';
$string['var_exporttime'] = 'Export time';
$string['dynamiccolumns'] = 'Dynamic Columns';
$string['dynamiccolumnshelp'] = 'The template should include a data row with placeholders. The system will clone this row for each student and fill in the grades.';
$string['exampletemplate'] = 'Example Template';
$string['downloadexampletemplate'] = 'Download an example template to get started';
$string['downloadexample'] = 'Download Example';
$string['managetemplates'] = 'Manage Templates';
$string['selecttemplate'] = 'Select Template';

// Question export strings
$string['customexportdesc'] = 'Export with institution and department information';
$string['exportquestions'] = 'Export Questions';
$string['exportoptions'] = 'Export Options';
$string['includeanswers'] = 'Include answers with correct answer marked';
$string['includeanswershelp'] = 'Correct answers will be shown in <strong>bold</strong>.';
$string['applyrandomization'] = 'Apply randomization (shuffle answers and random questions)';
$string['applyrandomizationhelp'] = 'Respects quiz settings for shuffling answers and selecting random questions';
$string['defaulttemplate'] = 'Use default format';
$string['aboutquestionexport'] = 'About Question Export';
$string['questionexportinfo1'] = 'Export all questions from this quiz in DOCX format';
$string['questionexportinfo2'] = 'Random questions will be selected according to quiz settings';
$string['questionexportinfo3'] = 'Answer shuffling will be applied if enabled in quiz settings';
$string['questionexportinfo4'] = 'Supports all question types: multiple choice, true/false, short answer, essay, matching, numerical, and calculated';
$string['quizstructure'] = 'Quiz Structure';
$string['totalquestions'] = 'Total questions';
$string['fixedquestions'] = 'Fixed questions';
$string['randomquestions'] = 'Random questions';
$string['shuffleanswers'] = 'Shuffle answers';
$string['quizquestionstemplates'] = 'Quiz Questions Templates';
$string['quizquestionstemplateinstructions'] = 'Quiz questions templates allow you to export quiz questions in a custom format. The template should include placeholders for quiz information and a repeating row for questions.';
$string['questionsdynamiccolumnshelp'] = 'The template should include a row with question placeholders. The system will clone this row for each question in the quiz.';

// Template variables for quiz questions
$string['var_quiz_name'] = 'Quiz name';
$string['var_total_questions'] = 'Total number of questions';
$string['var_total_marks'] = 'Total marks';
$string['var_question_number'] = 'Question number';
$string['var_question_type'] = 'Question type';
$string['var_question_text'] = 'Question text';
$string['var_question_marks'] = 'Question marks';
$string['var_question_answers'] = 'Question answers';
