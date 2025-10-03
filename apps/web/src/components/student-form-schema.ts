import dayjs from 'dayjs'
import * as z from 'zod'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/

const optionalDate = z
	.string()
	.trim()
	.refine((val) => val === '' || dateRegex.test(val), {
		message: 'Hãy dùng định dạng Ngày/tháng/năm'
	})
	.refine((val) => val === '' || dayjs(val, 'DD/MM/YYYY', true).isValid(), {
		message: 'Ngày không hợp lệ'
	})
	.optional()

const isoDateSchema = z
	.string()
	.regex(
		/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
		'Hãy dùng định dạng Ngày/tháng/năm'
	)
	.refine((s) => dayjs(s, 'DD/MM/YYYY', true).isValid(), 'Ngày không hợp lệ')
	.transform((s) => dayjs(s, 'DD/MM/YYYY').toISOString())

export const personalInfoSchema = z.object({
	avatar: z
		.file()
		.mime(['image/png', 'image/webp', 'image/jpeg', 'image/svg+xml'])
		.max(2_000_000)
		.nullable(),
	fullName: z.string().nonempty('Họ và tên không được bỏ trống'),
	classId: z.preprocess(
		(val) => {
			if (typeof val === 'string') {
				return Number.parseInt(val)
			}

			return val
		},
		z.number().min(1, 'Lớp không được bỏ trống')
	),
	birthPlace: z.string().optional(),
	address: z.string().optional(),
	ethnic: z.string().nonempty('Dân tộc không được bỏ trống'),
	religion: z.string().nonempty('Tôn giáo không được bỏ trống'),
	educationLevel: z.string().nonempty('Trình độ học vấn không được bỏ trống'),
	schoolName: z.string().optional(),
	major: z.string().optional(),
	phone: z.string().optional(),
	dob: isoDateSchema,
	studentId: z.string().nonempty('Mã học viên không được bỏ trống')
})

export const militaryInfoSchema = z.object({
	rank: z.string(),
	enlistmentPeriod: z.string().optional(),
	policyBeneficiaryGroup: z.string().optional(),
	previousUnit: z.string().optional(),
	previousPosition: z.string().optional(),
	politicalOrg: z.string(),
	politicalOrgOfficialDate: optionalDate,
	cpvId: z.string().optional(),
	cpvOfficialAt: optionalDate.nullish(),
	talent: z.string().optional(),
	shortcoming: z.string().optional(),
	achievement: z.string().optional(),
	disciplinaryHistory: z.string().optional(),
	contactPerson: z
		.object({
			name: z.string().optional(),
			phoneNumber: z.string().optional(),
			address: z.string().optional()
		})
		.optional()
		.default({}),
	relatedDocumentations: z.string().optional().default('')
})

export const ChildrenInfoSchema = z.object({
	fullName: z.string().nonempty('Họ tên không được bỏ trống'),
	dob: isoDateSchema
})

export const parentInfoSchema = z.object({
	familySize: z.coerce.number().optional(),
	familyBirthOrder: z.string().optional(),
	familyBackground: z.string().optional(),
	fatherName: z.string().optional(),
	fatherDob: optionalDate,
	fatherJob: z.string().optional(),
	fatherPhoneNumber: z.string().optional(),
	motherName: z.string().optional(),
	motherDob: optionalDate,
	motherJob: z.string().optional(),
	motherPhoneNumber: z.string().optional(),
	siblings: z.array(ChildrenInfoSchema).optional()
})

export const familyInfoSchema = z.object({
	spouseName: z.string().optional(),
	spouseDob: optionalDate,
	spouseJob: z.string().optional(),
	spousePhoneNumber: z.string().optional(),
	childrenInfos: z.array(ChildrenInfoSchema).optional(),
	isMarried: z.boolean().default(false)
})

export const StudentFormSchema = personalInfoSchema
	.extend(militaryInfoSchema.shape)
	.extend(parentInfoSchema.shape)
	.extend(familyInfoSchema.shape)

export type StudentFormSchemaType = z.infer<typeof StudentFormSchema>
