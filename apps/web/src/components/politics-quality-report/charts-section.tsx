import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart'
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell
} from 'recharts'
import type { PoliticsQualityReport, UnitPoliticsQualitySummary } from '@/types'

export interface ChartsSectionProps {
	data: UnitPoliticsQualitySummary[]
}

const COLORS = [
	'#0088FE',
	'#00C49F',
	'#FFBB28',
	'#FF8042',
	'#8884D8',
	'#82CA9D',
	'#A4DE6C',
	'#D0ED57',
	'#FF6666'
]

const politicalOrgNameMapping = { cpv: 'Đảng', hcyu: 'Đoàn' }

export function ChartsSection({ data }: ChartsSectionProps) {
	const units = data

	/**
	 * Flatten only classes (leaf data for aggregation)
	 */
	const flattenClasses = (
		entity: UnitPoliticsQualitySummary,
		prefix: string = ''
	): any[] => {
		const rows: any[] = []

		entity.classes?.forEach((cls) => {
			rows.push({
				name: prefix ? `${prefix} - ${cls.name}` : cls.name,
				...(cls.politicsQualityReport ?? {})
			})
		})

		entity.children?.forEach((child) => {
			rows.push(...flattenClasses(child, entity.name))
		})

		return rows
	}

	/**
	 * Flatten all (units + classes) for BarChart
	 */
	const flattenReports = (
		entity: UnitPoliticsQualitySummary,
		prefix: string = ''
	): any[] => {
		const rows: any[] = []

		rows.push({
			name: prefix ? `${prefix} - ${entity.name}` : entity.name,
			...(entity.politicsQualityReport ?? {})
		})

		entity.classes?.forEach((cls) => {
			rows.push({
				name: `${entity.name} - ${cls.name}`,
				...(cls.politicsQualityReport ?? {})
			})
		})

		entity.children?.forEach((child) => {
			rows.push(...flattenReports(child, entity.name))
		})

		return rows
	}

	const unitData = units.flatMap((u) => flattenReports(u))
	const classData = units.flatMap((u) => flattenClasses(u))

	/**
	 * Dynamic keys
	 */
	const collectKeys = (key: keyof PoliticsQualityReport) =>
		Array.from(
			new Set(classData.flatMap((row) => Object.keys(row[key] ?? {})))
		)

	const eduKeys = collectKeys('educationLevel')
	const religionKeys = collectKeys('religion')
	const ethnicKeys = collectKeys('ethnic')
	const politicalOrgKeys = collectKeys('politicalOrg')

	/**
	 * Aggregate only class-level data (no duplication)
	 */
	const aggregate = (
		key: keyof PoliticsQualityReport
	): Record<string, number> => {
		const agg: Record<string, number> = {}
		classData.forEach((row) => {
			Object.entries(row[key] ?? {}).forEach(([k, v]) => {
				agg[k] = (agg[k] || 0) + v
			})
		})
		return agg
	}

	const religionData = religionKeys.map((name, idx) => ({
		name,
		value: aggregate('religion')[name] || 0,
		color: COLORS[idx % COLORS.length]
	}))

	const educationData = eduKeys.map((name, idx) => ({
		name,
		value: aggregate('educationLevel')[name] || 0,
		color: COLORS[idx % COLORS.length]
	}))

	const ethnicData = ethnicKeys.map((name, idx) => ({
		name,
		value: aggregate('ethnic')[name] || 0,
		color: COLORS[idx % COLORS.length]
	}))

	const politicalOrgData = politicalOrgKeys.map((name, idx) => ({
		name:
			politicalOrgNameMapping[
				name as keyof typeof politicalOrgNameMapping
			] ?? name,
		value: aggregate('politicalOrg')[name] || 0,
		color: COLORS[idx % COLORS.length]
	}))

	return (
		<div className='space-y-6'>
			<Card>
				<CardHeader>
					<CardTitle>Biểu đồ nhân sự theo đơn vị & lớp</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer
						config={Object.fromEntries(
							['total', ...eduKeys].map((key, i) => [
								key,
								{
									label: key,
									color: `hsl(var(--chart-${(i % 5) + 1}))`
								}
							])
						)}
						className='h-[300px]'
					>
						<ResponsiveContainer width='100%' height='100%'>
							<BarChart data={unitData}>
								<CartesianGrid strokeDasharray='3 3' />
								<XAxis dataKey='name' />
								<YAxis />
								<ChartTooltip
									content={<ChartTooltipContent />}
								/>
								<Bar
									dataKey='total'
									fill='var(--color-total)'
									name='Tổng số'
								/>
								{eduKeys.map((key) => (
									<Bar
										key={key}
										dataKey={`educationLevel.${key}`}
										fill={`var(--color-${key})`}
										name={key}
									/>
								))}
							</BarChart>
						</ResponsiveContainer>
					</ChartContainer>
				</CardContent>
			</Card>

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				<PieChartCard data={ethnicData} title='Phân bố dân tộc' />
				<PieChartCard data={religionData} title='Phân bố tôn giáo' />
				<PieChartCard
					data={educationData}
					title='Phân bố trình độ văn hóa'
				/>
				<PieChartCard
					data={politicalOrgData}
					title='Phân bố Đoàn/Đảng'
				/>
			</div>
		</div>
	)
}

type PieChartData = {
	name: string
	value: number
	color: string
}

type PieChartCardProps = {
	title: string
	data: PieChartData[]
}

function PieChartCard({ data, title }: PieChartCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={{ value: { label: 'Số lượng' } }}
					className='h-[300px]'
				>
					<ResponsiveContainer width='100%' height='100%'>
						<PieChart>
							<Pie
								data={data}
								cx='50%'
								cy='50%'
								labelLine={false}
								label={({ name, percent }) =>
									`${name} ${(percent * 100).toFixed(0)}%`
								}
								outerRadius={80}
								dataKey='value'
							>
								{data.map((entry, index) => (
									<Cell
										key={`cell-${index}`}
										fill={entry.color}
									/>
								))}
							</Pie>
							<ChartTooltip content={<ChartTooltipContent />} />
						</PieChart>
					</ResponsiveContainer>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}
