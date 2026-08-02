import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Printer } from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import {
	GetLeaveCheckYearReport,
	GetLeaveNotYetTakenReport,
	GetLeaveTakenReport,
	ListLeaveAuditLogs,
	type LeaveCheckYearItem,
	type LeaveNotYetTakenItem,
	type LeaveTakenReportItem
} from '@/api/leave'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

const years = (() => {
	const y = dayjs().year()
	return Array.from({ length: y + 3 - 2022 + 1 }, (_, i) => 2022 + i)
})()

export default function LeaveReportsPage() {
	const [activeTab, setActiveTab] = useState('taken-list')
	const [year, setYear] = useState<string>(String(dayjs().year()))
	const [search, setSearch] = useState('')
	const { data: auditLogs = [] } = useQuery({
		queryKey: ['leave-audit-logs', 'LEAVE_REPORT'],
		queryFn: () => ListLeaveAuditLogs('LEAVE_REPORT')
	})

	const { data: takenData = [], isLoading: loadingTaken } = useQuery({
		queryKey: ['leave-report-taken', year],
		queryFn: () => GetLeaveTakenReport(Number(year)),
		enabled: !!year
	})

	const { data: checkYearData = [], isLoading: loadingCheckYear } = useQuery({
		queryKey: ['leave-report-check-year', year, search],
		queryFn: () =>
			GetLeaveCheckYearReport({
				year: Number(year),
				search: search || undefined
			}),
		enabled: !!year
	})

	const { data: notYetTakenData = [], isLoading: loadingNotYetTaken } =
		useQuery({
			queryKey: ['leave-report-not-yet-taken', year],
			queryFn: () => GetLeaveNotYetTakenReport(Number(year)),
			enabled: !!year
		})

	function handleExportExcel(data: unknown, filename: string) {
		const rows = [Object.keys(data[0] || {})]
		for (const item of data) {
			rows.push(Object.values(item))
		}
		const csv = rows.map((r) => r.join(',')).join('\n')
		const blob = new Blob([csv], { type: 'text/csv' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${filename}.csv`
		a.click()
		URL.revokeObjectURL(url)
		toast.success('Đã xuất file')
	}

	return (
		<div className='space-y-4'>
			<div className='rounded-md border p-4'>
				<h3 className='mb-2 font-semibold'>Nhật ký báo cáo</h3>
				<div className='max-h-40 overflow-auto text-sm'>
					{auditLogs.length === 0
						? 'Chưa có nhật ký'
						: auditLogs.slice(0, 20).map((x) => (
								<div key={x.id} className='border-b py-1'>
									{dayjs(x.createdAt).format(
										'DD/MM/YYYY HH:mm'
									)}{' '}
									· {x.details || x.action}
								</div>
							))}
				</div>
			</div>
			<div>
				<h2 className='text-2xl font-bold tracking-tight'>
					Báo cáo nghỉ phép
				</h2>
			</div>

			<div className='flex items-center gap-2'>
				<div className='w-36'>
					<Label>Năm</Label>
					<Select value={year} onValueChange={setYear}>
						<SelectTrigger>
							<SelectValue placeholder='Chọn năm' />
						</SelectTrigger>
						<SelectContent>
							{years.map((y) => (
								<SelectItem key={y} value={String(y)}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value='taken-list'>
						Báo cáo danh sách đã nghỉ phép
					</TabsTrigger>
					<TabsTrigger value='check-year'>
						Tra cứu nghỉ phép năm
					</TabsTrigger>
					<TabsTrigger value='not-yet-taken'>
						Thống kê chưa nghỉ phép
					</TabsTrigger>
				</TabsList>

				<TabsContent value='taken-list'>
					<div className='flex items-center justify-between'>
						<p className='text-sm text-muted-foreground'>
							Danh sách quân nhân đã nghỉ phép năm {year}
						</p>
						<Button
							variant='outline'
							size='sm'
							onClick={() =>
								handleExportExcel(
									takenData,
									`da-nghi-phep-${year}`
								)
							}
						>
							Xuất CSV
						</Button>
					</div>
					<div className='rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mã QN</TableHead>
									<TableHead>Họ tên</TableHead>
									<TableHead>Đối tượng</TableHead>
									<TableHead>Đơn vị</TableHead>
									<TableHead>Loại</TableHead>
									<TableHead>Tổng ngày</TableHead>
									<TableHead>Từ ngày</TableHead>
									<TableHead>Đến ngày</TableHead>
									<TableHead>Trạng thái</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loadingTaken && (
									<TableRow>
										<TableCell
											colSpan={9}
											className='text-center'
										>
											<Loader2 className='mx-auto h-5 w-5 animate-spin' />
										</TableCell>
									</TableRow>
								)}
								{!loadingTaken && takenData.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={9}
											className='text-center text-muted-foreground'
										>
											Không có dữ liệu
										</TableCell>
									</TableRow>
								)}
								{(takenData as LeaveTakenReportItem[]).map(
									(r) => (
										<TableRow key={r.id}>
											<TableCell className='font-mono text-sm'>
												{r.personnelCode}
											</TableCell>
											<TableCell>
												{r.personnelName}
											</TableCell>
											<TableCell>
												<Badge variant='secondary'>
													{r.objectTypeLabel}
												</Badge>
											</TableCell>
											<TableCell>{r.unitName}</TableCell>
											<TableCell>
												{r.leaveType === 'SPECIAL'
													? 'Đặc biệt'
													: 'Phép năm'}
											</TableCell>
											<TableCell className='font-medium'>
												{r.totalDays}
											</TableCell>
											<TableCell>
												{r.startDate
													? dayjs(r.startDate).format(
															'DD/MM/YYYY'
														)
													: '—'}
											</TableCell>
											<TableCell>
												{r.endDate
													? dayjs(r.endDate).format(
															'DD/MM/YYYY'
														)
													: '—'}
											</TableCell>
											<TableCell>
												<Badge variant='secondary'>
													{r.status}
												</Badge>
											</TableCell>
										</TableRow>
									)
								)}
							</TableBody>
						</Table>
					</div>
				</TabsContent>

				<TabsContent value='check-year'>
					<div className='flex items-center gap-2'>
						<div className='min-w-[200px] flex-1'>
							<Label>Tìm kiếm quân nhân</Label>
							<Input
								placeholder='Tìm mã QN hoặc tên...'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<Button
							variant='outline'
							size='sm'
							onClick={() =>
								handleExportExcel(
									checkYearData,
									`tra-cuu-nghi-phep-${year}`
								)
							}
						>
							Xuất CSV
						</Button>
					</div>
					<div className='rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mã QN</TableHead>
									<TableHead>Họ tên</TableHead>
									<TableHead>Đối tượng</TableHead>
									<TableHead>Đơn vị</TableHead>
									<TableHead>Tổng ngày</TableHead>
									<TableHead>Còn lại</TableHead>
									<TableHead>Hạn mức</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loadingCheckYear && (
									<TableRow>
										<TableCell
											colSpan={7}
											className='text-center'
										>
											<Loader2 className='mx-auto h-5 w-5 animate-spin' />
										</TableCell>
									</TableRow>
								)}
								{!loadingCheckYear &&
									checkYearData.length === 0 && (
										<TableRow>
											<TableCell
												colSpan={7}
												className='text-center text-muted-foreground'
											>
												Không có kết quả
											</TableCell>
										</TableRow>
									)}
								{(checkYearData as LeaveCheckYearItem[]).map(
									(r) => (
										<TableRow
											key={`${r.personnelCode}-${r.personnelName}`}
										>
											<TableCell className='font-mono text-sm'>
												{r.personnelCode}
											</TableCell>
											<TableCell>
												{r.personnelName}
											</TableCell>
											<TableCell>
												<Badge variant='secondary'>
													{r.objectTypeLabel}
												</Badge>
											</TableCell>
											<TableCell>{r.unitName}</TableCell>
											<TableCell className='font-medium'>
												{r.totalDays}
											</TableCell>
											<TableCell className='tabular-nums'>
												{r.remainingDays ?? 0}
											</TableCell>
											<TableCell className='tabular-nums'>
												{r.quotaDays ?? '—'}
											</TableCell>
										</TableRow>
									)
								)}
							</TableBody>
						</Table>
					</div>
				</TabsContent>

				<TabsContent value='not-yet-taken'>
					<div className='flex items-center justify-between'>
						<p className='text-sm text-muted-foreground'>
							Danh sách quân nhân chưa nghỉ phép năm {year}
						</p>
						<Button
							variant='outline'
							size='sm'
							onClick={() =>
								handleExportExcel(
									notYetTakenData,
									`chua-nghi-phep-${year}`
								)
							}
						>
							Xuất CSV
						</Button>
					</div>
					<div className='rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mã QN</TableHead>
									<TableHead>Họ tên</TableHead>
									<TableHead>Đối tượng</TableHead>
									<TableHead>Đơn vị</TableHead>
									<TableHead>Hạn mức</TableHead>
									<TableHead>Còn lại</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loadingNotYetTaken && (
									<TableRow>
										<TableCell
											colSpan={6}
											className='text-center'
										>
											<Loader2 className='mx-auto h-5 w-5 animate-spin' />
										</TableCell>
									</TableRow>
								)}
								{!loadingNotYetTaken &&
									notYetTakenData.length === 0 && (
										<TableRow>
											<TableCell
												colSpan={6}
												className='text-center text-muted-foreground'
											>
												Không có dữ liệu
											</TableCell>
										</TableRow>
									)}
								{(
									notYetTakenData as LeaveNotYetTakenItem[]
								).map((r) => (
									<TableRow
										key={`${r.personnelCode}-${r.personnelName}`}
									>
										<TableCell className='font-mono text-sm'>
											{r.personnelCode}
										</TableCell>
										<TableCell>{r.personnelName}</TableCell>
										<TableCell>
											<Badge variant='secondary'>
												{r.objectTypeLabel}
											</Badge>
										</TableCell>
										<TableCell>{r.unitName}</TableCell>
										<TableCell className='tabular-nums'>
											{r.quotaDays ?? '—'}
										</TableCell>
										<TableCell className='tabular-nums font-medium'>
											{r.remainingDays ?? 0}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	)
}
