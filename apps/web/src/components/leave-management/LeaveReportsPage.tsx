import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Loader2, Printer, Upload } from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import {
	ConvertLeaveWordTemplate,
	GetLeaveCheckYearReport,
	GetLeaveNotYetTakenReport,
	GetLeaveTakenReport,
	ListLeaveAuditLogs,
	ListLeaveRequests,
	ListLeavePersonnel,
	ListLeaveUnits,
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
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	downloadTaggedLeaveWordTemplate,
	exportLeaveRegistrationWord
} from './exportLeaveRegistrationWord'

const years = (() => {
	const y = dayjs().year()
	return Array.from({ length: y + 3 - 2022 + 1 }, (_, i) => 2022 + i)
})()

type StoredWordTemplate = {
	id: string
	name: string
	fileName: string
	dataUrl?: string
}
const TEMPLATE_KEY = 'leave-word-templates-v1'
const DEFAULT_TEMPLATE: StoredWordTemplate = {
	id: 'built-in-registration',
	name: 'Mẫu đăng ký phép chuẩn',
	fileName: 'MẪU ĐĂNG KÍ PHÉP.doc'
}

function loadWordTemplates(): StoredWordTemplate[] {
	try {
		const rows = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]')
		return [DEFAULT_TEMPLATE, ...(Array.isArray(rows) ? rows : [])]
	} catch {
		return [DEFAULT_TEMPLATE]
	}
}

export default function LeaveReportsPage() {
	const [activeTab, setActiveTab] = useState('taken-list')
	const [year, setYear] = useState<string>(String(dayjs().year()))
	const [search, setSearch] = useState('')
	const [wordOpen, setWordOpen] = useState(false)
	const [wordScope, setWordScope] = useState<
		'agency' | 'commander' | 'company'
	>('agency')
	const [wordUnitId, setWordUnitId] = useState('')
	const [wordMode, setWordMode] = useState<
		'CLASS' | 'INDIVIDUAL' | 'SHORT_LEAVE'
	>('INDIVIDUAL')
	const [wordLeaveKind, setWordLeaveKind] = useState<'ANNUAL' | 'SPECIAL'>(
		'ANNUAL'
	)
	const [wordRecipient, setWordRecipient] = useState('')
	const [templateOpen, setTemplateOpen] = useState(false)
	const [wordTemplates, setWordTemplates] =
		useState<StoredWordTemplate[]>(loadWordTemplates)
	const [wordTemplateId, setWordTemplateId] = useState(
		'built-in-registration'
	)
	const { data: auditLogs = [] } = useQuery({
		queryKey: ['leave-audit-logs', 'LEAVE_REPORT'],
		queryFn: () => ListLeaveAuditLogs('LEAVE_REPORT')
	})
	const { data: leaveRequests = [] } = useQuery({
		queryKey: ['leave-requests', 'word-report', year],
		queryFn: () => ListLeaveRequests()
	})
	const { data: leaveUnits = [] } = useQuery({
		queryKey: ['leave-units', 'word-report'],
		queryFn: () => ListLeaveUnits({ activeOnly: true })
	})
	const { data: leavePersonnel = [] } = useQuery({
		queryKey: ['leave-personnel', 'word-report'],
		queryFn: () => ListLeavePersonnel()
	})
	const companyUnits = leaveUnits.filter((u) => u.level === 'company')

	async function handleWordExport() {
		const selectedTemplate = wordTemplates.find(
			(t) => t.id === wordTemplateId
		)
		if (!selectedTemplate) return toast.error('Chọn mẫu Word cần xuất')
		let templateSource =
			selectedTemplate.dataUrl || '/templates/leave/mau-dang-ki-phep.docx'
		if (selectedTemplate.dataUrl) {
			const base64 = selectedTemplate.dataUrl.split(',')[1] || ''
			let isDocx = false
			try {
				isDocx = atob(base64.slice(0, 8)).startsWith('PK')
			} catch {
				isDocx = false
			}
			if (!isDocx) {
				try {
					toast.info('Đang tự động chuyển mẫu Word cũ sang .docx…')
					const converted = await ConvertLeaveWordTemplate({
						fileName: selectedTemplate.fileName,
						base64
					})
					templateSource = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${converted.base64}`
					const updatedTemplate = {
						...selectedTemplate,
						fileName: converted.fileName,
						dataUrl: templateSource
					}
					const nextTemplates = wordTemplates.map((template) =>
						template.id === selectedTemplate.id
							? updatedTemplate
							: template
					)
					localStorage.setItem(
						TEMPLATE_KEY,
						JSON.stringify(
							nextTemplates.filter(
								(template) =>
									template.id !== DEFAULT_TEMPLATE.id
							)
						)
					)
					setWordTemplates(nextTemplates)
				} catch (error) {
					return toast.error(
						error instanceof Error
							? error.message
							: 'Không thể tự động chuyển mẫu Word cũ'
					)
				}
			}
		}
		let rows = leaveRequests.filter(
			(r) =>
				(r.startDate || '').startsWith(year) && r.status !== 'CANCELLED'
		)
		if (wordScope === 'commander')
			rows = rows.filter((r) =>
				/chỉ huy|tiểu đoàn trưởng|chính trị viên|đại đội trưởng|chính trị viên đại đội/i.test(
					r.position || ''
				)
			)
		if (wordScope === 'agency')
			rows = rows.filter(
				(r) =>
					!r.classId && !companyUnits.some((u) => u.id === r.unitId)
			)
		if (wordScope === 'company') {
			if (!wordUnitId) return toast.error('Chọn đại đội quản lý')
			rows = rows.filter((r) => r.unitId === Number(wordUnitId))
			rows = rows.filter((r) =>
				wordMode === 'CLASS'
					? r.requestScope === 'CLASS'
					: wordMode === 'SHORT_LEAVE'
						? r.requestScope === 'SHORT_LEAVE'
						: r.requestScope === 'INDIVIDUAL' &&
							r.leaveType === wordLeaveKind
			)
			if (wordMode === 'CLASS') {
				rows = rows.flatMap((r) => {
					if (r.classId == null) return []
					const members = leavePersonnel.filter(
						(p) => p.classId === r.classId
					)
					if (!members.length) return []
					return members.map((p) => ({
						...r,
						personnelId: p.id,
						personnelCode: p.code,
						personnelName: p.fullName,
						enlistmentDate: p.enlistmentDate || null,
						rank: p.rank || null,
						position: p.position || null,
						unitId: p.unitId,
						unitName: p.unitName || r.unitName,
						localityPath:
							p.permanentResidence || p.hometown || r.localityPath
					}))
				})
			}
		}
		if (wordScope !== 'company')
			rows = rows.filter(
				(r) =>
					r.requestScope !== 'SHORT_LEAVE' &&
					r.leaveType === wordLeaveKind
			)
		if (!rows.length)
			return toast.error('Không có danh sách phù hợp lựa chọn')
		const managingLabel =
			wordScope === 'agency'
				? 'Cơ quan quản lý'
				: wordScope === 'commander'
					? 'Chỉ huy quản lý'
					: companyUnits.find((u) => String(u.id) === wordUnitId)
							?.name || 'Đại đội quản lý'
		const kindLabel =
			wordScope === 'company' && wordMode === 'SHORT_LEAVE'
				? 'Tranh thủ'
				: wordScope === 'company' && wordMode === 'CLASS'
					? 'Phép lớp'
					: wordLeaveKind === 'SPECIAL'
						? 'Phép đặc biệt'
						: 'Phép cá nhân'
		try {
			await exportLeaveRegistrationWord(rows, Number(year), {
				managingLabel,
				recipient: wordRecipient.trim(),
				titleSuffix: kindLabel,
				templateSource
			})
			setWordOpen(false)
			toast.success('Đã xuất danh sách Word')
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Không thể xuất theo mẫu Word đã chọn'
			)
		}
	}

	async function uploadWordTemplate(file?: File) {
		if (!file) return
		if (!/\.docx?$/i.test(file.name))
			return toast.error('Mẫu tải lên phải là file Word .doc hoặc .docx')
		if (file.size > 10 * 1024 * 1024)
			return toast.error('File mẫu Word không được vượt quá 10 MB')
		const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer())
		const readDataUrl = (blob: Blob) =>
			new Promise<string>((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = () => resolve(String(reader.result || ''))
				reader.onerror = () =>
					reject(new Error('Không đọc được file Word'))
				reader.readAsDataURL(blob)
			})
		try {
			let fileName = file.name
			let dataUrl = await readDataUrl(file)
			if (signature[0] !== 0x50 || signature[1] !== 0x4b) {
				toast.info('Đang tự động chuyển mẫu Word cũ sang .docx…')
				const converted = await ConvertLeaveWordTemplate({
					fileName: file.name,
					base64: dataUrl.split(',')[1] || ''
				})
				fileName = converted.fileName
				dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${converted.base64}`
			}
			const item: StoredWordTemplate = {
				id: `${Date.now()}`,
				name: fileName.replace(/\.docx?$/i, ''),
				fileName,
				dataUrl
			}
			const custom = [
				...wordTemplates.filter((t) => t.id !== DEFAULT_TEMPLATE.id),
				item
			]
			localStorage.setItem(TEMPLATE_KEY, JSON.stringify(custom))
			setWordTemplates([DEFAULT_TEMPLATE, ...custom])
			setWordTemplateId(item.id)
			toast.success('Đã lưu mẫu Word và sẵn sàng xuất báo cáo')
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Không thể xử lý mẫu Word'
			)
		}
	}

	async function downloadWordTemplate(template: StoredWordTemplate) {
		if (template.id === DEFAULT_TEMPLATE.id) {
			try {
				await downloadTaggedLeaveWordTemplate()
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: 'Không tải được mẫu Word chuẩn'
				)
			}
			return
		}
		const a = document.createElement('a')
		a.href = template.dataUrl || ''
		a.download = template.fileName
		document.body.appendChild(a)
		a.click()
		a.remove()
	}

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
			<Button
				className='w-fit'
				variant='outline'
				onClick={() => setTemplateOpen(true)}
			>
				<Upload className='mr-1 h-4 w-4' />
				Mẫu Word nghỉ phép
			</Button>

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
						<div className='flex gap-2'>
							<Button
								variant='outline'
								size='sm'
								onClick={() => setWordOpen(true)}
							>
								<FileText className='mr-1 h-4 w-4' />
								Xuất Word
							</Button>
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
			<Dialog open={wordOpen} onOpenChange={setWordOpen}>
				<DialogContent className='sm:max-w-lg'>
					<DialogHeader>
						<DialogTitle>Chọn danh sách xuất Word</DialogTitle>
					</DialogHeader>
					<div className='space-y-4'>
						<div>
							<Label>Mẫu Word *</Label>
							<Select
								value={wordTemplateId}
								onValueChange={setWordTemplateId}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn mẫu…' />
								</SelectTrigger>
								<SelectContent>
									{wordTemplates.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											{t.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Phạm vi quản lý *</Label>
							<Select
								value={wordScope}
								onValueChange={(v) => {
									setWordScope(v as typeof wordScope)
									setWordUnitId('')
									setWordMode('INDIVIDUAL')
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='agency'>
										Cơ quan quản lý
									</SelectItem>
									<SelectItem value='commander'>
										Chỉ huy quản lý
									</SelectItem>
									<SelectItem value='company'>
										Đại đội quản lý
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{wordScope === 'company' && (
							<>
								<div>
									<Label>Đại đội *</Label>
									<Select
										value={wordUnitId}
										onValueChange={setWordUnitId}
									>
										<SelectTrigger>
											<SelectValue placeholder='Chọn đại đội…' />
										</SelectTrigger>
										<SelectContent>
											{companyUnits.map((u) => (
												<SelectItem
													key={u.id}
													value={String(u.id)}
												>
													{u.code
														? `${u.code} — `
														: ''}
													{u.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Danh sách cần xuất *</Label>
									<Select
										value={wordMode}
										onValueChange={(v) =>
											setWordMode(v as typeof wordMode)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='CLASS'>
												Phép lớp
											</SelectItem>
											<SelectItem value='INDIVIDUAL'>
												Phép cá nhân
											</SelectItem>
											<SelectItem value='SHORT_LEAVE'>
												Phép tranh thủ
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</>
						)}
						{(wordScope !== 'company' ||
							wordMode === 'INDIVIDUAL') && (
							<div>
								<Label>Loại phép cần xuất *</Label>
								<Select
									value={wordLeaveKind}
									onValueChange={(v) =>
										setWordLeaveKind(
											v as typeof wordLeaveKind
										)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='ANNUAL'>
											Phép hằng năm
										</SelectItem>
										<SelectItem value='SPECIAL'>
											Phép đặc biệt
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
						<div>
							<Label>Nơi nhận</Label>
							<Input
								value={wordRecipient}
								onChange={(e) =>
									setWordRecipient(e.target.value)
								}
								placeholder='VD: Phòng Chính trị; Ban Tham mưu'
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setWordOpen(false)}
						>
							Hủy
						</Button>
						<Button onClick={() => void handleWordExport()}>
							<FileText className='mr-1 h-4 w-4' />
							Xuất Word
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
				<DialogContent className='sm:max-w-2xl'>
					<DialogHeader>
						<DialogTitle>Kho mẫu Word nghỉ phép</DialogTitle>
					</DialogHeader>
					<div className='space-y-3'>
						<div className='rounded-md border bg-muted/30 p-3 text-sm'>
							<div className='mb-2 font-medium'>
								Quy ước bảng dữ liệu trong mẫu Word
							</div>
							<p className='text-muted-foreground'>
								Hệ thống nhận diện bằng thẻ trong dòng dữ liệu
								mẫu:
							</p>
							<div className='mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3'>
								<span>{'{{DON_VI}}'} — Đơn vị</span>
								<span>{'{{NOI_NHAN}}'} — Nơi nhận</span>
								<span>{'{{STT}}'} — TT</span>
								<span>{'{{HO_TEN}}'} — Họ tên</span>
								<span>{'{{NHAP_NGU}}'} — Nhập ngũ</span>
								<span>{'{{CAP_BAC}}'} — Cấp bậc</span>
								<span>
									{'{{CHUC_VU_DON_VI}}'} — Chức vụ/Đơn vị
								</span>
								<span>{'{{NOI_NGHI}}'} — Nơi nghỉ</span>
								<span>{'{{THOI_GIAN_NGHI}}'} — Thời gian</span>
								<span>{'{{NGUOI_THAY_THE}}'} — Thay thế</span>
								<span>{'{{GHI_CHU}}'} — Ghi chú</span>
							</div>
							<p className='mt-2 text-xs text-muted-foreground'>
								Có thể đổi tên, kiểu chữ và di chuyển cột. Hãy
								di chuyển cả thẻ tương ứng theo cột và không xóa
								dòng chứa các thẻ. Hai thẻ Đơn vị và Nơi nhận có
								thể đặt ở bất kỳ phần nào trên văn bản.
							</p>
						</div>
						<Button
							type='button'
							variant='outline'
							className='w-full'
							onClick={() =>
								void downloadWordTemplate(DEFAULT_TEMPLATE)
							}
						>
							<Download className='mr-2 h-4 w-4' />
							Tải mẫu Word chuẩn để chỉnh sửa
						</Button>
						<p className='text-sm text-muted-foreground'>
							Sau khi chỉnh và lưu dạng .docx, tải mẫu lên tại đây
							để dùng khi xuất báo cáo.
						</p>
						<Input
							type='file'
							accept='.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
							onChange={(e) => {
								void uploadWordTemplate(e.target.files?.[0])
								e.currentTarget.value = ''
							}}
						/>
						<div className='space-y-2'>
							{wordTemplates.map((t) => (
								<div
									key={t.id}
									className='flex items-center justify-between rounded-md border p-3'
								>
									<div>
										<div className='font-medium'>
											{t.name}
										</div>
										<div className='text-xs text-muted-foreground'>
											{t.fileName}
										</div>
									</div>
									<div className='flex gap-2'>
										<Button
											size='sm'
											variant='ghost'
											onClick={() =>
												void downloadWordTemplate(t)
											}
											title='Tải mẫu xuống'
										>
											<Download className='h-4 w-4' />
										</Button>
										<Button
											size='sm'
											variant={
												wordTemplateId === t.id
													? 'default'
													: 'outline'
											}
											onClick={() =>
												setWordTemplateId(t.id)
											}
										>
											{wordTemplateId === t.id
												? 'Đang chọn'
												: 'Chọn'}
										</Button>
										{t.id !== DEFAULT_TEMPLATE.id && (
											<Button
												size='sm'
												variant='destructive'
												onClick={() => {
													const next =
														wordTemplates.filter(
															(x) => x.id !== t.id
														)
													setWordTemplates(next)
													localStorage.setItem(
														TEMPLATE_KEY,
														JSON.stringify(
															next.filter(
																(x) =>
																	x.id !==
																	DEFAULT_TEMPLATE.id
															)
														)
													)
													if (wordTemplateId === t.id)
														setWordTemplateId(
															DEFAULT_TEMPLATE.id
														)
												}}
											>
												Xóa
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
					<DialogFooter>
						<Button onClick={() => setTemplateOpen(false)}>
							Đóng
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
