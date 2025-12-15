<?php
/**
 * Privacy provider implementation
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport\privacy;

defined('MOODLE_INTERNAL') || die();

/**
 * Privacy provider for local_customgradeexport
 */
class provider implements \core_privacy\local\metadata\null_provider {
    
    /**
     * Get the language string identifier with the component's language
     * file to explain why this plugin stores no data.
     *
     * @return string
     */
    public static function get_reason(): string {
        return 'privacy:metadata';
    }
}
