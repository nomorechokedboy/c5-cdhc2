import type { StudentCreateValues } from './values'

export interface SummaryRow {
	label: string
	value: string
}

const text = (v: string | undefined | null) => v?.trim() || '-'

/** Vài thông tin chính để người nhập rà lại ở bước cuối trước khi gửi */
export function summaryRows(
	values: Pick<
		StudentCreateValues,
		| 'fullName'
		| 'studentId'
		| 'dob'
		| 'rank'
		| 'fatherName'
		| 'motherName'
		| 'childrenInfos'
	>,
	unitLabel?: string
): SummaryRow[] {
	return [
		{ label: 'Họ và tên', value: text(values.fullName) },
		{ label: 'Mã số học viên', value: text(values.studentId) },
		{ label: 'Lớp', value: text(unitLabel) },
		{ label: 'Ngày sinh', value: text(values.dob) },
		{ label: 'Cấp bậc', value: text(values.rank) },
		{
			label: 'Cha, mẹ',
			value:
				[values.fatherName, values.motherName]
					.map((v) => v?.trim())
					.filter(Boolean)
					.join(', ') || '-'
		},
		{
			label: 'Con',
			value: String(values.childrenInfos?.length ?? 0)
		}
	]
}
