import type { ChildrenInfo, ContactPerson, Student, StudentBody } from '@/types'
import { toDisplayDate, toStoredDate } from './student-dates'

/** Các trường ngày của học viên (lưu yyyy-mm-dd, hiển thị dd/mm/yyyy) */
export const STUDENT_DATE_FIELDS = [
	'dob',
	'enlistmentPeriod',
	'politicalOrgOfficialDate',
	'cpvOfficialAt',
	'fatherDob',
	'motherDob',
	'spouseDob'
] as const

/** Trường cần Number() khi gửi API (form giữ dạng người dùng nhập) */
const NUMBER_FIELDS = ['unitId', 'familySize'] as const

/** Giá trị form sửa học viên: ngày ở dạng dd/mm/yyyy, không còn `unit` lồng nhau */
export type StudentEditValues = Omit<
	Student,
	'unit' | 'avatar' | 'contactPerson' | 'siblings' | 'childrenInfos'
> & {
	avatar: string
	/** File ảnh đại diện mới (chưa upload) */
	avatarFile: File | null
	contactPerson: ContactPerson
	siblings: ChildrenInfo[]
	childrenInfos: ChildrenInfo[]
}

const mapPeople = (people?: ChildrenInfo[] | null): ChildrenInfo[] =>
	(people ?? []).map((p) => ({
		fullName: p.fullName ?? '',
		dob: toDisplayDate(p.dob)
	}))

/**
 * Student (API) → giá trị form.
 * - null → '' để input luôn controlled
 * - ngày → dd/mm/yyyy
 * - `unitId` luôn có (lấy từ `unit.id` nếu API chỉ trả `unit`)
 */
export function studentToFormValues(student: Student): StudentEditValues {
	const { unit, ...rest } = student
	const values: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(rest)) {
		values[key] = value === null ? '' : value
	}
	for (const key of STUDENT_DATE_FIELDS) {
		values[key] = toDisplayDate(student[key])
	}

	return {
		...(values as Omit<StudentEditValues, 'avatarFile'>),
		unitId: student.unitId ?? unit?.id,
		avatar: student.avatar ?? '',
		avatarFile: null,
		isMarried: !!student.isMarried,
		isGraduated: !!student.isGraduated,
		familySize: student.familySize ?? undefined,
		relatedDocumentations: student.relatedDocumentations ?? '',
		studentId: student.studentId ?? '',
		contactPerson: {
			name: student.contactPerson?.name ?? '',
			phoneNumber: student.contactPerson?.phoneNumber ?? '',
			address: student.contactPerson?.address ?? ''
		},
		childrenInfos: mapPeople(student.childrenInfos),
		siblings: mapPeople(student.siblings)
	}
}

const toNumber = (value: unknown): number | undefined => {
	if (value === '' || value === null || value === undefined) return undefined
	const n = Number(value)
	return Number.isFinite(n) ? n : undefined
}

/** Giá trị form → body gửi API (ngày yyyy-mm-dd, số là number, bỏ trường chỉ dùng cho form) */
export function formValuesToStudentPatch(
	values: StudentEditValues
): StudentBody & { id: number } {
	const { avatarFile: _avatarFile, ...rest } = values
	const patch: Record<string, unknown> = { ...rest }

	for (const key of STUDENT_DATE_FIELDS) {
		patch[key] = toStoredDate(values[key])
	}
	for (const key of NUMBER_FIELDS) {
		patch[key] = toNumber(values[key])
	}

	patch.childrenInfos = values.childrenInfos.map((p) => ({
		...p,
		dob: toStoredDate(p.dob)
	}))
	patch.siblings = values.siblings.map((p) => ({
		...p,
		dob: toStoredDate(p.dob)
	}))

	return patch as StudentBody & { id: number }
}
