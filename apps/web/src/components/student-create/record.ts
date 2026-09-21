import type { StudentCreateValues } from './values'

/** Những gì hiện trên thẻ hồ sơ bên trái khi đang nhập */
export interface RecordView {
	fullName: string
	studentId: string
	unitId: number | undefined
	dob: string
	rank: string
	photo: File | null
}

export function recordFromValues(
	v: Pick<
		StudentCreateValues,
		'fullName' | 'studentId' | 'unitId' | 'dob' | 'rank' | 'avatar'
	>
): RecordView {
	return {
		fullName: v.fullName?.trim() ?? '',
		studentId: v.studentId?.trim() ?? '',
		unitId: v.unitId,
		dob: v.dob?.trim() ?? '',
		rank: v.rank?.trim() ?? '',
		photo: v.avatar ?? null
	}
}
