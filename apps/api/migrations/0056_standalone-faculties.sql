-- Khoa là danh mục dùng chung, không phụ thuộc ngành đào tạo.
-- Một migration cũ từng dùng cùng tên bảng tạm; luôn xóa trước để tránh tái sử
-- dụng nhầm schema cũ khi cài đặt database từ đầu.
DROP TABLE IF EXISTS `exam_faculties_new`;--> statement-breakpoint
CREATE TABLE `exam_faculties_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `code` text NOT NULL,
  `name` text NOT NULL,
  `major_id` integer,
  `description` text
);--> statement-breakpoint
INSERT OR IGNORE INTO `exam_faculties_new` (id, createdAt, updatedAt, code, name, major_id, description)
SELECT id, createdAt, updatedAt, code, name, major_id, description FROM `exam_faculties`;--> statement-breakpoint
DROP TABLE IF EXISTS `exam_faculties`;--> statement-breakpoint
ALTER TABLE `exam_faculties_new` RENAME TO `exam_faculties`;
-- Dữ liệu cũ có thể lặp mã theo ngành; API sẽ dùng mã độc lập cho bản ghi mới.
