import { toDisplayDate } from '@/lib/student-dates'
import type { Student } from '@/types'

/** Những gì hiện trên thẻ hồ sơ bên trái */
export interface RecordView {
	fullName: string
	studentId: string
	unitId: number | undefined
	/** dd/mm/yyyy */
	dob: string
	rank: string
	photo: File | null
}

/** Nguồn tối thiểu để dựng thẻ: giá trị form thêm/sửa đều thoả */
export interface RecordSource {
	fullName?: string | null
	studentId?: string | null
	unitId?: number | string | null
	dob?: string | null
	rank?: string | null
	avatar?: File | null
}

export function recordFromValues(v: RecordSource): RecordView {
	const unit = v.unitId === '' || v.unitId == null ? NaN : Number(v.unitId)
	return {
		fullName: v.fullName?.trim() ?? '',
		studentId: v.studentId?.trim() ?? '',
		unitId: Number.isFinite(unit) ? unit : undefined,
		dob: v.dob?.trim() ?? '',
		rank: v.rank?.trim() ?? '',
		photo: v.avatar ?? null
	}
}

/** Thẻ của một học viên đã lưu: ngày sinh chuyển sang dd/mm/yyyy */
export function recordFromStudent(student: Student): RecordView {
	return recordFromValues({
		fullName: student.fullName,
		studentId: student.studentId,
		unitId: student.unit?.id ?? student.unitId,
		dob: toDisplayDate(student.dob),
		rank: student.rank
	})
}
