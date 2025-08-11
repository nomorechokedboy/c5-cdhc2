import { z } from 'zod'

export const BaseSchema = z.object({
	id: z.number(),
	createdAt: z.string(),
	updatedAt: z.string()
})

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.string(),
	label: z.string(),
	priority: z.string()
})

export type Task = z.infer<typeof taskSchema>

export const UnitSchema = z.object({
	alias: z.string(),
	name: z.string(),
	level: z.enum(['battalion', 'company'])
})

export const ClassBodySchema = z.object({
	name: z.string(),
	description: z.string(),

	unit: UnitSchema
})

export const ClassSchema = BaseSchema.merge(ClassBodySchema)

export const ChildrenInfoSchema = z.object({
	fullName: z.string(),
	dob: z.string()
})

export const StudentBodySchema = z.object({
	fullName: z.string(),
	birthPlace: z.string(),
	address: z.string(),
	class: ClassSchema,
	cpvId: z.string(),
	dob: z.string(),
	educationLevel: z.string(),
	enlistmentPeriod: z.string(),
	ethnic: z.string(),
	fatherJob: z.string(),
	fatherDob: z.string(),
	fatherName: z.string(),
	fatherPhoneNumber: z.string(),
	isGraduated: z.boolean(),
	major: z.string(),
	motherJob: z.string(),
	motherDob: z.string(),
	motherName: z.string(),
	motherPhoneNumber: z.string(),
	phone: z.string(),
	policyBeneficiaryGroup: z.string(),
	politicalOrg: z.enum(['cpv', 'hcyu']),
	politicalOrgOfficialDate: z.string(),
	position: z.string(),
	previousPosition: z.string(),
	previousUnit: z.string(),
	rank: z.string(),
	religion: z.string(),
	schoolName: z.string(),
	shortcoming: z.string(),
	talent: z.string(),
	isMarried: z.boolean(),
	spouseName: z.string(),
	spouseDob: z.string(),
	spousePhoneNumber: z.string(),
	childrenInfos: z.array(ChildrenInfoSchema),
	familySize: z.number(),
	familyBackground: z.string(),
	familyBirthOrder: z.string(),
	achievement: z.string(),
	disciplinaryHistory: z.string(),
	cpvOfficialAt: z.string()
})

export const StudentSchema = BaseSchema.merge(StudentBodySchema)
