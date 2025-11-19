import type { units } from '@/api/client'
import type { QueryObserverResult } from '@tanstack/react-query'
import { extend } from 'dayjs'

export interface Class extends Base {
	name: string
	description: string
	studentCount: number
	graduatedAt: string | null
	unit: Unit
}
export interface UserFormData extends Base {
	username: string
	password: string
	displayName: string
	unitid: number
	issuperuser: boolean
}

export interface ClassBody {
	name: string
	description?: string
}

export type PoliticalOrg = 'hcyu' | 'cpv'

export type StudentBody = {
	fullName?: string
	birthPlace?: string
	address?: string
	class?: Class
	cpvId?: string
	dob?: string
	educationLevel?: string
	enlistmentPeriod?: string
	ethnic?: string
	fatherJob?: string
	fatherDob?: string
	fatherName?: string
	fatherPhoneNumber?: string
	isGraduated?: boolean
	major?: string
	motherJob?: string
	motherDob?: string
	motherName?: string
	motherPhoneNumber?: string
	phone?: string
	policyBeneficiaryGroup?: string
	politicalOrg?: PoliticalOrg
	politicalOrgOfficialDate?: string
	position?: string
	previousPosition?: string
	previousUnit?: string
	rank?: string
	religion?: string
	schoolName?: string
	shortcoming?: string
	talent?: string
	isMarried?: boolean
	spouseName?: string
	spouseDob?: string
	spousePhoneNumber?: string
	childrenInfos?: ChildrenInfo[]
	familySize?: number
	familyBackground?: string
	familyBirthOrder?: string
	achievement?: string
	disciplinaryHistory?: string
	cpvOfficialAt?: string
	avatar?: string
	siblings?: ChildrenInfo[]
	contactPerson?: ContactPerson
	studentId: string
	relatedDocumentations?: string
}

type Base = {
	id: number
	createdAt: string
	updatedAt: string
}

export interface UserBody {
	username: string
	password: string
	displayName: string
	unitId: number
	isSuperUser?: boolean
}
export interface UpdateUserBody {
	id?: number
	displayName: string
	unitId?: number
	isSuperUser?: boolean
}
export interface UserUpdate {
	id: number
	displayName: string
	unitId: number
	isSuperUser?: boolean
}

export interface Student extends Base, StudentBody {}
export interface User extends UserBody {}

export type ClassResponse = { data: Class[] }

export type StudentResponse = { data: Student[] }

export type UnitResponse = { data: Unit[] }
export type UpdateUserResponse = { data: User }

export type UserResponse = { data: User[] }

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
	isCpvOfficialThisWeek?: boolean
	cpvOfficialInMonth?: Month
	cpvOfficialInQuarter?: Quarter
	classIds?: number[]
}

export type ChildrenInfo = {
	fullName: string
	dob: string
}

export type ContactPerson = {
	name: string
	phoneNumber: string
	address: string
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

export type AppNotificationType = 'birthday' | 'officialCpv'

export interface AppNotification {
	id: string
	createdAt: string
	readAt: string | null

	message: string
	notificationType: AppNotificationType
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

export type ExportData = {
	city: string
	commanderName: string
	commanderPosition: string
	commanderRank: string
	data: Record<string, string>[]
	date?: string
	underUnitName: string
	unitName: string
	templateType?: TemplType
}

export type OnDeleteRows = (
	ids: Array<number>
) => Promise<QueryObserverResult<Array<Student>, Error>>

export interface UnitPoliticsQualitySummary {
	name: string
	politicsQualityReport: PoliticsQualityReport | null
	children?: UnitPoliticsQualitySummary[]
	classes?: UnitPoliticsQualitySummary[]
}

export type PoliticsQualitySummary = {
	totalPersonnel: number
	totalUnits: number
}

export type BasePoliticsQualitySummary = Record<string, number>

export type PoliticsQualityReport = {
	educationLevel: BasePoliticsQualitySummary
	ethnic: BasePoliticsQualitySummary
	politicalOrg: BasePoliticsQualitySummary
	previousUnit: BasePoliticsQualitySummary
	religion: BasePoliticsQualitySummary
	total: number
}

export type AppTheme =
	| 'light'
	| 'dark'
	| 'system'
	| 'blue'
	| 'green'
	| 'purple'
	| 'orange'
	| 'red'
	| 'stone'
	| 'zinc'
	| 'gray'
	| 'slate'
	| 'none'

export interface ExportPoliticsQualitySummary {
	idx: number
	className: string
	total: number
	totalColonel: number
	totalLieutenant: number
	totalProSoldierCommander: number
	totalProSoldier: number
	totalSoldier: number
	totalWorker: number
	kinh: number
	hoa: number
	otherEthnics: number
	buddhism: number
	christianity: number
	caodaism: number
	protestantism: number
	hoahaoism: number
	secondarySchool: number
	highSchool: number
	universityAndOthers: number
	postGraduate: number
	cpv: number
	hcyu: number
	cm: number
	nguy: number
	aboard: number
	male: number
	female: number
	note: string
}

export interface ExportPoliticsQualityReport {
	data: ExportPoliticsQualitySummary[]
	title: string
}

export const templTypes = [
	'CpvTempl',
	'HcyuTempl',
	'StudentInfoTempl',
	'StudentWithAdversityTempl',
	'StudentEnrollmentFormTempl',
	'UserInfoTempl'
] as const

export type TemplType = (typeof templTypes)[number]
