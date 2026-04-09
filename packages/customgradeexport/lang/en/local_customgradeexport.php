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

// Migration UI
$string['migration_status']        = 'S3 Migration Status';
$string['migrate_all']             = 'Queue {$a} local template(s) for migration';
$string['migration_queued']        = '{$a} template(s) queued for migration. The scheduled task will process them within a minute.';
$string['migration_retried']       = '{$a} template(s) re-queued for migration.';
$string['migration_retry_queued']  = 'Template re-queued for migration.';
$string['migration_retry_failed']  = 'Could not re-queue template.';
$string['migration_problems']      = 'Migration Problems';
$string['retry_all_failed']        = 'Retry all failed';
$string['retry']                   = 'Retry';
$string['cleanup_local']           = 'Delete local copies for {$a} migrated template(s)';
$string['cleanup_result']          = 'Cleanup complete: {$a->ok} deleted, {$a->failed} failed (local file could not be removed).';

// Status badges
$string['status']                  = 'Status';
$string['status_local']            = 'Local';
$string['status_migrating']        = 'Migrating';
$string['status_migration_failed'] = 'Failed';
$string['status_migrated']         = 'Migrated';
$string['status_s3']               = 'S3';
$string['status_stuck']            = 'Stuck';

// Problem labels
$string['problem']                 = 'Problem';
$string['problem_failed']          = 'S3 upload failed';
$string['problem_stuck']           = 'Stuck in migrating state';

// S3 settings
$string['s3_heading']              = 'S3 / MinIO Storage';
$string['s3_heading_desc']         = 'Templates are stored in an S3-compatible object store. Configure the connection below.';
$string['s3_endpoint']             = 'Endpoint URL';
$string['s3_endpoint_desc']        = 'Full URL including scheme and port, e.g. <code>http://minio-service:9000</code>';
$string['s3_bucket']               = 'Bucket name';
$string['s3_bucket_desc']          = 'The bucket must already exist and be writable by the access key.';
$string['s3_region']               = 'Region';
$string['s3_region_desc']          = 'AWS region, or <code>us-east-1</code> for MinIO.';
$string['s3_access_key']           = 'Access key ID';
$string['s3_secret_key']           = 'Secret access key';
$string['s3_path_style']           = 'Use path-style access';
$string['s3_path_style_desc']      = 'Required for MinIO and most self-hosted endpoints.';
$string['s3notconfigured']         = 'S3 storage is not configured. Templates will be stored on local disk until S3 is configured and migration is run.';
$string['s3notconfigured_warn']    = 'S3 storage is not fully configured. <a href="{$a}">Configure it here</a>. Templates are currently stored on local disk.';

// Template edit / download
$string['templateupdated']         = 'Template updated successfully.';
$string['templateupdatefailed']    = 'Failed to update the template.';
$string['replacefile']             = 'Replace file (optional)';
$string['replacefilehelp']         = 'Leave empty to keep the current file and only update the name.';
$string['download']                = 'Download';
$string['templatenotavailable']    = 'This template is currently being migrated and is not available for download. Please try again in a moment.';

// Task
$string['task_migrate_templates']  = 'Migrate templates to S3';

// Types
$string['type']                    = 'Type';

$string['s3test_heading']          = 'Test connection';
$string['s3test_button']           = 'Test S3 connection';
$string['s3test_testing']          = 'Testing…';
$string['s3test_not_configured']   = 'S3 credentials are incomplete. Please fill in all fields above and save before testing.';
$string['s3test_put_failed']       = 'PUT failed — check endpoint URL, bucket name, and access key permissions.';
$string['s3test_get_failed']       = 'GET failed — object was uploaded but could not be read back. Check bucket policy.';
$string['s3test_content_mismatch'] = 'Content mismatch — object was stored and retrieved but the content did not match. This may indicate a proxy is modifying responses.';
$string['s3test_delete_warning']   = 'Connection OK, but the test object could not be deleted. Check that the access key has s3:DeleteObject permission.';
$string['s3test_ok']               = 'Connection successful — PUT, GET and DELETE all passed.';
