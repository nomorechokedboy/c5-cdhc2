import type { ImportStatus } from './useStudentImport'

/** Bốn chặng của một lần import, vẽ thành dải mạch ở đầu hộp thoại */
export const IMPORT_STEPS = [
	{ id: 'template', title: 'Tải mẫu' },
	{ id: 'file', title: 'Chọn file' },
	{ id: 'check', title: 'Kiểm tra' },
	{ id: 'import', title: 'Import' }
] as const

export type ImportStage = 0 | 1 | 2 | 3

/** Lời dẫn đầu mỗi chặng (nội dung cũ của khung «Hướng dẫn import») */
export const STAGE_HINTS: Record<ImportStage, string> = {
	0: 'Tải file mẫu, điền thông tin học viên theo đúng định dạng. Dữ liệu bắt đầu từ dòng 3.',
	1: 'Tải lên file đã điền (CSV hoặc Excel). File được kiểm tra ngay trên máy trước khi gửi đi.',
	2: 'Bấm mũi tên đầu dòng để xem đủ thông tin từng học viên, sửa lớp nếu cần. Chỉ các dòng hợp lệ được thêm vào hệ thống.',
	3: ''
}

/**
 * Đang ở chặng nào. Đã có dòng dữ liệu thì chặng là «Kiểm tra» (kể cả khi import
 * lỗi, người dùng quay về bảng để thử lại); đang gửi hoặc xong là «Import».
 * Trước khi có file thì theo `pane`, chặng người dùng tự mở (mẫu hoặc chọn file).
 */
export function importStage(
	status: ImportStatus,
	rowCount: number,
	pane: 0 | 1
): ImportStage {
	if (status === 'importing' || status === 'done') return 3
	if (rowCount > 0) return 2
	return pane
}

/** Chặng đã đi qua (vẽ nhịp hoàn thành): mọi chặng trước chặng hiện tại */
export const passedStages = (stage: ImportStage) =>
	IMPORT_STEPS.flatMap((_, i) => (i < stage ? [i] : []))
