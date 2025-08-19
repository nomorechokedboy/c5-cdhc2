import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import type { UnitPoliticsQualitySummary } from '@/types'

interface StatisticsTableProps {
	data: UnitPoliticsQualitySummary[]
}

export function StatisticsTable({ data }: StatisticsTableProps) {
	const sampleReport = data[0]?.politicsQualityReport

	const ethnicKeys = sampleReport ? Object.keys(sampleReport.ethnic) : []
	const religionKeys = sampleReport ? Object.keys(sampleReport.religion) : []
	const educationKeys = sampleReport
		? Object.keys(sampleReport.educationLevel)
		: []

	const renderRow = (
		name: string,
		report: UnitPoliticsQualitySummary['politicsQualityReport'] | null,
		isChild: boolean = false
	) => (
		<TableRow>
			<TableCell
				className={`font-medium sticky left-0 border-r ${
					isChild ? 'pl-8 bg-gray-50' : 'bg-white'
				}`}
			>
				{name}
			</TableCell>
			<TableCell className='text-center'>{report?.total ?? 0}</TableCell>

			{/* Dynamic ethnic */}
			{ethnicKeys.map((key) => (
				<TableCell key={key} className='text-center'>
					{report?.ethnic[key] ?? 0}
				</TableCell>
			))}

			{/* Dynamic religion */}
			{religionKeys.map((key) => (
				<TableCell key={key} className='text-center'>
					{report?.religion[key] ?? 0}
				</TableCell>
			))}

			{/* Dynamic education */}
			{educationKeys.map((key) => (
				<TableCell key={key} className='text-center'>
					{report?.educationLevel[key] ?? 0}
				</TableCell>
			))}

			{/* Static placeholders */}
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
									rowSpan={2}
								>
									Tổng số
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
							{data.map((unit, index) => (
								<>
									{renderRow(
										unit.name,
										unit.politicsQualityReport,
										false
									)}
									{unit.classes?.map((cls, idx) =>
										renderRow(
											cls.name,
											cls.politicsQualityReport,
											true
										)
									)}
								</>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	)
}
