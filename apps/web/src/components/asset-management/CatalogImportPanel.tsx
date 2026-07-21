/**
 * Import VT vào danh mục ngành — chỉ cần ngành + file.
 * Không cần tòa / tầng / phòng / ĐV SD / địa chỉ / lý do form.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
	CheckCircle2,
	Download,
	FileSpreadsheet,
	FileUp,
	Loader2,
	Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { CreateCatalogStockMovement, GetAssetCatalog } from '@/api/asset'
import {
	buildImportTemplateWorkbook,
	parseAssetImportFile
} from '@/lib/parse-asset-import'
import {
	codeSourceLabel,
	resolveImportAssetCodes,
	type ResolvedImportRow
} from '@/lib/resolve-import-codes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'

export default function CatalogImportPanel() {
	const qc = useQueryClient()
	const [importNganhCode, setImportNganhCode] = useState('')
	const [catalogNganhOptions, setCatalogNganhOptions] = useState<
		{ value: string; label: string; keywords: string }[]
	>([])
	const [rows, setRows] = useState<ResolvedImportRow[]>([])
	const [fileName, setFileName] = useState('')
	const [parsing, setParsing] = useState(false)
	const [importing, setImporting] = useState(false)
	const [progress, setProgress] = useState({ done: 0, total: 0 })
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		void GetAssetCatalog()
			.then((c) => {
				setCatalogNganhOptions(
					(c.nganh || []).map((n) => ({
						value: n.code,
						label: `${n.code} — ${n.name}`,
						keywords: `${n.code} ${n.name}`
					}))
				)
			})
			.catch(() => {})
	}, [])

	const validRows = useMemo(
		() =>
			rows.filter(
				(r) =>
					!r.error &&
					r.name.trim() &&
					(Number(r.quantity) || 0) >= 1 &&
					r.codeSource !== 'unresolved' &&
					!!r.code?.trim()
			),
		[rows]
	)
	const errorRows = useMemo(
		() => rows.filter((r) => r.error || r.codeSource === 'unresolved'),
		[rows]
	)

	async function onFile(file: File | null) {
		if (!file) return
		if (!importNganhCode) {
			toast.error('Chọn ngành danh mục trước khi đọc file')
			if (inputRef.current) inputRef.current.value = ''
			return
		}
		setParsing(true)
		setFileName(file.name)
		try {
			const parsed = await parseAssetImportFile(file)
			if (!parsed.length) {
				toast.error('Không đọc được dòng dữ liệu nào trong file')
				setRows([])
				return
			}
			let catalog: Awaited<ReturnType<typeof GetAssetCatalog>>
			try {
				catalog = await GetAssetCatalog({
					nganhCode: importNganhCode
				})
			} catch {
				catalog = { nganh: [], chuyenNganh: [], materials: [] }
				toast.warning(
					'Không tải được danh mục — chỉ dùng mã trong file'
				)
			}
			const resolved = resolveImportAssetCodes(parsed, {
				materials: catalog.materials,
				chuyenNganh: catalog.chuyenNganh,
				nganh: catalog.nganh,
				defaultNganhCode: importNganhCode
			})
			setRows(resolved)
			const ok = resolved.filter(
				(r) =>
					!r.error &&
					r.name.trim() &&
					(Number(r.quantity) || 0) >= 1 &&
					r.codeSource !== 'unresolved' &&
					!!r.code?.trim()
			).length
			const gen = resolved.filter(
				(r) => r.codeSource === 'generated'
			).length
			toast.success(
				`Đã đọc ${resolved.length} dòng · ${ok} hợp lệ` +
					(gen ? ` · ${gen} sinh mã mới` : '')
			)
		} catch (err) {
			toast.error('Không đọc được file', {
				description: (err as Error).message
			})
			setRows([])
		} finally {
			setParsing(false)
			if (inputRef.current) inputRef.current.value = ''
		}
	}

	function downloadTemplate() {
		const blob = buildImportTemplateWorkbook()
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'mau-import-vat-tu.xlsx'
		a.click()
		URL.revokeObjectURL(url)
	}

	async function handleImport() {
		if (!importNganhCode) {
			toast.error('Chọn ngành danh mục')
			return
		}
		if (!validRows.length) {
			toast.error('Không có dòng hợp lệ để import')
			return
		}
		setImporting(true)
		setProgress({ done: 0, total: validRows.length })
		let ok = 0
		let fail = 0
		const errors: string[] = []

		for (let i = 0; i < validRows.length; i++) {
			const row = validRows[i]!
			const qty = Math.max(1, Number(row.quantity) || 1)
			const isDec =
				row.movementType === 'DECREASE' ||
				/thanh\s*ly|giam|tra\s*tren/i.test(
					String(row.reasonRaw || row.reasonLabel || '')
				)
			const cn =
				row.chuyenNganhCode ||
				(row.code && row.code.length >= 6
					? row.code.slice(0, 6)
					: undefined)
			const ng =
				row.nganhCode ||
				importNganhCode ||
				(cn ? cn.slice(0, 4) : importNganhCode)
			try {
				await CreateCatalogStockMovement({
					movementType: isDec ? 'DECREASE' : 'INCREASE',
					nganhCode: ng,
					chuyenNganhCode: cn,
					chuyenNganhName:
						row.category && !/^khác$/i.test(row.category)
							? row.category
							: undefined,
					materialCode: row.code?.split('-')[0] || row.code,
					materialName: row.name.trim(),
					quantity: qty,
					unit: row.unit || 'Bộ',
					reason:
						row.reasonLabel ||
						row.reasonRaw ||
						(isDec ? 'Import giảm' : 'Import danh mục'),
					note: `Import file ${fileName || ''}`.trim()
				})
				ok++
			} catch (err) {
				fail++
				errors.push(
					`Dòng ${row.rowIndex} (${row.name}): ${(err as Error).message}`
				)
			}
			setProgress({ done: i + 1, total: validRows.length })
		}

		await qc.invalidateQueries({ queryKey: ['asset-catalog'] })
		await qc.invalidateQueries({ queryKey: ['catalog-stock-logs'] })
		setImporting(false)

		if (ok && !fail) {
			toast.success(
				`Import ${ok} VT vào danh mục ngành ${importNganhCode}`
			)
			setRows([])
			setFileName('')
		} else if (ok && fail) {
			toast.warning(`Import: ${ok} OK, ${fail} lỗi`, {
				description: errors.slice(0, 3).join(' · ')
			})
		} else {
			toast.error('Import thất bại', { description: errors[0] })
		}
	}

	const sel = 'h-12 text-base w-full'

	return (
		<div className='flex flex-col gap-5 pb-10'>
			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='text-base'>
						Import vật tư vào danh mục ngành
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='space-y-2 max-w-xl'>
						<Label className='font-semibold'>
							Ngành danh mục{' '}
							<span className='text-destructive'>*</span>
						</Label>
						<SearchableSelect
							value={importNganhCode}
							onValueChange={(v) => {
								setImportNganhCode(v)
								setRows([])
								setFileName('')
							}}
							className={sel}
							placeholder='Chọn ngành (HC2A…)…'
							searchPlaceholder='Gõ mã/tên ngành…'
							emptyText='Không có ngành'
							options={catalogNganhOptions}
						/>
						<p className='text-xs text-muted-foreground'>
							Chỉ cần <strong>ngành</strong> + file có cột{' '}
							<strong>loại vật</strong> và <strong>tên VT</strong>
							. Không cần tòa / tầng / phòng / ĐV SD / địa chỉ /
							lý do. VT mới tự sinh mã và vào danh mục ngành.
						</p>
					</div>

					<div className='flex flex-wrap gap-2 items-center'>
						<input
							ref={inputRef}
							type='file'
							accept='.xlsx,.xls,.csv,.docx'
							className='hidden'
							onChange={(e) =>
								void onFile(e.target.files?.[0] ?? null)
							}
						/>
						<Button
							type='button'
							disabled={!importNganhCode || parsing}
							onClick={() => inputRef.current?.click()}
						>
							{parsing ? (
								<Loader2 className='w-4 h-4 mr-1.5 animate-spin' />
							) : (
								<Upload className='w-4 h-4 mr-1.5' />
							)}
							Chọn file
						</Button>
						<Button
							type='button'
							variant='outline'
							onClick={downloadTemplate}
						>
							<Download className='w-4 h-4 mr-1.5' />
							Mẫu Excel
						</Button>
						{fileName && (
							<span className='text-sm text-muted-foreground flex items-center gap-1.5'>
								<FileSpreadsheet className='w-4 h-4' />
								{fileName}
							</span>
						)}
					</div>
				</CardContent>
			</Card>

			{rows.length > 0 && (
				<Card>
					<CardHeader className='pb-2'>
						<div className='flex flex-wrap items-center justify-between gap-2'>
							<CardTitle className='text-base flex items-center gap-2'>
								<FileUp className='w-4 h-4' />
								Xem trước · {validRows.length} hợp lệ
								{errorRows.length > 0 && (
									<Badge variant='destructive'>
										{errorRows.length} lỗi
									</Badge>
								)}
							</CardTitle>
							<Button
								disabled={importing || !validRows.length}
								onClick={() => void handleImport()}
							>
								{importing ? (
									<>
										<Loader2 className='w-4 h-4 mr-1.5 animate-spin' />
										{progress.done}/{progress.total}
									</>
								) : (
									<>
										<CheckCircle2 className='w-4 h-4 mr-1.5' />
										Import {validRows.length} dòng →{' '}
										{importNganhCode}
									</>
								)}
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<div className='rounded-lg border overflow-x-auto max-h-[480px] overflow-y-auto'>
							<Table>
								<TableHeader>
									<TableRow className='bg-muted/20'>
										<TableHead className='w-12'>
											#
										</TableHead>
										<TableHead>Mã</TableHead>
										<TableHead>Tên</TableHead>
										<TableHead>Loại</TableHead>
										<TableHead className='text-right'>
											SL
										</TableHead>
										<TableHead>ĐVT</TableHead>
										<TableHead>Nguồn mã</TableHead>
										<TableHead>Ghi chú</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((r) => {
										const bad =
											!!r.error ||
											r.codeSource === 'unresolved'
										return (
											<TableRow
												key={`${r.rowIndex}-${r.code}-${r.name}`}
												className={
													bad
														? 'bg-destructive/5'
														: undefined
												}
											>
												<TableCell className='text-muted-foreground'>
													{r.rowIndex}
												</TableCell>
												<TableCell className='font-mono text-sm'>
													{r.code || '—'}
												</TableCell>
												<TableCell className='font-medium'>
													{r.name}
												</TableCell>
												<TableCell className='text-sm text-muted-foreground'>
													{r.category || '—'}
												</TableCell>
												<TableCell className='text-right tabular-nums'>
													{r.quantity}
												</TableCell>
												<TableCell>
													{r.unit || 'Bộ'}
												</TableCell>
												<TableCell>
													<Badge
														variant={
															bad
																? 'destructive'
																: r.codeSource ===
																	  'generated'
																	? 'default'
																	: 'secondary'
														}
													>
														{codeSourceLabel(
															r.codeSource
														)}
													</Badge>
												</TableCell>
												<TableCell className='text-xs text-muted-foreground max-w-[200px]'>
													{r.error ||
														r.codeNote ||
														'—'}
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
