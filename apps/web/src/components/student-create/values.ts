import type { ChildrenInfo, ContactPerson, StudentBody } from '@/types'
import { toStoredDate } from '@/lib/student-dates'

/** Giá trị form thêm học viên: ngày ở dạng dd/mm/yyyy, ảnh là File chưa upload */
export type StudentCreateValues = Omit<
	StudentBody,
	| 'avatar'
	| 'unitId'
	| 'status'
	| 'cpvId'
	| 'siblings'
	| 'contactPerson'
	| 'relatedDocumentations'
	| 'studentId'
	| 'politicalOrg'
> & {
	avatar: File | null
	/** undefined = chưa chọn lớp */
	unitId: number | undefined
	politicalOrg: 'hcyu' | 'cpv'
	cpvId: string
	siblings: ChildrenInfo[]
	contactPerson: ContactPerson
	relatedDocumentations: string
	studentId: string
}

export const studentCreateDefaults: StudentCreateValues = {
	avatar: null,
	studentId: '',
	fullName: '',
	unitId: undefined,
	dob: '',
	birthPlace: '',
	address: '',
	phone: '',
	ethnic: '',
	religion: '',
	educationLevel: '',
	schoolName: '',
	major: '',
	isGraduated: false,

	rank: '',
	enlistmentPeriod: '',
	policyBeneficiaryGroup: '',
	previousUnit: '',
	previousPosition: '',
	politicalOrg: 'hcyu',
	politicalOrgOfficialDate: '',
	cpvId: '',
	talent: '',
	shortcoming: '',
	achievement: '',
	disciplinaryHistory: '',
	contactPerson: { name: '', phoneNumber: '', address: '' },
	relatedDocumentations: '',

	familySize: 0,
	familyBirthOrder: '',
	familyBackground: '',
	fatherName: '',
	fatherDob: '',
	fatherJob: '',
	fatherPhoneNumber: '',
	motherName: '',
	motherDob: '',
	motherJob: '',
	motherPhoneNumber: '',
	siblings: [],

	isMarried: false,
	spouseName: '',
	spouseDob: '',
	spouseJob: '',
	spousePhoneNumber: '',
	childrenInfos: []
}

const toPeople = (people: ChildrenInfo[]): ChildrenInfo[] =>
	people.map((p) => ({ ...p, dob: toStoredDate(p.dob) }))

/**
 * Giá trị form → body gửi API. Ngày đổi dd/mm/yyyy → yyyy-mm-dd bằng chuỗi
 * (không qua `toISOString()` nên không lệch múi giờ). `unitId` đã được schema
 * đảm bảo có giá trị trước khi tới đây.
 */
export function createValuesToStudentBody(
	values: Omit<StudentCreateValues, 'avatar'>
): StudentBody {
	return {
		...values,
		unitId: Number(values.unitId),
		familySize: Number(values.familySize ?? 0),
		dob: toStoredDate(values.dob),
		enlistmentPeriod: toStoredDate(values.enlistmentPeriod),
		politicalOrgOfficialDate: toStoredDate(values.politicalOrgOfficialDate),
		fatherDob: toStoredDate(values.fatherDob),
		motherDob: toStoredDate(values.motherDob),
		spouseDob: toStoredDate(values.spouseDob),
		isMarried: values.isMarried || values.spouseName.trim() !== '',
		childrenInfos: toPeople(values.childrenInfos),
		siblings: toPeople(values.siblings)
	} as StudentBody
}
