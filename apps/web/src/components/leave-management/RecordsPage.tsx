import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Printer } from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import {
	ListLeaveRecords,
	type LeaveRecord,
	type LeaveRequest
} from '@/api/leave'
import { printLeaveCertificate } from '@/components/leave-management/printLeaveCertificate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

export default function RecordsPage() {
	const [search, setSearch] = useState('')
	const [year, setYear] = useState<string>('all')
	const [leaveType, setLeaveType] = useState<string>('all')

	const { data = [], isLoading } = useQuery({
		queryKey: ['leave-records', search, year, leaveType],
		queryFn: () =>
			ListLeaveRecords({
				search: search || undefined,
				year: year !== 'all' ? Number(year) : undefined,
				leaveType: leaveType !== 'all' ? leaveType : undefined
			})
	})

	const years = (() => {
		const y = new Date().getFullYear()
		return Array.from({ length: 6 }, (_, i) => y - i)
	})()

	return (
		<div className='space-y-4'>
			<div>
				<h2 className='text-2xl font-bold tracking-tight'>
					Lưu trữ nghỉ phép
				</h2>
				<p className='text-sm text-muted-foreground'>
					Bản ghi được đẩy vào khi đơn được ký duyệt — phục vụ tra cứu
				</p>
			</div>

			<div className='flex flex-wrap gap-2'>
				<Input
					placeholder='Tìm tên / mã / đơn vị / nơi nghỉ…'
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className='w-64'
				/>
				<Select value={year} onValueChange={setYear}>
					<SelectTrigger className='w-36'>
						<SelectValue placeholder='Năm' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>Mọi năm</SelectItem>
						{years.map((y) => (
							<SelectItem key={y} value={String(y)}>
								{y}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={leaveType} onValueChange={setLeaveType}>
					<SelectTrigger className='w-40'>
						<SelectValue placeholder='Loại phép' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>Mọi loại</SelectItem>
						<SelectItem value='ANNUAL'>Hằng năm</SelectItem>
						<SelectItem value='SPECIAL'>Đặc biệt</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className='rounded-md border'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Mã QN</TableHead>
							<TableHead>Họ tên / Lớp</TableHead>
							<TableHead>Đối tượng</TableHead>
							<TableHead>Đơn vị</TableHead>
							<TableHead>Loại</TableHead>
							<TableHead>Từ ngày</TableHead>
							<TableHead>Đến ngày</TableHead>
							<TableHead>Số ngày</TableHead>
							<TableHead>Nơi nghỉ</TableHead>
							<TableHead>Duyệt lúc</TableHead>
							<TableHead className='w-20' />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading && (
							<TableRow>
								<TableCell colSpan={11} className='text-center'>
									<Loader2 className='mx-auto h-5 w-5 animate-spin' />
								</TableCell>
							</TableRow>
						)}
						{!isLoading && data.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={11}
									className='text-center text-muted-foreground'
								>
									Chưa có bản ghi lưu trữ (chỉ có sau khi ký
									duyệt)
								</TableCell>
							</TableRow>
						)}
						{data.map((r: LeaveRecord) => (
							<TableRow key={r.id}>
								<TableCell className='font-mono text-sm'>
									{r.personnelCode || '—'}
								</TableCell>
								<TableCell>
									{r.requestScope === 'CLASS'
										? `${r.className || r.personnelName || 'Lớp'} (${r.memberCount} học viên)`
										: r.personnelName || '—'}
								</TableCell>
								<TableCell>
									<Badge variant='secondary'>
										{r.objectTypeLabel}
									</Badge>
								</TableCell>
								<TableCell>{r.unitName || '—'}</TableCell>
								<TableCell>
									{r.leaveType === 'SPECIAL'
										? 'Đặc biệt'
										: 'Hằng năm'}
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
										? dayjs(r.endDate).format('DD/MM/YYYY')
										: '—'}
								</TableCell>
								<TableCell className='font-medium'>
									{r.totalDays}
								</TableCell>
								<TableCell className='max-w-[200px] truncate text-sm'>
									{r.localityPath || '—'}
								</TableCell>
								<TableCell className='text-sm text-muted-foreground'>
									{r.decidedAt
										? dayjs(r.decidedAt).format(
												'DD/MM/YYYY HH:mm'
											)
										: '—'}
								</TableCell>
								<TableCell>
									<Button
										size='icon'
										variant='ghost'
										title='Xuất giấy phép'
										onClick={() => {
											if (r.requestScope === 'CLASS') {
												toast.message(
													'Giấy phép lớp được in tại chi tiết lớp trong Danh sách phép'
												)
												return
											}
											const asReq = {
												...r,
												id: r.requestId,
												status: 'APPROVED' as const,
												proposerEmail: null,
												commanderUserId: null,
												commanderName: null
											} as LeaveRequest
											if (!printLeaveCertificate(asReq)) {
												toast.error(
													'Trình duyệt chặn popup in'
												)
											}
										}}
									>
										<Printer className='h-4 w-4' />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
