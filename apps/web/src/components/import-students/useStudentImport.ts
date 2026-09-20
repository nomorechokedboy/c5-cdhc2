import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import useCreateStudents from '@/hooks/useCreateStudents'
import useUnitOptions from '@/hooks/useUnitOptions'
import { ImportFormatError, parseStudentSheet, type ImportRow } from './parse'
import { downloadStudentTemplate } from './template'
import { resolveUnit, type UnitResolution } from './units'
import {
	hasErrors,
	toStudentBody,
	validateRow,
	type RowIssue
} from './validate'

export type ImportStatus =
	| 'idle'
	| 'reading'
	| 'ready'
	| 'importing'
	| 'done'
	| 'error'

export interface EvaluatedRow {
	row: ImportRow
	unit: UnitResolution
	issues: RowIssue[]
	valid: boolean
}

export interface ImportResult {
	/** Số học viên server đã tạo */
	created: number
	/** Các dòng bị bỏ qua vì lỗi dữ liệu */
	skipped: { row: number; message: string }[]
	total: number
}

const ACCEPTED = /\.(csv|xlsx|xls)$/i

const readFile = (file: File) =>
	new Promise<ArrayBuffer>((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as ArrayBuffer)
		reader.onerror = () => reject(reader.error)
		reader.readAsArrayBuffer(file)
	})

/** Trạng thái và thao tác của dialog import học viên (đọc file → xem trước → import) */
export function useStudentImport(
	onSuccess?: (result: {
		successCount: number
		errorCount: number
		totalCount: number
		errors: { row: number; message: string }[]
	}) => void
) {
	const { options: unitOptions, isLoading: unitsLoading } =
		useUnitOptions('class')
	const createStudents = useCreateStudents()

	const [file, setFile] = useState<File | null>(null)
	const [rows, setRows] = useState<ImportRow[]>([])
	const [status, setStatus] = useState<ImportStatus>('idle')
	const [message, setMessage] = useState('')
	const [result, setResult] = useState<ImportResult | null>(null)
	// Lớp người dùng chọn tay ở bảng xem trước (theo số dòng) và lớp mặc định cho dòng để trống
	const [unitOverrides, setUnitOverrides] = useState<Record<number, number>>(
		{}
	)
	const [defaultUnitId, setDefaultUnitId] = useState<number | undefined>()

	const evaluated = useMemo<EvaluatedRow[]>(
		() =>
			rows.map((row) => {
				const parsed = resolveUnit(row.unitText, unitOptions)
				const override = unitOverrides[row.rowNumber]
				const unit: UnitResolution =
					override !== undefined
						? { unitId: override }
						: parsed.problem === 'empty' &&
							  defaultUnitId !== undefined
							? { unitId: defaultUnitId }
							: parsed
				const issues = validateRow(row, unit)
				return { row, unit, issues, valid: !hasErrors(issues) }
			}),
		[rows, unitOptions, unitOverrides, defaultUnitId]
	)

	const validCount = evaluated.filter((r) => r.valid).length

	const reset = () => {
		setFile(null)
		setRows([])
		setStatus('idle')
		setMessage('')
		setResult(null)
		setUnitOverrides({})
		setDefaultUnitId(undefined)
	}

	const fail = (text: string) => {
		setStatus('error')
		setMessage(text)
	}

	const selectFile = async (next: File) => {
		reset()
		if (!ACCEPTED.test(next.name)) {
			return fail('Vui lòng chọn file CSV hoặc Excel (.xlsx, .xls)')
		}
		setStatus('reading')
		try {
			const parsed = parseStudentSheet(await readFile(next))
			if (parsed.length === 0) {
				return fail(
					'File không có dòng dữ liệu nào (dữ liệu bắt đầu từ dòng 3).'
				)
			}
			setFile(next)
			setRows(parsed)
			setStatus('ready')
		} catch (err) {
			if (err instanceof ImportFormatError) return fail(err.message)
			console.error('Error parsing file:', err)
			fail('Lỗi đọc file. Vui lòng kiểm tra định dạng file.')
		}
	}

	const importValid = async () => {
		const valid = evaluated.filter((r) => r.valid)
		if (valid.length === 0) return

		const skipped = evaluated
			.filter((r) => !r.valid)
			.map((r) => ({
				row: r.row.rowNumber,
				message: r.issues
					.filter((i) => i.level === 'error')
					.map((i) => i.message)
					.join('; ')
			}))

		setStatus('importing')
		setMessage('')
		try {
			// API tạo theo lô: thành công cả lô hoặc lỗi cả lô
			const created = await createStudents.mutateAsync(
				valid.map((r) => toStudentBody(r.row, r.unit.unitId!))
			)
			const next: ImportResult = {
				created: created.length,
				skipped,
				total: evaluated.length
			}
			setResult(next)
			setStatus('done')
			onSuccess?.({
				successCount: next.created,
				errorCount: skipped.length,
				totalCount: next.total,
				errors: skipped
			})
		} catch (err: any) {
			console.error('Import error:', err)
			setStatus('error')
			setMessage(
				`Lỗi import: ${err?.message || err}. Chưa có học viên nào được thêm.`
			)
		}
	}

	return {
		file,
		status,
		message,
		result,
		rows: evaluated,
		validCount,
		invalidCount: evaluated.length - validCount,
		unitsLoading,
		defaultUnitId,
		setDefaultUnitId,
		setRowUnit: (rowNumber: number, id: number | undefined) =>
			setUnitOverrides((prev) => {
				const next = { ...prev }
				if (id === undefined) delete next[rowNumber]
				else next[rowNumber] = id
				return next
			}),
		selectFile,
		importValid,
		reset,
		downloadTemplate: async () => {
			try {
				await downloadStudentTemplate(unitOptions)
			} catch (err) {
				console.error('Error creating template:', err)
				toast.error('Không tạo được file mẫu')
			}
		}
	}
}
