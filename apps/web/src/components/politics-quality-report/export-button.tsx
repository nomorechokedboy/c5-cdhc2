import { Button } from '@/components/ui/button'
import type {
	ExportPoliticsQualitySummary,
	PoliticsQualityReport,
	UnitPoliticsQualitySummary
} from '@/types'
import { Download } from 'lucide-react'
import ExportPoliticsQualityDialog from '../export-politics-quality-dialog'

export interface ExportButtonProps {
	data: UnitPoliticsQualitySummary[]
}

function reportDataToExportData(
	idx: number,
	name: string,
	report: PoliticsQualityReport
): ExportPoliticsQualitySummary {
	// Map education levels
	const secondarySchool = report.educationLevel?.['Cấp II'] || 0
	const highSchool = report.educationLevel?.['Cấp III'] || 0
	const universityAndOthers = report.educationLevel?.['TC-CĐ-ĐH'] || 0
	const postGraduate = report.educationLevel?.['Sau ĐH'] || 0

	// Map ethnicities
	const kinh = report.ethnic?.['Kinh'] || 0
	const hoa = report.ethnic?.['Hoa'] || 0

	// Calculate other ethnicities (sum all except Kinh and Hoa)
	let otherEthnics = 0
	if (report.ethnic) {
		Object.keys(report.ethnic).forEach((key) => {
			if (key !== 'Kinh' && key !== 'Hoa') {
				otherEthnics += report.ethnic[key]
			}
		})
	}

	// Map religions
	const buddhism = report.religion?.['Phật giáo'] || 0
	const christianity =
		(report.religion?.['Thiên chúa giáo'] || 0) +
		(report.religion?.['thiên chúa'] || 0)
	const caodaism = report.religion?.['Cao đài'] || 0
	const protestantism = report.religion?.['Tin lành'] || 0
	const hoahaoism = report.religion?.['hòa hảo'] || 0

	// Map political organizations
	const cpv = report.politicalOrg?.['cpv'] || 0
	const hcyu = report.politicalOrg?.['hcyu'] || 0
	const cm = report.politicalOrg?.['cm'] || 0
	const nguy = report.politicalOrg?.['nguy'] || 0

	return {
		idx,
		className: name,
		total: report.total || 0,
		totalColonel: 0, // Not provided in source data
		totalLieutenant: 0, // Not provided in source data
		totalProSoldierCommander: 0, // Not provided in source data
		totalProSoldier: 0, // Not provided in source data
		totalSoldier: 0, // Not provided in source data
		totalWorker: 0, // Not provided in source data
		kinh,
		hoa,
		otherEthnics,
		buddhism,
		christianity,
		caodaism,
		protestantism,
		hoahaoism,
		secondarySchool,
		highSchool,
		universityAndOthers,
		postGraduate,
		cpv,
		hcyu,
		cm,
		nguy,
		aboard: 0, // Not provided in source data
		male: 0, // Not provided in source data
		female: 0, // Not provided in source data
		note: ''
	}
}

function convertToPoliticsQualitySummary(
	data: UnitPoliticsQualitySummary[]
): ExportPoliticsQualitySummary[] {
	const result: ExportPoliticsQualitySummary[] = []
	let idx = 1

	function processUnit(
		unit: UnitPoliticsQualitySummary,
		currentIdx: number
	): ExportPoliticsQualitySummary | null {
		if (!unit.politicsQualityReport) return null

		const report = unit.politicsQualityReport
		return reportDataToExportData(currentIdx, unit.name, report)
	}

	function processDataRecursively(
		transformData: UnitPoliticsQualitySummary[]
	) {
		transformData.forEach((unit) => {
			// Process the unit itself
			const converted = processUnit(unit, idx++)
			if (converted) {
				result.push(converted)
			}

			// Process children
			if (unit.children) {
				unit.children.forEach((child) => {
					const childConverted = processUnit(child, idx++)
					if (childConverted) {
						result.push(childConverted)
					}

					// Process classes within children
					if (child.classes) {
						child.classes.forEach((cls) => {
							const classConverted = processUnit(cls, idx++)
							if (classConverted !== null) {
								classConverted.className = ` - Lớp ${classConverted?.className}`
							}

							if (classConverted) {
								result.push(classConverted)
							}
						})
					}
				})
			}

			// Process classes at the same level
			if (unit.classes) {
				unit.classes.forEach((cls) => {
					const classConverted = processUnit(cls, idx++)
					if (classConverted) {
						result.push(classConverted)
					}
				})
			}
		})
	}

	processDataRecursively(data)
	return result
}

function calculateTotalObject(data: UnitPoliticsQualitySummary[]) {
	const exportData: Omit<
		ExportPoliticsQualitySummary,
		'idx' | 'className' | 'note'
	> = data
		.map((d, idx) => {
			if (d.politicsQualityReport === null) {
				return null
			}
			const {
				idx: _,
				className: _cName,
				note,
				...data
			} = reportDataToExportData(idx, d.name, d.politicsQualityReport)
			return data
		})
		.filter((el) => el !== null)
		.reduce(
			(accum, curr) => {
				const keys = Object.keys(accum) as (keyof Omit<
					ExportPoliticsQualitySummary,
					'idx' | 'className' | 'note'
				>)[]
				keys.forEach((key) => (accum[key] = accum[key] + curr[key]))
				return accum
			},
			{
				total: 0,
				cm: 0,
				cpv: 0,
				hoa: 0,
				hcyu: 0,
				kinh: 0,
				male: 0,
				nguy: 0,
				aboard: 0,
				female: 0,
				buddhism: 0,
				caodaism: 0,
				hoahaoism: 0,
				highSchool: 0,
				totalWorker: 0,
				christianity: 0,
				otherEthnics: 0,
				postGraduate: 0,
				totalColonel: 0,
				totalSoldier: 0,
				protestantism: 0,
				secondarySchool: 0,
				totalLieutenant: 0,
				totalProSoldier: 0,
				universityAndOthers: 0,
				totalProSoldierCommander: 0
			}
		)

	return exportData
}

export function ExportButton({ data: originalData }: ExportButtonProps) {
	const total = calculateTotalObject(originalData)
	const exportData = convertToPoliticsQualitySummary(originalData).map(
		(el, idx) => ({ ...el, idx: ++idx })
	)
	const data = { data: exportData, total }

	return (
		<ExportPoliticsQualityDialog
			data={data}
			defaultFilename='thong-ke-chat-luong-chinh-tri'
		>
			<Button className='flex items-center gap-2'>
				<Download className='h-4 w-4' />
				Xuất file Excel (.xlsx)
			</Button>
		</ExportPoliticsQualityDialog>
	)
}
