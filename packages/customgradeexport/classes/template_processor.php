<?php

/**
 * Template Processor class (backward compatibility and documentation)
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

/**
 * Helper class for managing export templates (legacy support)
 * This class is kept for backward compatibility and documentation
 */
class template_processor
{
    /**
     * Get template file path (legacy method)
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @return string|null Path to template or null if not found
     */
    public static function get_template_path($type)
    {
        $templates = template_manager::get_templates($type);
        if (empty($templates)) {
            return null;
        }
        $firstTemplate = reset($templates);
        return $firstTemplate['path'];
    }

    /**
     * Check if template exists
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @return bool
     */
    public static function has_template($type)
    {
        return self::get_template_path($type) !== null;
    }

    /**
     * Get template variables for documentation
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @return array Array of available variables with descriptions
     */
    public static function get_available_variables($type)
    {
        $common = [
            'coursename'   => 'Tên đầy đủ của môn học',
            'classname'    => 'Mã số lớp (idnumber của danh mục khóa học, ví dụ: LỚP: ${classname})',
            'exportdate'   => 'Ngày xuất (dd/mm/yyyy)',
            'exporttime'   => 'Giờ xuất (HH:MM:SS)',
            'teacher_name' => 'Họ tên giảng viên phụ trách (người đầu tiên có vai trò giảng viên trong lớp)',
            'manager_name' => 'Họ tên quản lý lớp (người đầu tiên có vai trò quản lý trong lớp)',
            'department'   => 'Khoa / đơn vị của quản lý lớp (lấy từ trường department của tài khoản quản lý)',
        ];

        if ($type === 'course') {
            return array_merge($common, [
                'courseshortname' => 'Tên viết tắt của môn học',

                // ── Table row variables ──────────────────────────────────
                'stt'        => 'Số thứ tự (bắt buộc để nhân bản hàng bảng)',
                'fullname'   => 'Họ và tên sinh viên',
                'firstname'  => 'Tên sinh viên',
                'lastname'   => 'Họ sinh viên',
                'idnumber'   => 'Mã số sinh viên',

                // Grade columns (dynamic based on course grade items)
                '15p_01' => 'Điểm kiểm tra thường xuyên 1',
                '15p_02' => 'Điểm kiểm tra thường xuyên 2',
                '15p_03' => 'Điểm kiểm tra thường xuyên 3',
                '1t_01'  => 'Điểm kiểm tra định kỳ 1',
                '1t_02'  => 'Điểm kiểm tra định kỳ 2',
                '1t_03'  => 'Điểm kiểm tra định kỳ 3',
                'thi_01' => 'Điểm thi lần 1',
                'thi_02' => 'Điểm thi lần 2',
                'tbkt_grade' => 'Điểm trung bình kiểm tra — TBKT = (TB 15P + TB 1T × 2) / 3',
                'tkmh'       => 'Điểm tổng kết môn học — TKMH = TBKT × 0.4 + TB Thi × 0.6',
                'xep_loai'   => 'Xếp loại (XS / G / Khá / TB / Yếu)',
                'ghi_chu'    => 'Ghi chú',

                // ── Classification statistics (document-level, not per-row) ─
                'xuat_sac_count'  => 'Số sinh viên xếp loại Xuất sắc (TKMH ≥ 9)',
                'xuat_sac_pct'    => 'Tỉ lệ % sinh viên Xuất sắc',
                'gioi_count'      => 'Số sinh viên xếp loại Giỏi (8 ≤ TKMH < 9)',
                'gioi_pct'        => 'Tỉ lệ % sinh viên Giỏi',
                'kha_count'       => 'Số sinh viên xếp loại Khá (7 ≤ TKMH < 8)',
                'kha_pct'         => 'Tỉ lệ % sinh viên Khá',
                'dat_count'       => 'Số sinh viên xếp loại Đạt (5 ≤ TKMH < 7)',
                'dat_pct'         => 'Tỉ lệ % sinh viên Đạt',
                'khong_dat_count' => 'Số sinh viên Không đạt (TKMH < 5)',
                'khong_dat_pct'   => 'Tỉ lệ % sinh viên Không đạt',
                'total_students'  => 'Tổng số sinh viên có điểm',
            ]);
        }

        if ($type === 'quiz') {
            return array_merge($common, [
                'stt'          => 'Số thứ tự (bắt buộc để nhân bản hàng bảng)',
                'activityname' => 'Tên bài kiểm tra / hoạt động',
                'firstname'    => 'Tên sinh viên',
                'lastname'     => 'Họ sinh viên',
                'idnumber'     => 'Mã số sinh viên',
                'institution'  => 'Cơ quan',
                'department'   => 'Đơn vị',
                'email'        => 'Địa chỉ email',
                'attempt'      => 'Số lần thi',
                'status'       => 'Trạng thái',
                'grade'        => 'Điểm đạt được',
                'outof'        => 'Thang điểm',
                'percentage'   => 'Tỉ lệ %',
                'timestarted'  => 'Thời gian bắt đầu',
                'timefinished' => 'Thời gian kết thúc',
                'timetaken'    => 'Thời gian làm bài',
            ]);
        }

        if ($type === 'assign') {
            return array_merge($common, [
                'stt'           => 'Số thứ tự (bắt buộc để nhân bản hàng bảng)',
                'activityname'  => 'Tên bài tập',
                'firstname'     => 'Tên sinh viên',
                'lastname'      => 'Họ sinh viên',
                'idnumber'      => 'Mã số sinh viên',
                'institution'   => 'Cơ quan',
                'department'    => 'Đơn vị',
                'email'         => 'Địa chỉ email',
                'status'        => 'Trạng thái nộp bài',
                'grade'         => 'Điểm đạt được',
                'outof'         => 'Thang điểm',
                'percentage'    => 'Tỉ lệ %',
                'timesubmitted' => 'Thời gian nộp',
                'timemarked'    => 'Thời gian chấm',
                'grader'        => 'Người chấm',
                'feedback'      => 'Nhận xét',
            ]);
        }

        return $common;
    }

    /**
     * Get template instructions for a specific type
     *
     * @param string $type 'quiz', 'assign', or 'course'
     * @return string HTML formatted instructions
     */
    public static function get_template_instructions($type)
    {
        $variables = self::get_available_variables($type);

        $html  = '<div class="template-instructions">';
        $html .= '<h5>Các biến có thể dùng trong mẫu</h5>';
        $html .= '<p>Dùng các biến sau trong tệp mẫu. Chúng sẽ được thay thế bằng dữ liệu thực tế khi xuất.</p>';

        // ── Document-level header variables ──────────────────────────────
        $html .= '<h6>Biến tiêu đề tài liệu</h6>';
        $html .= '<table class="table table-sm table-bordered">';
        $html .= '<thead><tr><th>Biến</th><th>Mô tả</th></tr></thead><tbody>';

        $headerVars = [
            'coursename',
            'classname',
            'courseshortname',
            'activityname',
            'exportdate',
            'exporttime',
            'teacher_name',
            'manager_name',
            'department',
        ];
        foreach ($headerVars as $var) {
            if (isset($variables[$var])) {
                $html .= '<tr><td><code>${' . $var . '}</code></td><td>' . $variables[$var] . '</td></tr>';
            }
        }
        $html .= '</tbody></table>';

        // ── Table row variables ───────────────────────────────────────────
        $html .= '<h6>Biến hàng bảng dữ liệu</h6>';
        $html .= '<p><strong>Lưu ý:</strong> Mẫu phải có một bảng với các biến giữ chỗ trong hàng dữ liệu.</p>';

        if ($type === 'course') {
            $html .= '<p><strong>Bắt buộc:</strong> Cột đầu tiên phải chứa <code>${stt}</code> để cho phép nhân bản hàng.</p>';
        } else {
            $html .= '<p><strong>Bắt buộc:</strong> Cột đầu tiên phải chứa <code>${firstname}</code> để cho phép nhân bản hàng.</p>';
        }

        $html .= '<table class="table table-sm table-bordered">';
        $html .= '<thead><tr><th>Biến</th><th>Mô tả</th></tr></thead><tbody>';

        $excludeFromRows = array_merge($headerVars, [
            'xuat_sac_count',
            'xuat_sac_pct',
            'gioi_count',
            'gioi_pct',
            'kha_count',
            'kha_pct',
            'dat_count',
            'dat_pct',
            'khong_dat_count',
            'khong_dat_pct',
            'total_students',
        ]);
        foreach ($variables as $var => $desc) {
            if (!in_array($var, $excludeFromRows, true)) {
                $html .= '<tr><td><code>${' . $var . '}</code></td><td>' . $desc . '</td></tr>';
            }
        }
        $html .= '</tbody></table>';

        // ── Stats variables (course only) ─────────────────────────────────
        if ($type === 'course') {
            $html .= '<h6>Biến thống kê xếp loại</h6>';
            $html .= '<p>Đặt các biến này ở bất kỳ đâu trong tài liệu (ngoài hàng nhân bản) để hiển thị thống kê tổng hợp.</p>';
            $html .= '<p>Ví dụ: <code>Kết quả: Xuất sắc ${xuat_sac_count} tỷ lệ ${xuat_sac_pct}%; Giỏi: ${gioi_count} tỷ lệ ${gioi_pct}%;</code></p>';
            $html .= '<table class="table table-sm table-bordered">';
            $html .= '<thead><tr><th>Biến</th><th>Mô tả</th></tr></thead><tbody>';
            $statsVars = [
                'xuat_sac_count',
                'xuat_sac_pct',
                'gioi_count',
                'gioi_pct',
                'kha_count',
                'kha_pct',
                'dat_count',
                'dat_pct',
                'khong_dat_count',
                'khong_dat_pct',
                'total_students',
            ];
            foreach ($statsVars as $var) {
                if (isset($variables[$var])) {
                    $html .= '<tr><td><code>${' . $var . '}</code></td><td>' . $variables[$var] . '</td></tr>';
                }
            }
            $html .= '</tbody></table>';

            $html .= '<div class="alert alert-info"><h6>Cột điểm động</h6>';
            $html .= '<p>Số lượng cột 15P/1T tự động điều chỉnh theo số hạng mục điểm của môn học (tối thiểu 3 cột mỗi loại).</p></div>';
        }

        $html .= '</div>';
        return $html;
    }
}

