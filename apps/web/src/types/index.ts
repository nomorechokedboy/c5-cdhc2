export interface Class extends Base {
	name: string
	description: string
	studentCount: number

	unit: Unit
}

export interface ClassBody {
	name: string
	description?: string
}

export type PoliticalOrg = 'hcyu' | 'cpv'

export type StudentBody = {
	fullName: string
	birthPlace: string
	address: string
	class: Class
	cpvId: string
	dob: string
	educationLevel: string
	enlistmentPeriod: string
	ethnic: string
	fatherJob: string
	fatherDob: string
	fatherName: string
	fatherPhoneNumber: string
	isGraduated: boolean
	major: string
	motherJob: string
	motherDob: string
	motherName: string
	motherPhoneNumber: string
	phone: string
	policyBeneficiaryGroup: string
	politicalOrg: PoliticalOrg
	politicalOrgOfficialDate: string
	position: string
	previousPosition: string
	previousUnit: string
	rank: string
	religion: string
	schoolName: string
	shortcoming: string
	talent: string
	isMarried: boolean
	spouseName: string
	spouseDob: string
	spousePhoneNumber: string
	childrenInfos: ChildrenInfo[]
	familySize: number
	familyBackground: string
	familyBirthOrder: string
	achievement: string
	disciplinaryHistory: string
	cpvOfficialAt: string
}

type Base = {
	id: number
	createdAt: string
	updatedAt: string
}

export interface Student extends Base, StudentBody {}

export type ClassResponse = { data: Class[] }

export type StudentResponse = { data: Student[] }

export type UnitResponse = { data: Unit[] }

export interface SearchInputConfig {
	columnKey: string
	placeholder?: string
	className?: string
}

export interface FacetedFilterConfig {
	columnKey: string
	title: string
	options: {
		label: string
		value: string
		icon?: React.ComponentType<{ className?: string }>
	}[]
}

export type Month =
	| '01'
	| '02'
	| '03'
	| '04'
	| '05'
	| '06'
	| '07'
	| '08'
	| '09'
	| '10'
	| '11'
	| '12'

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export interface StudentQueryParams {
	birthdayInMonth?: Month
	birthdayInQuarter?: Quarter
	birthdayInWeek?: boolean
	classId?: number
	isMarried?: boolean
	politicalOrg?: PoliticalOrg
	isEthnicMinority?: boolean
	hasReligion?: boolean
	unitAlias?: string
	unitLevel?: string
}

export type ChildrenInfo = {
	fullName: string
	dob: string
}

export type DeleteStudentsBody = {
	ids: number[]
}

export type UpdateStudentBody = Partial<StudentBody> & { id: number }

export type UpdateStudentsBody = {
	data: UpdateStudentBody[]
}

export type UnitLevel = 'battalion' | 'company'

export const defaultStudentColumnVisibility = {
	dob: false,
	enlistmentPeriod: false,
	isGraduated: false,
	major: false,
	phone: false,
	position: false,
	policyBeneficiaryGroup: false,
	politicalOrgOfficialDate: false,
	cpvId: false,
	previousPosition: false,
	religion: false,
	schoolName: false,
	shortcoming: false,
	talent: false,
	fatherName: false,
	fatherJob: false,
	fatherPhoneNumber: false,
	motherName: false,
	motherJob: false,
	motherPhoneNumber: false,
	address: false,
	birthPlace: false
}

export interface AppNotificationItem extends Base {
	notifiableId: number
	notifiableType: 'classes' | 'students'
	relatedData: Student | Class
}

export interface AppNotification {
	id: string
	createdAt: string
	readAt: string | null

	message: string
	notificationType: 'birthday' | 'officialCpv'
	title: string
	totalCount: number

	items: AppNotificationItem[]
}

export interface AppNotificationResponse {
	data: AppNotification[]
}

export interface AppNotificationQuery {
	page?: number
	pageSize?: number
}

export interface MarkAsReadNotificationParams {
	ids: string[]
}

export interface GetUnitQuery {
	level: UnitLevel
}

export interface Unit extends Base {
	alias: string
	name: string
	level: UnitLevel

	parent?: Unit | null
	children: Unit[]
	classes?: Class[]
}

export interface GetUnitResponse {
	data: Unit[]
}

export interface GetUnreadNotificationCountResponse {
	data: { count: number }
}
