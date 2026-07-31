import { useRef, useState } from 'react'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
	ImportLeavePersonnel,
	type LeaveObjectType,
	type LeavePersonnel
} from '@/api/leave'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'

const HEADERS = [
	'fullName',
	'enlistmentDate',
	'recruitment',
	'objectType',
	'rank',
	'position',
	'unitName',
	'hometown',
	'permanentResidence'
] as const

const VN_HEADERS = [
	'Họ và tên *',
	'Ngày nhập ngũ (YYYY-MM-DD)',
	'Tuyển dụng',
	'Đối tượng * (QN|CN|VCQP|HSQ|BS)',
	'Cấp bậc',
	'Chức vụ',
	'Đơn vị',
	'Quê quán (Xã, Tỉnh)',
	'Thường trú (Xã, Tỉnh)'
]

type PersonnelImportRow = Partial<
	Omit<LeavePersonnel, 'id' | 'createdAt' | 'updatedAt'>
> & {
	fullName: string
	objectType: LeaveObjectType
}

function cellStr(v: unknown): string {
	if (v == null) return ''
	if (v instanceof Date) {
		const y = v.getFullYear()
		const m = String(v.getMonth() + 1).padStart(2, '0')
		const d = String(v.getDate()).padStart(2, '0')
		return `${y}-${m}-${d}`
	}
	return String(v).trim()
}

function excelSerialToDate(n: number): string {
	const utc = Math.round((n - 25569) * 86400 * 1000)
	const d = new Date(utc)
	if (Number.isNaN(d.getTime())) return ''
	const y = d.getUTCFullYear()
	const m = String(d.getUTCMonth() + 1).padStart(2, '0')
	const day = String(d.getUTCDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

function normalizeDate(v: unknown): string | null {
	if (v == null || v === '') return null
	if (typeof v === 'number') return excelSerialToDate(v) || null
	const s = cellStr(v)
	if (!s) return null
	const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
	if (m) {
		return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
	}
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
	return s
}

function parseSheet(file: ArrayBuffer): PersonnelImportRow[] {
	const wb = XLSX.read(file, { type: 'array', cellDates: true })
	const sheet = wb.Sheets[wb.SheetNames[0]!]
	if (!sheet) return []
	const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
		defval: '',
		raw: true
	})

	const mapKey = (k: string) => {
		const lower = k.trim().toLowerCase()
		const aliases: Record<string, string> = {
			code: 'code',
			mã: 'code',
			fullname: 'fullName',
			'họ và tên': 'fullName',
			'họ và tên *': 'fullName',
			hoten: 'fullName',
			enlistmentdate: 'enlistmentDate',
			'ngày nhập ngũ (yyyy-mm-dd)': 'enlistmentDate',
			recruitment: 'recruitment',
			'tuyển dụng': 'recruitment',
			objecttype: 'objectType',
			'đối tượng * (qn|cn|vcqp|hsq|bs)': 'objectType',
			rank: 'rank',
			'cấp bậc': 'rank',
			position: 'position',
			'chức vụ': 'position',
			unitname: 'unitName',
			'đơn vị': 'unitName',
			hometown: 'hometown',
			'quê quán': 'hometown',
			'quê quán (xã, tỉnh)': 'hometown',
			permanentresidence: 'permanentResidence',
			'thường trú': 'permanentResidence',
			'thường trú (xã, tỉnh)': 'permanentResidence'
		}
		return aliases[lower] || (HEADERS.includes(k as never) ? k : null)
	}

	const out: PersonnelImportRow[] = []
	for (const raw of rows) {
		const mapped: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(raw)) {
			const key = mapKey(k)
			if (key) mapped[key] = v
		}
		if (cellStr(mapped.fullName).toLowerCase() === 'fullname') continue
		const fullName = cellStr(mapped.fullName)
		if (!fullName) continue

		const objectType = (
			cellStr(mapped.objectType) || 'QN'
		).toUpperCase() as LeaveObjectType

		out.push({
			code: cellStr(mapped.code) || null,
			fullName,
			enlistmentDate: normalizeDate(mapped.enlistmentDate),
			recruitment: cellStr(mapped.recruitment) || null,
			objectType,
			rank: cellStr(mapped.rank) || null,
			position: cellStr(mapped.position) || null,
			unitId: null,
			unitName: cellStr(mapped.unitName) || null,
			hometown: cellStr(mapped.hometown) || null,
			permanentResidence: cellStr(mapped.permanentResidence) || null,
			userId: null
		})
	}
	return out
}

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export default function ImportPersonnelDialog({ open, onOpenChange }: Props) {
	const qc = useQueryClient()
	const inputRef = useRef<HTMLInputElement>(null)
	const [rows, setRows] = useState<PersonnelImportRow[]>([])
	const [fileName, setFileName] = useState('')
	const [parseError, setParseError] = useState('')

	const mut = useMutation({
		mutationFn: () => ImportLeavePersonnel(rows),
		onSuccess: (res) => {
			qc.invalidateQueries({ queryKey: ['leave-personnel'] })
			if (res.errorCount === 0) {
				toast.success(`Import thành công ${res.successCount} quân nhân`)
				onOpenChange(false)
				reset()
			} else {
				toast.warning(
					`Thành công ${res.successCount}/${res.totalCount}. Lỗi: ${res.errorCount}`
				)
				if (res.errors[0]) {
					toast.error(
						`Dòng ${res.errors[0].row}: ${res.errors[0].message}`
					)
				}
			}
		},
		onError: (e: Error) => toast.error(e.message)
	})

	function reset() {
		setRows([])
		setFileName('')
		setParseError('')
		if (inputRef.current) inputRef.current.value = ''
	}

	async function downloadTemplate() {
		const wb = new ExcelJS.Workbook()
		const sheet = wb.addWorksheet('Quan nhan')
		const vn = sheet.addRow(VN_HEADERS)
		const api = sheet.addRow([...HEADERS])
		sheet.addRow([
			'Nguyễn Văn A',
			'2015-03-01',
			'Đợt 1/2015',
			'QN',
			'Thượng úy',
			'Trợ lý',
			'Đại đội 1',
			'Phường Ba Đình, Thành phố Hà Nội',
			'Phường Ba Đình, Thành phố Hà Nội'
		])
		vn.eachCell((c) => {
			c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
			c.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: '4472C4' }
			}
		})
		api.eachCell((c) => {
			c.font = { bold: true }
			c.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'D9E1F2' }
			}
		})
		HEADERS.forEach((_, i) => {
			sheet.getColumn(i + 1).width = 18
		})
		const buf = await wb.xlsx.writeBuffer()
		const blob = new Blob([buf], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'mau-import-quan-nhan.xlsx'
		a.click()
		URL.revokeObjectURL(url)
	}

	async function onFile(file: File) {
		setParseError('')
		setFileName(file.name)
		try {
			const buf = await file.arrayBuffer()
			const parsed = parseSheet(buf)
			if (!parsed.length) {
				setParseError('Không đọc được dòng dữ liệu hợp lệ')
				setRows([])
				return
			}
			setRows(parsed)
		} catch (e) {
			setParseError(String((e as Error).message || e))
			setRows([])
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				onOpenChange(v)
				if (!v) reset()
			}}
		>
			<DialogContent className='max-w-lg'>
				<DialogHeader>
					<DialogTitle>Import danh sách quân nhân</DialogTitle>
				</DialogHeader>
				<div className='space-y-3 py-2 text-sm'>
					<p className='text-muted-foreground'>
						Tải mẫu Excel, điền dữ liệu rồi tải lên. Mã sẽ được hệ
						thống tự sinh. Quê quán / thường trú nên dạng{' '}
						<em>Xã/Phường, Tỉnh/TP</em>.
					</p>
					<Button
						type='button'
						variant='outline'
						className='w-full'
						onClick={() => downloadTemplate()}
					>
						<Download className='mr-2 h-4 w-4' />
						Tải file mẫu
					</Button>
					<div
						className='flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 hover:bg-muted/40'
						onClick={() => inputRef.current?.click()}
						onKeyDown={() => {}}
					>
						{fileName ? (
							<>
								<FileSpreadsheet className='h-8 w-8 text-primary' />
								<span className='font-medium'>{fileName}</span>
								<span className='text-muted-foreground'>
									{rows.length} dòng sẵn sàng
								</span>
							</>
						) : (
							<>
								<Upload className='h-8 w-8 text-muted-foreground' />
								<span>Chọn file .xlsx / .xls / .csv</span>
							</>
						)}
						<input
							ref={inputRef}
							type='file'
							accept='.xlsx,.xls,.csv'
							className='hidden'
							onChange={(e) => {
								const f = e.target.files?.[0]
								if (f) void onFile(f)
							}}
						/>
					</div>
					{parseError && (
						<p className='text-sm text-destructive'>{parseError}</p>
					)}
				</div>
				<DialogFooter>
					<Button
						variant='outline'
						onClick={() => onOpenChange(false)}
					>
						Hủy
					</Button>
					<Button
						disabled={!rows.length || mut.isPending}
						onClick={() => mut.mutate()}
					>
						{mut.isPending && (
							<Loader2 className='mr-1 h-4 w-4 animate-spin' />
						)}
						Import {rows.length ? `(${rows.length})` : ''}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
