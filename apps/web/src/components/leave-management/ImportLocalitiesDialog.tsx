import { useRef, useState } from 'react'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { ImportLeaveLocalities } from '@/api/leave'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'

const HEADERS = [
	'province',
	'ward',
	'village',
	'provinceCode',
	'wardCode',
	'villageCode'
] as const

const VN_HEADERS = [
	'Tỉnh *',
	'Xã / Phường',
	'Thôn',
	'Mã tỉnh',
	'Mã xã',
	'Mã thôn'
]

interface LocalityImportRow {
	province: string
	ward?: string | null
	village?: string | null
	provinceCode?: string | null
	wardCode?: string | null
	villageCode?: string | null
}

function cellStr(v: unknown): string {
	if (v == null) return ''
	return String(v).replace(/\s+/g, ' ').trim()
}

function parseSheet(file: ArrayBuffer): LocalityImportRow[] {
	const wb = XLSX.read(file, { type: 'array' })
	const sheet = wb.Sheets[wb.SheetNames[0]!]
	if (!sheet) return []
	const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
		defval: ''
	})

	const mapKey = (k: string) => {
		const lower = k.trim().toLowerCase()
		const aliases: Record<string, (typeof HEADERS)[number]> = {
			province: 'province',
			tỉnh: 'province',
			'tỉnh *': 'province',
			'tỉnh / thành phố': 'province',
			'tỉnh/thành phố': 'province',
			'tỉnh / thành phố ': 'province',
			tinh: 'province',
			ward: 'ward',
			'xã / phường': 'ward',
			'xã/phường': 'ward',
			tên: 'ward',
			xa: 'ward',
			village: 'village',
			thôn: 'village',
			thon: 'village',
			provincecode: 'provinceCode',
			'mã tỉnh': 'provinceCode',
			'mã tp': 'provinceCode',
			wardcode: 'wardCode',
			'mã xã': 'wardCode',
			mã: 'wardCode',
			villagecode: 'villageCode',
			'mã thôn': 'villageCode'
		}
		return aliases[lower] || (HEADERS.includes(k as never) ? k : null)
	}

	const out: LocalityImportRow[] = []
	for (const raw of rows) {
		const mapped: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(raw)) {
			const key = mapKey(k)
			if (key) mapped[key] = v
		}
		if (
			cellStr(mapped.province).toLowerCase() === 'province' ||
			cellStr(mapped.province).toLowerCase() === 'tỉnh *'
		) {
			continue
		}
		const province = cellStr(mapped.province)
		if (!province) continue
		out.push({
			province,
			ward: cellStr(mapped.ward) || null,
			village: cellStr(mapped.village) || null,
			provinceCode: cellStr(mapped.provinceCode) || null,
			wardCode: cellStr(mapped.wardCode) || null,
			villageCode: cellStr(mapped.villageCode) || null
		})
	}
	return out
}

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export default function ImportLocalitiesDialog({ open, onOpenChange }: Props) {
	const qc = useQueryClient()
	const inputRef = useRef<HTMLInputElement>(null)
	const [rows, setRows] = useState<LocalityImportRow[]>([])
	const [fileName, setFileName] = useState('')
	const [parseError, setParseError] = useState('')

	const mut = useMutation({
		mutationFn: () => ImportLeaveLocalities(rows),
		onSuccess: (res) => {
			qc.invalidateQueries({ queryKey: ['leave-localities-tree'] })
			if (res.errorCount === 0) {
				toast.success(
					`Import xong ${res.successCount} dòng (tạo mới: ${res.createdCount ?? 0}, đã có: ${res.skippedCount ?? 0})`
				)
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
		const sheet = wb.addWorksheet('Dia phuong')
		const vn = sheet.addRow(VN_HEADERS)
		const api = sheet.addRow([...HEADERS])
		sheet.addRow(['Hà Nội', 'Ba Đình', 'Phúc Xá', '', '', ''])
		sheet.addRow(['Hà Nội', 'Ba Đình', 'Vĩnh Phúc', '', '', ''])
		sheet.addRow(['Hà Nội', 'Hoàn Kiếm', '', '', '', ''])
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
			sheet.getColumn(i + 1).width = 16
		})
		const buf = await wb.xlsx.writeBuffer()
		const blob = new Blob([buf], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'mau-import-dia-phuong.xlsx'
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
					<DialogTitle>Import danh sách địa phương</DialogTitle>
				</DialogHeader>
				<div className='space-y-3 py-2 text-sm'>
					<p className='text-muted-foreground'>
						Mỗi dòng: <strong>Tỉnh</strong> + (tuỳ chọn){' '}
						<strong>Xã/Phường</strong> + (tuỳ chọn){' '}
						<strong>Thôn</strong>. Hệ thống tự tạo cấp cha nếu chưa
						có.
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
