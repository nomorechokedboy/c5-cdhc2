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

$string['migration_status']        = 'Trạng thái di chuyển lên S3';
$string['migrate_all']             = 'Xếp hàng {$a} mẫu để di chuyển';
$string['migration_queued']        = 'Đã xếp hàng {$a} mẫu. Tác vụ nền sẽ xử lý trong vòng một phút.';
$string['migration_retried']       = 'Đã xếp lại hàng {$a} mẫu để thử lại.';
$string['migration_retry_queued']  = 'Mẫu đã được xếp lại hàng để thử lại.';
$string['migration_retry_failed']  = 'Không thể xếp lại hàng mẫu.';
$string['migration_problems']      = 'Lỗi di chuyển';
$string['retry_all_failed']        = 'Thử lại tất cả mẫu lỗi';
$string['retry']                   = 'Thử lại';
$string['cleanup_local']           = 'Xoá bản sao cục bộ của {$a} mẫu đã di chuyển';
$string['cleanup_result']          = 'Dọn dẹp hoàn tất: {$a->ok} đã xoá, {$a->failed} thất bại (không thể xoá tệp cục bộ).';

$string['status']                  = 'Trạng thái';
$string['status_local']            = 'Cục bộ';
$string['status_migrating']        = 'Đang di chuyển';
$string['status_migration_failed'] = 'Thất bại';
$string['status_migrated']         = 'Đã di chuyển';
$string['status_s3']               = 'S3';
$string['status_stuck']            = 'Bị kẹt';

$string['problem']                 = 'Vấn đề';
$string['problem_failed']          = 'Tải lên S3 thất bại';
$string['problem_stuck']           = 'Bị kẹt ở trạng thái đang di chuyển';

$string['s3_heading']              = 'Lưu trữ S3 / MinIO';
$string['s3_heading_desc']         = 'Mẫu được lưu trong kho S3. Cấu hình kết nối bên dưới.';
$string['s3_endpoint']             = 'URL Endpoint';
$string['s3_endpoint_desc']        = 'URL đầy đủ bao gồm giao thức và cổng, ví dụ: <code>http://minio-service:9000</code>';
$string['s3_bucket']               = 'Tên bucket';
$string['s3_bucket_desc']          = 'Bucket phải tồn tại và có quyền ghi với access key.';
$string['s3_region']               = 'Region';
$string['s3_region_desc']          = 'Region AWS, hoặc <code>us-east-1</code> cho MinIO.';
$string['s3_access_key']           = 'Access key ID';
$string['s3_secret_key']           = 'Secret access key';
$string['s3_path_style']           = 'Sử dụng path-style access';
$string['s3_path_style_desc']      = 'Bắt buộc với MinIO và hầu hết các endpoint tự triển khai.';
$string['s3notconfigured']         = 'Chưa cấu hình S3. Mẫu sẽ lưu trên ổ đĩa cục bộ cho đến khi cấu hình S3 và chạy di chuyển.';
$string['s3notconfigured_warn']    = 'Cấu hình S3 chưa đầy đủ. <a href="{$a}">Cấu hình tại đây</a>. Mẫu hiện đang lưu cục bộ.';

$string['templateupdated']         = 'Cập nhật mẫu thành công.';
$string['templateupdatefailed']    = 'Cập nhật mẫu thất bại.';
$string['replacefile']             = 'Thay thế tệp (tuỳ chọn)';
$string['replacefilehelp']         = 'Để trống nếu chỉ muốn cập nhật tên.';
$string['download']                = 'Tải xuống';
$string['templatenotavailable']    = 'Mẫu đang được di chuyển, vui lòng thử lại sau.';

$string['task_migrate_templates']  = 'Di chuyển mẫu lên S3';
$string['type']                    = 'Loại';

$string['s3test_heading']          = 'Kiểm tra kết nối';
$string['s3test_button']           = 'Kiểm tra kết nối S3';
$string['s3test_testing']          = 'Đang kiểm tra…';
$string['s3test_not_configured']   = 'Thông tin xác thực S3 chưa đầy đủ. Vui lòng điền tất cả các trường và lưu trước khi kiểm tra.';
$string['s3test_put_failed']       = 'PUT thất bại — kiểm tra URL endpoint, tên bucket và quyền của access key.';
$string['s3test_get_failed']       = 'GET thất bại — đối tượng đã được tải lên nhưng không đọc lại được. Kiểm tra chính sách bucket.';
$string['s3test_content_mismatch'] = 'Nội dung không khớp — đối tượng đã lưu và lấy lại nhưng nội dung không trùng. Có thể proxy đang thay đổi phản hồi.';
$string['s3test_delete_warning']   = 'Kết nối OK, nhưng không xoá được đối tượng thử nghiệm. Kiểm tra quyền s3:DeleteObject của access key.';
$string['s3test_ok']               = 'Kết nối thành công — PUT, GET và DELETE đều hoạt động.';
