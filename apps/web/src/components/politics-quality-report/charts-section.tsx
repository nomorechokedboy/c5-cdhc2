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
import type { UnitPoliticsQualitySummary } from '@/types'

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
	 * Flattened rows for bar chart (unit + class)
	 */
	const unitData = units.flatMap((unit) => {
		const rows: any[] = []

		// Unit-level row
		rows.push({
			name: unit.name,
			...(unit.politicsQualityReport ?? {})
		})

		// Class-level rows
		if (unit.classes) {
			rows.push(
				...unit.classes.map((cls) => ({
					name: `${unit.name} - ${cls.name}`,
					...(cls.politicsQualityReport ?? {})
				}))
			)
		}

		return rows
	})

	/**
	 * Collect all unique keys from educationLevel for dynamic bars
	 */
	const eduKeys = Array.from(
		new Set(
			units.flatMap((u) => [
				...Object.keys(u.politicsQualityReport?.educationLevel ?? {}),
				...(u.classes?.flatMap((c) =>
					Object.keys(c.politicsQualityReport?.educationLevel ?? {})
				) ?? [])
			])
		)
	)

	/**
	 * Collect all unique keys from religion for dynamic pie chart
	 */
	const religionKeys = Array.from(
		new Set(
			units.flatMap((u) => [
				...Object.keys(u.politicsQualityReport?.religion ?? {}),
				...(u.classes?.flatMap((c) =>
					Object.keys(c.politicsQualityReport?.religion ?? {})
				) ?? [])
			])
		)
	)

	const ethnicKeys = Array.from(
		new Set(
			units.flatMap((u) => [
				...Object.keys(u.politicsQualityReport?.ethnic ?? {}),
				...(u.classes?.flatMap((c) =>
					Object.keys(c.politicsQualityReport?.ethnic ?? {})
				) ?? [])
			])
		)
	)

	const politicalOrgKeys = Array.from(
		new Set(
			units.flatMap((u) => [
				...Object.keys(u.politicsQualityReport?.politicalOrg ?? {}),
				...(u.classes?.flatMap((c) =>
					Object.keys(c.politicsQualityReport?.politicalOrg ?? {})
				) ?? [])
			])
		)
	)

	/**
	 * Aggregate religion counts
	 */
	const religionAgg: Record<string, number> = {}
	units.forEach((u) => {
		u.classes?.forEach((cls) => {
			Object.entries(cls.politicsQualityReport?.religion ?? {}).forEach(
				([key, val]) => {
					religionAgg[key] = (religionAgg[key] || 0) + val
				}
			)
		})
	})
	const religionData = religionKeys.map((name, idx) => ({
		name,
		value: religionAgg[name] || 0,
		color: COLORS[idx % COLORS.length]
	}))

	/**
	 * Aggregate education counts (only classes to avoid double counting)
	 */
	const eduAgg: Record<string, number> = {}
	units.forEach((u) => {
		u.classes?.forEach((cls) => {
			Object.entries(
				cls.politicsQualityReport?.educationLevel ?? {}
			).forEach(([key, val]) => {
				eduAgg[key] = (eduAgg[key] || 0) + val
			})
		})
	})
	const educationData = eduKeys.map((name, idx) => ({
		name,
		value: eduAgg[name] || 0,
		color: COLORS[idx % COLORS.length]
	}))

	const ethnicAgg: Record<string, number> = {}
	units.forEach((u) => {
		u.classes?.forEach((cls) => {
			Object.entries(cls.politicsQualityReport?.ethnic ?? {}).forEach(
				([key, val]) => {
					ethnicAgg[key] = (ethnicAgg[key] || 0) + val
				}
			)
		})
	})
	const ethnicData = ethnicKeys.map((name, idx) => ({
		name,
		value: ethnicAgg[name] || 0,
		color: COLORS[idx % COLORS.length]
	}))

	const politicalOrgAgg: Record<string, number> = {}
	units.forEach((u) => {
		u.classes?.forEach((cls) => {
			Object.entries(
				cls.politicsQualityReport?.politicalOrg ?? {}
			).forEach(([key, val]) => {
				politicalOrgAgg[key] = (politicalOrgAgg[key] || 0) + val
			})
		})
	})
	const politicalOrgData = politicalOrgKeys.map((name, idx) => ({
		name: politicalOrgNameMapping[
			name as keyof typeof politicalOrgNameMapping
		],
		value: politicalOrgAgg[name],
		color: COLORS[idx % COLORS.length]
	}))

	return (
		<div className='space-y-6'>
			{/* Unit + Class Personnel Chart */}
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

				{/* Religion Distribution */}
				<PieChartCard data={religionData} title='Phân bố tôn giáo' />

				{/* Education Level Distribution */}
				<PieChartCard
					title='Phân bố trình độ văn hóa'
					data={educationData}
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
								fill='#8884d8'
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
