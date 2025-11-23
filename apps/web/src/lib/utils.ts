import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { type students } from '@/api/client'
import type { UnitPoliticsQualitySummary, Unit } from '@/types'
import { ApiUrl } from '@/lib/const'

dayjs.locale('vi')
dayjs.extend(relativeTime)
dayjs.extend(weekOfYear)
dayjs.extend(quarterOfYear)
dayjs.extend(utc)
dayjs.extend(timezone)

dayjs.tz.setDefault('Asia/Ho_Chi_Minh')

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatTimestamp(timestamp: string) {
	return dayjs(timestamp).fromNow()
}

export function getCurrentWeekNumber() {
	return dayjs().week()
}

export function getCurrentQuarter() {
	return dayjs().quarter()
}

export function toVNTz(utcTimestamp: string) {
	return dayjs.utc(utcTimestamp).format('DD-MM-YYYY')
}

export function transformPoliticsQualityData(
	params: students.GetPoliticsQualityReportResponse | undefined
) {
	if (params === undefined) {
		return []
	}

	const { data, units } = params

	function mergeReports(
		target: Record<string, any>,
		source: Record<string, any>
	) {
		for (const [key, value] of Object.entries(source)) {
			if (typeof value === 'number') {
				target[key] = (target[key] ?? 0) + value
			} else if (typeof value === 'object' && value !== null) {
				target[key] = mergeReports(target[key] ?? {}, value)
			}
		}
		return target
	}

	function traverse(unitNode: Unit): UnitPoliticsQualitySummary {
		let unitReport: Record<string, any> = {}
		const classesReport: UnitPoliticsQualitySummary[] = []
		const childrenReport: UnitPoliticsQualitySummary[] = []

		// collect class reports
		if (unitNode.classes && unitNode.classes.length > 0) {
			for (const cls of unitNode.classes) {
				const clsReport = data[cls.id] ?? null
				classesReport.push({
					name: cls.name,
					politicsQualityReport: clsReport
				})
				if (clsReport) {
					unitReport = mergeReports(unitReport, clsReport)
				}
			}
		}

		// collect children reports recursively
		if (unitNode.children && unitNode.children.length > 0) {
			for (const child of unitNode.children) {
				const childSummary = traverse(child)
				childrenReport.push(childSummary)
				if (childSummary.politicsQualityReport) {
					unitReport = mergeReports(
						unitReport,
						childSummary.politicsQualityReport
					)
				}
			}
		}

		const unitSummary: UnitPoliticsQualitySummary = {
			name: unitNode.name,
			politicsQualityReport:
				Object.keys(unitReport).length > 0 ? unitReport : null
		}

		if (classesReport.length > 0) {
			unitSummary.classes = classesReport
		}
		if (childrenReport.length > 0) {
			unitSummary.children = childrenReport
		}

		return unitSummary
	}

	return units.map((unit) => traverse(unit as unknown as Unit))
}

export function convertToIso(dateStr: string): string {
	const [day, month, year] = dateStr.split('/')
	return `${year}-${month}-${day}`
}

export function getMediaUri(uri: string) {
	const mediaUrl = 'media'

	return `${ApiUrl}/${mediaUrl}/${uri}`
}

export const isSuperAdmin = (): boolean => {
	try {
		const token = localStorage.getItem('qlhvAccessToken')
		if (!token) return false
		const parts = token.split('.')
		if (parts.length !== 3) return false
		const payload = JSON.parse(atob(parts[1]))
		return payload.isSuperUser === true
	} catch {
		return false
	}
}
export const isUserApproved = (): boolean => {
	try {
		const token = localStorage.getItem('qlhvAccessToken')
		if (!token) return false
		const parts = token.split('.')
		if (parts.length !== 3) return false
		const payload = JSON.parse(atob(parts[1]))
		return payload.status === 'approved'
	} catch {
		return false
	}
}
