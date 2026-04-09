<?php

/**
 * Custom admin setting: S3 connection test button.
 *
 * Renders a "Test connection" button that fires an AJAX call to s3_test.php
 * and shows a success/error badge inline — no page reload needed.
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

class admin_setting_s3_test extends \admin_setting
{

    public function __construct()
    {
        // Name must be unique; no actual config value is stored.
        parent::__construct(
            'local_customgradeexport/s3_test_button',
            get_string('s3test_heading', 'local_customgradeexport'),
            '',
            ''
        );
    }

    // This setting stores nothing.
    public function get_setting()
    {
        return true;
    }

    public function write_setting($data)
    {
        return '';
    }

    public function output_html($data, $query = '')
    {
        global $PAGE;

        $testurl  = new \moodle_url('/local/customgradeexport/s3_test.php');
        $sesskey  = sesskey();
        $btnLabel = get_string('s3test_button',    'local_customgradeexport');
        $testing  = get_string('s3test_testing',   'local_customgradeexport');

        // All strings needed inside the JS block — avoids PHP-in-JS escaping issues.
        $jsStrings = \html_writer::script(
            'var CGE_S3_STRINGS = ' . json_encode([
                'testing' => $testing,
                'btn'     => $btnLabel,
            ]) . ';'
        );

        $html = $jsStrings;
        $html .= \html_writer::start_div('form-item row');
        $html .= \html_writer::start_div('form-label col-sm-4 text-sm-right');
        $html .= \html_writer::tag('label', get_string('s3test_heading', 'local_customgradeexport'));
        $html .= \html_writer::end_div();

        $html .= \html_writer::start_div('form-setting col-sm-8');

        // Button
        $html .= \html_writer::tag(
            'button',
            '<i class="fa fa-plug me-1"></i>' . $btnLabel,
            [
                'type'             => 'button',
                'id'               => 'cge-s3-test-btn',
                'class'            => 'btn btn-secondary',
                'data-testurl'     => $testurl->out(false),
                'data-sesskey'     => $sesskey,
            ]
        );

        // Result badge — hidden until the test runs
        $html .= ' <span id="cge-s3-test-result" class="ms-2" style="display:none;"></span>';

        // Inline JS — plain fetch, no AMD dependency needed
        $html .= <<<HTML
<script>
(function () {
    var btn = document.getElementById('cge-s3-test-btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
        var result = document.getElementById('cge-s3-test-result');
        btn.disabled = true;
        btn.textContent = CGE_S3_STRINGS.testing;
        result.style.display = 'none';

        fetch(btn.dataset.testurl + '?sesskey=' + btn.dataset.sesskey, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            result.style.display = '';
            if (data.success) {
                result.className = 'badge bg-success ms-2';
                result.innerHTML = '<i class="fa fa-check me-1"></i>' + data.message;
            } else {
                result.className = 'badge bg-danger ms-2 text-wrap';
                result.innerHTML = '<i class="fa fa-times me-1"></i>' + data.message;
            }
        })
        .catch(function (err) {
            result.style.display = '';
            result.className = 'badge bg-danger ms-2';
            result.textContent = err.toString();
        })
        .finally(function () {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa fa-plug me-1"></i>' + CGE_S3_STRINGS.btn;
        });
    });
})();
</script>
HTML;

        $html .= \html_writer::end_div(); // form-setting
        $html .= \html_writer::end_div(); // form-item

        return $html;
    }
}
