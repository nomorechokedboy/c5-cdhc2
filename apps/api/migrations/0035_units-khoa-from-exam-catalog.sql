-- Đồng bộ mã đơn vị sử dụng (khoa) = mã chuẩn exam_faculties (K1–K8).
-- Nên chạy: pnpm sync:units-khoa (đọc tên/mã mới nhất từ exam_faculties).
--
-- Map alias cũ → mã chuẩn (giữ id):

UPDATE units SET alias = 'K1', name = 'Khoa Quân sự chung'
  WHERE upper(alias) IN ('KQSC', 'K1');
UPDATE units SET alias = 'K2', name = 'Khoa Khoa học xã hội và nhân văn'
  WHERE upper(alias) IN ('KXHNV', 'K2');
UPDATE units SET alias = 'K3', name = 'Khoa Khoa học cơ bản'
  WHERE upper(alias) IN ('KCB', 'K3');
UPDATE units SET alias = 'K4', name = 'Khoa Y học cơ sở'
  WHERE upper(alias) IN ('KYHCS', 'K4');
UPDATE units SET alias = 'K5', name = 'Khoa Y học lâm sàng'
  WHERE upper(alias) IN ('KYHLS', 'K5');
UPDATE units SET alias = 'K6', name = 'Khoa Y học quân sự'
  WHERE upper(alias) IN ('KYHQS', 'K6');
UPDATE units SET alias = 'K7', name = 'Khoa Điều dưỡng'
  WHERE upper(alias) IN ('KDD', 'K7');
UPDATE units SET alias = 'K8', name = 'Khoa Dược'
  WHERE upper(alias) IN ('KD', 'K8');
