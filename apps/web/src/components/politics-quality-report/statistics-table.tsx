import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import type { PoliticsQualityReport, UnitPoliticsQualitySummary } from '@/types'

interface StatisticsTableProps {
	data: UnitPoliticsQualitySummary[]
}

export function StatisticsTable({ data }: StatisticsTableProps) {
	const sampleReport = data.find(
		(d) => d.politicsQualityReport !== null
	)?.politicsQualityReport

	const ethnicKeys = sampleReport ? Object.keys(sampleReport.ethnic) : []
	const religionKeys = sampleReport ? Object.keys(sampleReport.religion) : []
	const educationKeys = sampleReport
		? Object.keys(sampleReport.educationLevel)
		: []

	const renderRow = (
		name: string,
		report: UnitPoliticsQualitySummary['politicsQualityReport'] | null,
		depth: number = 0,
		parentName?: string
	) => (
		<TableRow key={`${name}-${parentName}`}>
			<TableCell
				className={`font-medium sticky left-0 border-r ${depth > 0 ? 'bg-gray-50' : 'bg-white'}  ${depth === 1 && 'pl-4'} ${depth === 2 && 'pl-6'}`}
			>
				{name}
			</TableCell>

			<TableCell className='text-center'>0</TableCell>
			<TableCell className='text-center'>0</TableCell>
			<TableCell className='text-center'>0</TableCell>
			<TableCell className='text-center'>0</TableCell>
			{ethnicKeys.map((key) => (
				<TableCell key={key} className='text-center'>
					{report?.ethnic[key] ?? 0}
				</TableCell>
			))}
			{religionKeys.map((key) => (
				<TableCell key={key} className='text-center'>
					{report?.religion[key] ?? 0}
				</TableCell>
			))}
			{educationKeys.map((key) => (
				<TableCell key={key} className='text-center'>
					{report?.educationLevel[key] ?? 0}
				</TableCell>
			))}

			<TableCell className='text-center'>
				{report?.politicalOrg['cpv'] ?? 0}
			</TableCell>
			<TableCell className='text-center'>
				{report?.politicalOrg['hcyu'] ?? 0}
			</TableCell>
			<TableCell className='text-center'>0</TableCell>
			<TableCell className='text-center'>0</TableCell>
			<TableCell className='text-center'>0</TableCell>
		</TableRow>
	)

	const renderEntity = (
		entity:
			| UnitPoliticsQualitySummary
			| UnitPoliticsQualitySummary['classes'][number],
		depth: number = 0,
		entityName?: string
	): React.ReactNode[] => {
		const rows: React.ReactNode[] = []
		rows.push(
			renderRow(
				entity.name,
				entity.politicsQualityReport,
				depth,
				entityName
			)
		)

		if (entity.classes) {
			entity.classes.forEach((cls) =>
				rows.push(...renderEntity(cls, depth + 1, entity.name))
			)
		}

		if (entity.children) {
			entity.children.forEach((child) =>
				rows.push(...renderEntity(child, depth + 1))
			)
		}

		return rows
	}

	const totalCpv = data
		.map((d) => d.politicsQualityReport?.politicalOrg['cpv'] ?? 0)
		.reduce((accum, curr) => accum + curr, 0)
	const totalHcyu = data
		.map((d) => d.politicsQualityReport?.politicalOrg['hcyu'] ?? 0)
		.reduce((accum, curr) => accum + curr, 0)
	const calculateTotalReportField =
		(fieldname: keyof PoliticsQualityReport) => (key: string) => (
			<TableCell key={key} className='text-center'>
				{data
					.map((d) => d.politicsQualityReport?.[fieldname][key] ?? 0)
					.reduce((accum, curr) => accum + curr, 0)}
			</TableCell>
		)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Bảng thống kê chi tiết</CardTitle>
			</CardHeader>
			<CardContent>
				<div className='overflow-x-auto relative'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									className='w-32 sticky left-0 bg-white z-20 border-t border-r shadow-sm'
									rowSpan={2}
								>
									Đơn vị
								</TableHead>
								<TableHead
									className='text-center border-b-0 border-r border-t'
									colSpan={4}
								>
									Phân cấp
								</TableHead>
								<TableHead
									className='text-center border-b-0 border-r border-t'
									colSpan={ethnicKeys.length}
								>
									Dân tộc
								</TableHead>
								<TableHead
									className='text-center border-b-0 border-r border-t'
									colSpan={religionKeys.length}
								>
									Tôn giáo
								</TableHead>
								<TableHead
									className='text-center border-b-0 border-r border-t'
									colSpan={educationKeys.length}
								>
									Văn hóa
								</TableHead>

								<TableHead
									className='text-center border-b-0 border-r border-t'
									rowSpan={2}
								>
									Đảng viên
								</TableHead>
								<TableHead
									className='text-center border-b-0 border-r border-t'
									rowSpan={2}
								>
									Đoàn viên
								</TableHead>
								<TableHead
									className='text-center border-b-0 border-r border-t'
									colSpan={3}
								>
									Gia đình
								</TableHead>
								<TableHead
									className='text-center border-b-0 border-r border-t'
									rowSpan={2}
								>
									Ghi chú
								</TableHead>
							</TableRow>
							<TableRow>
								<TableHead className='text-center border-r'>
									Tá
								</TableHead>
								<TableHead className='text-center border-r'>
									Úy
								</TableHead>
								<TableHead className='text-center border-r'>
									QNCN (Cán bộ quản lý)
								</TableHead>
								<TableHead className='text-center border-r'>
									QNCN
								</TableHead>
								{ethnicKeys.map((key) => (
									<TableHead
										key={key}
										className='text-center border-r'
									>
										{key}
									</TableHead>
								))}
								{religionKeys.map((key) => (
									<TableHead
										key={key}
										className='text-center border-r'
									>
										{key}
									</TableHead>
								))}
								{educationKeys.map((key) => (
									<TableHead
										key={key}
										className='text-center border-r'
									>
										{key}
									</TableHead>
								))}
								<TableHead className='text-center border-r'>
									Cách mạng
								</TableHead>
								<TableHead className='text-center border-r'>
									N/quân-quyền
								</TableHead>
								<TableHead className='text-center border-r'>
									Nước ngoài
								</TableHead>
							</TableRow>
						</TableHeader>

						<TableBody>
							{data.flatMap((unit) => renderEntity(unit))}
						</TableBody>
						<TableFooter>
							<TableRow>
								<TableCell
									className='border-b-0 border-r border-t sticky left-0'
									rowSpan={2}
								>
									Tổng số
								</TableCell>

								<TableCell className='text-center'>0</TableCell>
								<TableCell className='text-center'>0</TableCell>
								<TableCell className='text-center'>0</TableCell>
								<TableCell className='text-center'>0</TableCell>

								{/* Ethnics */}
								{ethnicKeys.map(
									calculateTotalReportField('ethnic')
								)}

								{/* Religions */}
								{religionKeys.map(
									calculateTotalReportField('religion')
								)}

								{/* Education */}
								{educationKeys.map(
									calculateTotalReportField('educationLevel')
								)}

								{/* politicalOrg */}
								<TableCell className='text-center'>
									{totalCpv}
								</TableCell>
								<TableCell className='text-center'>
									{totalHcyu}
								</TableCell>

								<TableCell className='text-center'>0</TableCell>
								<TableCell className='text-center'>0</TableCell>
								<TableCell className='text-center'>0</TableCell>
							</TableRow>
						</TableFooter>
					</Table>
				</div>
			</CardContent>
		</Card>
	)
}
