import * as z from 'zod'
import { isDisplayDate } from '@/lib/student-dates'

const INVALID_DATE = 'Ngày không hợp lệ, hãy nhập Ngày/tháng/năm'

/** Ngày dd/mm/yyyy (dạng hiển thị của DatePicker); để trống là hợp lệ */
const optionalDate = z
	.string()
	.trim()
	.refine((v) => v === '' || isDisplayDate(v), { message: INVALID_DATE })

/** Ngày dd/mm/yyyy bắt buộc */
const requiredDate = (emptyMessage: string) =>
	z
		.string()
		.trim()
		.min(1, emptyMessage)
		.refine((v) => v === '' || isDisplayDate(v), { message: INVALID_DATE })

const optionalText = z.string().optional()

export const personalInfoSchema = z.object({
	avatar: z
		.file()
		.mime(['image/png', 'image/webp', 'image/jpeg', 'image/svg+xml'])
		.max(2_000_000)
		.nullable(),
	fullName: z.string().trim().min(1, 'Họ và tên không được bỏ trống'),
	studentId: z.string(),
	unitId: z
		.number({ error: 'Lớp không được bỏ trống' })
		.min(1, 'Lớp không được bỏ trống'),
	dob: requiredDate('Ngày sinh không được bỏ trống'),
	birthPlace: optionalText,
	address: optionalText,
	ethnic: z.string().min(1, 'Dân tộc không được bỏ trống'),
	religion: z.string().min(1, 'Tôn giáo không được bỏ trống'),
	educationLevel: z.string().min(1, 'Trình độ học vấn không được bỏ trống'),
	schoolName: optionalText,
	major: optionalText,
	phone: optionalText
})

export const militaryInfoSchema = z.object({
	rank: z.string(),
	enlistmentPeriod: optionalDate,
	policyBeneficiaryGroup: optionalText,
	previousUnit: optionalText,
	previousPosition: optionalText,
	politicalOrg: z.enum(['hcyu', 'cpv']),
	politicalOrgOfficialDate: optionalDate,
	cpvId: optionalText,
	talent: optionalText,
	shortcoming: optionalText,
	achievement: optionalText,
	disciplinaryHistory: optionalText,
	contactPerson: z.object({
		name: optionalText,
		phoneNumber: optionalText,
		address: optionalText
	}),
	relatedDocumentations: optionalText
})

const personSchema = z.object({
	fullName: z.string().trim().min(1, 'Họ tên không được bỏ trống'),
	dob: requiredDate('Ngày sinh không được bỏ trống')
})

export const parentInfoSchema = z.object({
	familySize: z.number().optional(),
	familyBirthOrder: optionalText,
	familyBackground: optionalText,
	fatherName: optionalText,
	fatherDob: optionalDate,
	fatherJob: optionalText,
	fatherPhoneNumber: optionalText,
	motherName: optionalText,
	motherDob: optionalDate,
	motherJob: optionalText,
	motherPhoneNumber: optionalText,
	siblings: z.array(personSchema)
})

export const familyInfoSchema = z.object({
	spouseName: optionalText,
	spouseDob: optionalDate,
	spouseJob: optionalText,
	spousePhoneNumber: optionalText,
	childrenInfos: z.array(personSchema),
	isMarried: z.boolean()
})

export const StudentCreateSchema = personalInfoSchema
	.extend(militaryInfoSchema.shape)
	.extend(parentInfoSchema.shape)
	.extend(familyInfoSchema.shape)

/** Issue của zod → `{ 'siblings[0].fullName': 'message' }` (mỗi field giữ lỗi đầu tiên) */
export function issuesToFieldErrors(
	issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>
): Record<string, string> {
	const errors: Record<string, string> = {}
	for (const { path, message } of issues) {
		const key = path.reduce<string>(
			(acc, part) =>
				typeof part === 'number'
					? `${acc}[${part}]`
					: acc
						? `${acc}.${String(part)}`
						: String(part),
			''
		)
		if (!(key in errors)) errors[key] = message
	}
	return errors
}
