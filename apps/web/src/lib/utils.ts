import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { classes, type students } from '@/api/client'
import type { UnitPoliticsQualitySummary, Unit } from '@/types'

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

	const result: UnitPoliticsQualitySummary[] = []
	const classesReport: UnitPoliticsQualitySummary[] = []
	const { data, unit } = params

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

	function traverse(unitNode: Unit): Record<string, any> {
		let unitReport: Record<string, any> = {}

		// collect class reports
		if (unitNode.classes) {
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
		if (unitNode.children) {
			for (const child of unitNode.children) {
				const childReport = traverse(child)
				unitReport = mergeReports(unitReport, childReport)
			}
		}

		// push the unit itself with aggregated report
		result.push({
			name: unitNode.name,
			politicsQualityReport:
				Object.keys(unitReport).length > 0 ? unitReport : null,
			classes: classesReport
		})

		return unitReport
	}

	traverse(unit as unknown as Unit)

	return result
}
