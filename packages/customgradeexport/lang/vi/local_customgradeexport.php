<?php

/**
 * Vietnamese language strings
 *
 * @package    local_customgradeexport
 * @copyright  2024 Your Name
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

// Basic strings
$string['pluginname'] = 'Xuất điểm tuỳ chỉnh';
$string['department'] = 'Khoa / Đơn vị';
$string['exportgrades'] = 'Xuất điểm (tuỳ chỉnh)';
$string['exportexcel'] = 'Xuất điểm ra file Excel';
$string['exportdocx'] = 'Xuất điểm ra file Word (DOCX)';
$string['privacy:metadata'] = 'Plugin Xuất điểm tuỳ chỉnh không lưu trữ bất kỳ dữ liệu cá nhân nào.';
$string['customgradeexport:export'] = 'Xuất báo cáo điểm tuỳ chỉnh';
$string['customgradeexport:uploadtemplate'] = 'Tải lên mẫu xuất';
$string['nopermission'] = 'Bạn không có quyền xuất điểm';
$string['invalidcoursemodule'] = 'Hoạt động khoá học không hợp lệ';
$string['selectformat'] = 'Chọn định dạng xuất';
$string['uploadtemplate'] = 'Tải lên mẫu';
$string['templatemanagement'] = 'Quản lý mẫu';
$string['quiztemplate'] = 'Mẫu xuất bài trắc nghiệm';
$string['assigntemplate'] = 'Mẫu xuất bài tập';
$string['uploadnewtemplate'] = 'Tải lên mẫu mới';
$string['currenttemplate'] = 'Mẫu hiện tại';
$string['notemplate'] = 'Chưa có mẫu nào được tải lên';
$string['templateuploaded'] = 'Tải lên mẫu thành công';
$string['usetemplate'] = 'Sử dụng mẫu';
$string['notemplatewarning'] = 'Không tìm thấy mẫu. Sử dụng định dạng mặc định.';

// Course export strings
$string['exportcoursegrades'] = 'Xuất điểm khoá học';
$string['exportcoursegradeshelp'] = 'Xuất điểm tổng kết môn học với phân loại theo hình thức đánh giá (15P, 1T, Thi) và tự động tính điểm TKMH.';
$string['exportdefault'] = 'Xuất mặc định (không dùng mẫu)';
$string['exportdefaulthelp'] = 'Xuất điểm theo định dạng Excel chuẩn mà không sử dụng mẫu tuỳ chỉnh.';
$string['exportwithtemplates'] = 'Xuất bằng mẫu';
$string['exportwithtemplate'] = 'Xuất với mẫu này';
$string['export'] = 'Xuất';
$string['aboutcourseexport'] = 'Giới thiệu về xuất điểm khoá học';
$string['aboutcourseexporthelp'] = 'Bản xuất này bao gồm toàn bộ điểm sinh viên, được sắp xếp theo từng hình thức đánh giá, kèm theo tính toán và phân loại điểm TKMH tự động.';
$string['gradecolumns'] = 'Các cột điểm';
$string['examtype15p'] = 'Điểm đánh giá thường xuyên (bài kiểm tra 15 phút)';
$string['examtype1t'] = 'Điểm đánh giá định kỳ (bài kiểm tra 1 tiết)';
$string['examtypethi'] = 'Điểm thi cuối kỳ';
$string['tkmhformula'] = 'Điểm tổng kết được tính theo công thức: ((TB 15P + TB 1T × 2) / 3) × 0.4 + TB Thi × 0.6';

// Template management strings
$string['quiztemplates'] = 'Mẫu bài trắc nghiệm';
$string['assigntemplates'] = 'Mẫu bài tập';
$string['coursetemplates'] = 'Mẫu khoá học';
$string['existingtemplates'] = 'Các mẫu hiện có';
$string['templatename'] = 'Tên mẫu';
$string['format'] = 'Định dạng';
$string['size'] = 'Dung lượng';
$string['modified'] = 'Cập nhật';
$string['actions'] = 'Thao tác';
$string['templatedeleted'] = 'Xoá mẫu thành công';
$string['templatedeletefailed'] = 'Xoá mẫu thất bại';
$string['confirmdelete'] = 'Bạn có chắc chắn muốn xoá mẫu này không?';
$string['notemplatesyet'] = 'Chưa có mẫu nào được tải lên.';
$string['templatenameplaceholder'] = 'Ví dụ: Mẫu khoá học mặc định';
$string['templatenamehelp'] = 'Nhập tên mô tả cho mẫu này.';
$string['selecttemplatefile'] = 'Chọn tệp mẫu';
$string['acceptedformats'] = 'Định dạng được chấp nhận';
$string['maxfilesize'] = 'Dung lượng tệp tối đa';
$string['templateuploadfailed'] = 'Tải lên mẫu thất bại. Vui lòng đảm bảo đây là tệp Excel hoặc Word hợp lệ.';
$string['templateinstructions'] = 'Hướng dẫn tạo mẫu';
$string['coursetemplateinstructions'] = 'Mẫu khoá học hỗ trợ các cột động theo hình thức đánh giá. Hệ thống sẽ tự động chèn các cột 15P, 1T và Thi dựa trên các hạng mục điểm của khoá học.';
$string['activitytemplateinstructions'] = 'Tạo tệp mẫu với các biến giữ chỗ cho nội dung động bằng cách sử dụng các biến bên dưới.';
$string['availablevariables'] = 'Các biến khả dụng';
$string['variable'] = 'Biến';
$string['description'] = 'Mô tả';
$string['var_coursename'] = 'Tên đầy đủ của khoá học';
$string['var_exportdate'] = 'Ngày xuất';
$string['var_exporttime'] = 'Thời gian xuất';
$string['dynamiccolumns'] = 'Cột động';
$string['dynamiccolumnshelp'] = 'Mẫu cần có một dòng dữ liệu với các biến giữ chỗ. Hệ thống sẽ sao chép dòng này cho mỗi sinh viên và điền điểm tương ứng.';
$string['exampletemplate'] = 'Mẫu ví dụ';
$string['downloadexampletemplate'] = 'Tải xuống mẫu ví dụ để bắt đầu';
$string['downloadexample'] = 'Tải mẫu ví dụ';
$string['managetemplates'] = 'Quản lý mẫu';
$string['selecttemplate'] = 'Chọn mẫu';

// Question export strings (Vietnamese)
$string['customexportdesc'] = 'Export with institution and department information';
$string['exportquestions'] = 'Xuất câu hỏi';
$string['exportoptions'] = 'Tuỳ chọn xuất';
$string['includeanswers'] = 'Bao gồm đáp án và đánh dấu đáp án đúng';
$string['includeanswershelp'] = 'Đáp án đúng sẽ được đánh dấu bằng ký hiệu ✓';
$string['applyrandomization'] = 'Áp dụng ngẫu nhiên hoá (xáo trộn đáp án và câu hỏi ngẫu nhiên)';
$string['applyrandomizationhelp'] = 'Tuân theo cài đặt bài trắc nghiệm về xáo trộn đáp án và chọn câu hỏi ngẫu nhiên';
$string['defaulttemplate'] = 'Sử dụng định dạng mặc định';
$string['aboutquestionexport'] = 'Giới thiệu về xuất câu hỏi';
$string['questionexportinfo1'] = 'Xuất tất cả câu hỏi từ bài trắc nghiệm này sang định dạng DOCX';
$string['questionexportinfo2'] = 'Câu hỏi ngẫu nhiên sẽ được chọn theo cài đặt bài trắc nghiệm';
$string['questionexportinfo3'] = 'Xáo trộn đáp án sẽ được áp dụng nếu được bật trong cài đặt';
$string['questionexportinfo4'] = 'Hỗ trợ tất cả loại câu hỏi: trắc nghiệm, đúng/sai, câu trả lời ngắn, tự luận, ghép đôi, số, và tính toán';
$string['quizstructure'] = 'Cấu trúc bài trắc nghiệm';
$string['totalquestions'] = 'Tổng số câu hỏi';
$string['fixedquestions'] = 'Câu hỏi cố định';
$string['randomquestions'] = 'Câu hỏi ngẫu nhiên';
$string['shuffleanswers'] = 'Xáo trộn đáp án';
$string['quizquestionstemplates'] = 'Mẫu câu hỏi trắc nghiệm';
$string['quizquestionstemplateinstructions'] = 'Mẫu câu hỏi trắc nghiệm cho phép bạn xuất câu hỏi theo định dạng tuỳ chỉnh. Mẫu cần bao gồm các biến giữ chỗ cho thông tin bài trắc nghiệm và một dòng lặp lại cho các câu hỏi.';
$string['questionsdynamiccolumnshelp'] = 'Mẫu cần có một dòng chứa các biến giữ chỗ cho câu hỏi. Hệ thống sẽ sao chép dòng này cho mỗi câu hỏi trong bài trắc nghiệm.';

// Template variables for quiz questions (Vietnamese)
$string['var_quiz_name'] = 'Tên bài trắc nghiệm';
$string['var_total_questions'] = 'Tổng số câu hỏi';
$string['var_total_marks'] = 'Tổng điểm';
$string['var_question_number'] = 'Số thứ tự câu hỏi';
$string['var_question_type'] = 'Loại câu hỏi';
$string['var_question_text'] = 'Nội dung câu hỏi';
$string['var_question_marks'] = 'Điểm câu hỏi';
$string['var_question_answers'] = 'Các đáp án';
