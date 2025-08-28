import dayjs from 'dayjs'
import * as z from 'zod'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export const studentSchema = z.object({
	// Personal Info Step
	fullName: z.string().min(1, 'Họ và tên không được để trống'),
	birthPlace: z.string().optional(),
	address: z.string().optional(),
	dob: z.string().optional(),
	ethnic: z.string().optional(),
	religion: z.string().optional(),
	educationLevel: z.string().optional(),
	schoolName: z.string().optional(),
	major: z.string().optional(),
	phone: z.string().min(1, 'Số điện thoại không được để trống'),
	classId: z.number().min(1, 'Vui lòng chọn lớp'),

	// Military Step
	rank: z.string().optional(),
	previousUnit: z.string().min(1, 'Đơn vị cũ không được để trống'),
	previousPosition: z
		.string()
		.min(1, 'Chức vụ công tác tại đơn vị cũ không được để trống'),
	enlistmentPeriod: z.string().min(1, 'Ngày nhập ngũ không được để trống'),
	politicalOrg: z.string().min(1, 'Đoàn/Đảng không được để trống'),
	politicalOrgOfficialDate: z
		.string()
		.min(1, 'Ngày vào Đoàn/Đảng không được để trống'),
	cpvId: z.string().optional(),
	cpvOfficialAt: z.string().nullable().optional(),
	talent: z.string().optional(),
	shortcoming: z.string().optional(),
	achievement: z.string().optional(),
	disciplinaryHistory: z.string().optional(),
	policyBeneficiaryGroup: z.string().optional(),

	// Parent Info Step
	familySize: z.number().optional(),
	familyBirthOrder: z.string().optional(),
	familyBackground: z.string().optional(),
	fatherName: z.string().optional(),
	fatherDob: z.string().optional(),
	fatherJob: z.string().optional(),
	fatherPhoneNumber: z.string().optional(),
	motherName: z.string().optional(),
	motherDob: z.string().optional(),
	motherJob: z.string().optional(),
	motherPhoneNumber: z.string().optional(),

	// Family Step
	isMarried: z.boolean().optional(),
	spouseName: z.string().optional(),
	spouseJob: z.string().optional(),
	spouseDob: z.string().optional(),
	spousePhoneNumber: z.string().optional(),
	childrenInfos: z.array(z.any()).optional(),

	// Other fields
	position: z.string().optional(),
	isGraduated: z.boolean().optional()
})

export type StudentFormData = z.infer<typeof studentSchema>

const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/

const optionalDate = z
	.string()
	.trim()
	.refine((val) => val === '' || dateRegex.test(val), {
		message: 'Hãy dùng định dạng Ngày/tháng/năm'
	})
	.refine((s) => {
		const parsed = dayjs(s, 'DD/MM/YYYY', true)
		return parsed.isValid() && parsed.format('DD/MM/YYYY') === s
	}, 'Ngày sinh không hợp lệ')
	.optional()

export const personalInfoSchema = z.object({
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
	dob: z
		.string()
		.regex(
			/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
			'Hãy dùng định dạng Ngày/tháng/năm'
		)
		.refine((s) => {
			const parsed = dayjs(s, 'DD/MM/YYYY', true)
			return parsed.isValid() && parsed.format('DD/MM/YYYY') === s
		}, 'Ngày sinh không hợp lệ')
})

export const militaryInfoSchema = z.object({
	rank: z.string().nonempty('Cấp bậc không được bỏ trống'),
	enlistmentPeriod: z.string().optional(),
	policyBeneficiaryGroup: z.string().optional(),
	previousUnit: z.string().optional(),
	previousPosition: z.string().optional(),
	politicalOrg: z.string().nonempty('Đoàn/Đảng không được bỏ trống'),
	politicalOrgOfficialDate: optionalDate,
	cpvId: z.string().optional(),
	cpvOfficialAt: optionalDate.nullish(),
	talent: z.string().optional(),
	shortcoming: z.string().optional(),
	achievement: z.string().optional(),
	disciplinaryHistory: z.string().optional()
})

export const parentInfoSchema = z.object({
	familySize: z.number().optional(),
	familyBirthOrder: z.string().optional(),
	familyBackground: z.string().optional(),
	fatherName: z.string().optional(),
	fatherDob: optionalDate,
	fatherJob: z.string().optional(),
	fatherPhoneNumber: z.string().optional(),
	motherName: z.string().optional(),
	motherDob: optionalDate,
	motherJob: z.string().optional(),
	motherPhoneNumber: z.string().optional()
})

export const ChildrenInfoSchema = z.object({
	fullName: z.string().nonempty('Họ tên không được bỏ trống'),
	dob: z
		.string()
		.regex(
			/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
			'Hãy dùng định dạng Ngày/tháng/năm'
		)
		.refine((s) => {
			const parsed = dayjs(s, 'DD/MM/YYYY', true)
			return parsed.isValid() && parsed.format('DD/MM/YYYY') === s
		}, 'Ngày sinh không hợp lệ')
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
	.merge(militaryInfoSchema)
	.merge(parentInfoSchema)
	.merge(familyInfoSchema)

export type StudentFormSchemaType = z.infer<typeof StudentFormSchema>
