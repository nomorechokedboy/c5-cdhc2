import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	Download,
	FileSpreadsheet,
	TrendingUp,
	Users,
	Award,
	Target,
	School
} from 'lucide-react'
import { StatisticsTable } from './statistics-table'
import { ChartsSection } from './charts-section'
import { ExportButton } from './export-button'
import { useQuery } from '@tanstack/react-query'
import { GetPoliticsQualityReport, requestClient } from '@/api'
import { transformPoliticsQualityData } from '@/lib/utils'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from '@/components/ui/tooltip'

export function PoliticalQualityDashboard() {
	const { data: politicsQualityData } = useQuery({
		queryKey: ['politics-quality-report'],
		queryFn: GetPoliticsQualityReport
	})
	const transformData = transformPoliticsQualityData(politicsQualityData)

	const [activeTab, setActiveTab] = useState<
		'overview' | 'detailed' | 'charts'
	>('overview')

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
							{transformData
								.map(
									(unit) =>
										unit.politicsQualityReport?.total ?? 0
								)
								.reduce((accum, curr) => accum + curr, 0)}
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
							{transformData.length}
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
							{transformData
								.map((unit) => unit.classes?.length ?? 0)
								.reduce((accum, curr) => accum + curr, 0)}
						</div>
						<p className='text-xs text-muted-foreground'>Lớp</p>
					</CardContent>
				</Card>

				{/* <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                        <CardTitle className='text-sm font-medium'>
                            Tỷ lệ hoàn thành
                        </CardTitle>
                        <TrendingUp className='h-4 w-4 text-orange-600' />
                    </CardHeader>
                    <CardContent>
                        <div className='text-2xl font-bold text-orange-900'>
                            {reportData.summary.completionRate}%
                        </div>
                        <p className='text-xs text-muted-foreground'>
                            Chất lượng chính trị
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                        <CardTitle className='text-sm font-medium'>
                            Tỷ lệ xuất sắc
                        </CardTitle>
                        <Award className='h-4 w-4 text-purple-600' />
                    </CardHeader>
                    <CardContent>
                        <div className='text-2xl font-bold text-purple-900'>
                            {reportData.summary.excellentRate}%
                        </div>
                        <p className='text-xs text-muted-foreground'>
                            Đánh giá cao
                        </p>
                    </CardContent>
                </Card> */}
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
									<div
										key={index}
										className='flex flex-col gap-4 justify-between p-4 border rounded-lg'
									>
										<div>
											<h3 className='font-semibold'>
												{unit.name}
											</h3>
											<p className='text-sm text-muted-foreground'>
												Tổng quân số:{' '}
												{
													unit.politicsQualityReport
														?.total
												}
											</p>
										</div>
										{unit.classes !== undefined &&
											unit.classes.length !== 0 &&
											unit.classes.map((cls) => (
												<div
													key={cls.name}
													className='flex items-center justify-between p-4 border rounded-lg'
												>
													<div>
														<h3 className='font-semibold'>
															{cls.name}
														</h3>
														<p className='text-sm text-muted-foreground'>
															Tổng quân số:{' '}
															{
																cls
																	.politicsQualityReport
																	?.total
															}
														</p>
													</div>
												</div>
											))}
										{/*
                                            <div className='flex gap-2'>
                                                <Badge variant='secondary'>
                                                    Học việc:{' '}
                                                    {
                                                        unit..phanCap
                                                            .hocViec
                                                    }
                                                </Badge>
                                                <Badge variant='outline'>
                                                    Dân tộc Hoa:{' '}
                                                    {unit.categories.danToc.hoa}
                                                </Badge>
                                            </div>
                                        */}
									</div>
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
