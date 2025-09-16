import { InferInsertModel, InferSelectModel, relations, sql } from 'drizzle-orm'
import * as sqlite from 'drizzle-orm/sqlite-core'
import { customType } from 'drizzle-orm/sqlite-core'
import { AppError } from '../errors/index'
import { baseSchema } from './base'
import { Class, classes } from './classes'

const PoliticalOrgEnum = customType<{ data: string; driverData: string }>({
	dataType() {
		return 'text'
	},
	toDriver(val: string) {
		if (!['hcyu', 'cpv'].includes(val)) {
			throw AppError.invalidArgument(
				'politicalOrg can be only hcyu or cpv'
			)
		}
		return val
	}
})

export const students = sqlite.sqliteTable('students', {
	...baseSchema,
	fullName: sqlite.text().default(''),
	birthPlace: sqlite.text().default(''),
	address: sqlite.text().default(''),
	dob: sqlite.text().default(''),
	rank: sqlite.text().default(''),
	previousUnit: sqlite.text().default(''),
	previousPosition: sqlite.text().default(''),
	position: sqlite.text().default('Học viên'),
	ethnic: sqlite.text().default(''),
	religion: sqlite.text().default('Không'),
	enlistmentPeriod: sqlite.text().default(''),
	politicalOrg: PoliticalOrgEnum('politicalOrg')
		.$type<'hcyu' | 'cpv'>()
		.notNull(),
	politicalOrgOfficialDate: sqlite.text().default(''),
	cpvId: sqlite.text(),
	educationLevel: sqlite.text().default(''),
	schoolName: sqlite.text().default(''),
	major: sqlite.text().default(''),
	isGraduated: sqlite.int({ mode: 'boolean' }).default(false),
	talent: sqlite.text().default('Không'),
	shortcoming: sqlite.text().default('Không'),
	policyBeneficiaryGroup: sqlite.text().default('Không'),
	fatherName: sqlite.text().default(''),
	fatherDob: sqlite.text().default(''),
	fatherPhoneNumber: sqlite.text().default(''),
	fatherJob: sqlite.text().default(''),
	// fatherJobAddress: sqlite.text().default(''),
	motherName: sqlite.text().default(''),
	motherDob: sqlite.text().default(''),
	motherPhoneNumber: sqlite.text().default(''),
	motherJob: sqlite.text().default(''),
	// motherJobAddress: sqlite.text().default(''),
	isMarried: sqlite.int({ mode: 'boolean' }).default(false),
	spouseName: sqlite.text().default(''),
	spouseDob: sqlite.text().default(''),
	spouseJob: sqlite.text().default(''),
	spousePhoneNumber: sqlite.text().default(''),
	childrenInfos: sqlite.text({ mode: 'json' }).default(sql`'[]'`),
	familySize: sqlite.int(),
	familyBackground: sqlite.text().default('Không'),
	familyBirthOrder: sqlite.text().default(''),
	achievement: sqlite.text().default('Không'),
	disciplinaryHistory: sqlite.text().default('Không'),
	phone: sqlite.text().default(''),
	classId: sqlite
		.integer()
		.notNull()
		.references(() => classes.id),
	cpvOfficialAt: sqlite.text()
})

export const studentsRelations = relations(students, ({ one }) => ({
	class: one(classes, {
		fields: [students.classId],
		references: [classes.id]
	})
}))

export type StudentDB = InferSelectModel<typeof students>

export type Student = Omit<StudentDB, 'classId'> & {
	class: Omit<Class, 'studentCount'>
}

export type StudentParam = InferInsertModel<typeof students>

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

export type StudentQuery = {
	birthdayInMonth?: Month
	birthdayInQuarter?: Quarter
	birthdayInWeek?: boolean
	classIds?: Array<number>
	hasReligion?: boolean
	ids?: Array<number>
	isEthnicMinority?: boolean
	isMarried?: boolean
	politicalOrg?: 'hcyu' | 'cpv'
	isCpvOfficialThisWeek?: boolean
	cpvOfficialInMonth?: Month
	cpvOfficialInQuarter?: Quarter
}

export type UpdateStudentMap = {
	id: number
	updatePayload: { [k: string]: any }
}[]

export interface StudentCronJobEvent {
	getQueryParams(): StudentQuery
}

export class BirthdayThisWeek implements StudentCronJobEvent {
	constructor() {}

	getQueryParams(): StudentQuery {
		return { birthdayInWeek: true }
	}
}

export class BirthdayThisMonth implements StudentCronJobEvent {
	constructor(private month: Month) {}

	getQueryParams(): StudentQuery {
		return { birthdayInMonth: this.month }
	}
}

export class BirthdayThisQuarter implements StudentCronJobEvent {
	constructor(private quarter: Quarter) {}

	getQueryParams(): StudentQuery {
		return { birthdayInQuarter: this.quarter }
	}
}

export class CpvOfficialThisWeek implements StudentCronJobEvent {
	constructor() {}

	getQueryParams(): StudentQuery {
		return { isCpvOfficialThisWeek: true }
	}
}

export class CpvOfficialThisMonth implements StudentCronJobEvent {
	constructor(private month: Month) {}

	getQueryParams(): StudentQuery {
		return { cpvOfficialInMonth: this.month }
	}
}

export class CpvOfficialThisQuarter implements StudentCronJobEvent {
	constructor(private quarter: Quarter) {}

	getQueryParams(): StudentQuery {
		return { cpvOfficialInQuarter: this.quarter }
	}
}

export type StudentCronEvent =
	| 'birthdayThisWeek'
	| 'birthdayThisMonth'
	| 'birthdayThisQuarter'
	| 'cpvOfficialThisWeek'
	| 'cpvOfficialThisMonth'
	| 'cpvOfficialThisQuarter'

export type PoliticsQualityRow = {
	category: string
	classId: number
	value: string | number
	count: number
}

export type ExcelTemplateData = {
	city: string
	columns: string[]
	commanderName: string
	commanderPosition: string
	commanderRank: string
	day: string
	month: string
	reportTitle: string
	rows: Record<string, string>[]
	underUnitName: string
	unitName: string
	year: number
}

export const templateTypes = [
	'CpvTempl',
	'HcyuTempl',
	'StudentInfoTempl',
	'StudentWithAdversityTempl'
] as const

export type TemplateType = (typeof templateTypes)[number]
