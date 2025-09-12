import { Fragment, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
	FileSpreadsheet,
	Users,
	Target,
	School,
	Download,
	ChevronRight,
	ChevronDown
} from 'lucide-react'
import { StatisticsTable } from './statistics-table'
import { ChartsSection } from './charts-section'
import { ExportButton } from './export-button'
import { useQuery } from '@tanstack/react-query'
import { GetPoliticsQualityReport } from '@/api'
import { transformPoliticsQualityData } from '@/lib/utils'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from '@/components/ui/tooltip'
import useUnitsData from '@/hooks/useUnitsData'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '../ui/collapsible'

// Recursive renderer for children + classes
function UnitBlock({
	unit
}: {
	unit: {
		name: string
		politicsQualityReport: any
		classes?: any[]
		children?: any[]
	}
}) {
	const [isOpen, setIsOpen] = useState(false)
	const isParent =
		(unit.children !== undefined && unit.children?.length > 0) ||
		(unit.classes !== undefined && unit.classes.length > 0)

	if (isParent) {
		return (
			<Collapsible
				className='flex flex-col gap-4 p-4 border rounded-lg'
				open={isOpen}
				onOpenChange={setIsOpen}
			>
				<div>
					<CollapsibleTrigger asChild>
						<Button
							variant='ghost'
							className='hover:bg-transparent dark:hover:bg-transparent cursor-pointer'
						>
							{isOpen ? (
								<ChevronRight className='h-4 w-4' />
							) : (
								<ChevronDown className='h-4 w-4' />
							)}
							<h3 className='font-semibold'>{unit.name}</h3>
						</Button>
					</CollapsibleTrigger>
					<p className='text-sm text-muted-foreground'>
						Tổng quân số: {unit.politicsQualityReport?.total ?? 0}
					</p>
				</div>

				<CollapsibleContent className='flex flex-col gap-4 p-4 border rounded-lg'>
					{/* Render classes */}
					{unit.classes &&
						unit.classes.map((cls) => (
							<div
								key={cls.name}
								className='flex items-center justify-between p-4 border rounded-lg ml-4'
							>
								<div>
									<h4 className='font-medium'>{cls.name}</h4>
									<p className='text-sm text-muted-foreground'>
										Tổng quân số:{' '}
										{cls.politicsQualityReport?.total ?? 0}
									</p>
								</div>
							</div>
						))}

					{/* Render children recursively */}
					{unit.children &&
						unit.children.map((child) => (
							<div key={child.name} className='ml-4'>
								<UnitBlock unit={child} />
							</div>
						))}
				</CollapsibleContent>
			</Collapsible>
		)
	}

	return (
		<div className='flex flex-col gap-4 p-4 border rounded-lg'>
			<div>
				<h3 className='font-semibold'>{unit.name}</h3>
				<p className='text-sm text-muted-foreground'>
					Tổng quân số: {unit.politicsQualityReport?.total ?? 0}
				</p>
			</div>

			{/* Render classes */}
			{unit.classes &&
				unit.classes.map((cls) => (
					<div
						key={cls.name}
						className='flex items-center justify-between p-4 border rounded-lg ml-4'
					>
						<div>
							<h4 className='font-medium'>{cls.name}</h4>
							<p className='text-sm text-muted-foreground'>
								Tổng quân số:{' '}
								{cls.politicsQualityReport?.total ?? 0}
							</p>
						</div>
					</div>
				))}

			{/* Render children recursively */}
			{unit.children &&
				unit.children.map((child) => (
					<div key={child.name} className='ml-4'>
						<UnitBlock unit={child} />
					</div>
				))}
		</div>
	)
}

export function PoliticalQualityDashboard() {
	const { data: units = [] } = useUnitsData({ level: 'battalion' })
	const unitIds = units?.map((u) => u.id)
	const { data: politicsQualityData } = useQuery({
		enabled: unitIds.length !== 0,
		queryKey: ['politics-quality-report'],
		queryFn: () => GetPoliticsQualityReport(unitIds)
	})
	const transformData = transformPoliticsQualityData(politicsQualityData)

	const [activeTab, setActiveTab] = useState<
		'overview' | 'detailed' | 'charts'
	>('overview')

	const totalPersonnel = transformData
		.map((unit) => unit.politicsQualityReport?.total ?? 0)
		.reduce((accum, curr) => accum + curr, 0)
	const totalUnit =
		(politicsQualityData?.units
			.map((unit) => unit?.children?.length ?? 0)
			.reduce((accum, curr) => accum + curr),
		0) + 1
	const totalChildrenClasses =
		politicsQualityData?.units
			.map((unit) =>
				unit?.children
					?.map((u) => u.classes.length ?? 0)
					.reduce((accum, curr) => accum + curr, 0)
			)
			.reduce((accum, curr) => accum + curr, 0) ?? 0
	const totalUnitClasses =
		politicsQualityData?.units
			.map((unit) => unit?.classes?.length)
			.reduce((accum, curr) => accum + curr, 0) ?? 0

	return (
		<div className='container mx-auto p-6 space-y-6'>
			{/* Key Metrics */}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Tổng quân số
						</CardTitle>
						<Users className='h-4 w-4 text-blue-600' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-blue-900'>
							{totalPersonnel}
						</div>
						<p className='text-xs text-muted-foreground'>
							Toàn đơn vị
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Số đơn vị
						</CardTitle>
						<Target className='h-4 w-4 text-green-600' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-green-900'>
							{totalUnit}
						</div>
						<p className='text-xs text-muted-foreground'>Đơn vị</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>
							Số lớp
						</CardTitle>
						<School />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-green-900'>
							{totalChildrenClasses + totalUnitClasses}
						</div>
						<p className='text-xs text-muted-foreground'>Lớp</p>
					</CardContent>
				</Card>
			</div>

			{/* Navigation Tabs */}
			<div className='flex space-x-1 bg-gray-100 p-1 rounded-lg'>
				<Button
					variant={activeTab === 'overview' ? 'default' : 'ghost'}
					onClick={() => setActiveTab('overview')}
					className='flex-1'
				>
					Tổng quan
				</Button>
				<Button
					variant={activeTab === 'detailed' ? 'default' : 'ghost'}
					onClick={() => setActiveTab('detailed')}
					className='flex-1'
				>
					Chi tiết
				</Button>
				<Button
					variant={activeTab === 'charts' ? 'default' : 'ghost'}
					onClick={() => setActiveTab('charts')}
					className='flex-1'
				>
					Biểu đồ
				</Button>
			</div>

			{/* Content based on active tab */}
			{activeTab === 'overview' && (
				<div className='space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<FileSpreadsheet className='h-5 w-5' />
								Thống kê tổng quan theo đơn vị
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								{transformData.map((unit, index) => (
									<UnitBlock key={index} unit={unit} />
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{activeTab === 'detailed' && (
				<StatisticsTable data={transformData} />
			)}

			{activeTab === 'charts' && <ChartsSection data={transformData} />}

			{/* Export Section */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<Download className='h-5 w-5' />
						Xuất báo cáo
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='flex flex-col sm:flex-row gap-4'>
						<ExportButton data={transformData} />
						<Tooltip>
							<TooltipTrigger>
								<Button
									disabled
									variant='outline'
									className='flex items-center gap-2 bg-transparent'
								>
									<FileSpreadsheet className='h-4 w-4' />
									Xuất PDF
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Tính năng đang phát triển</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
