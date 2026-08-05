import dayjs from 'dayjs'
import {
	AlignmentType,
	BorderStyle,
	Document,
	Packer,
	Paragraph,
	Table,
	TableCell,
	TableRow,
	TextRun,
	WidthType
} from 'docx'
import type { LeaveRequest } from '@/api/leave'
import JSZip from 'jszip'

const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
const borders = { top: border, bottom: border, left: border, right: border }
const fmt = (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const TEMPLATE_FIELDS = [
	'STT',
	'HO_TEN',
	'NHAP_NGU',
	'CAP_BAC',
	'CHUC_VU_DON_VI',
	'NOI_NGHI',
	'THOI_GIAN_NGHI',
	'NGUOI_THAY_THE',
	'GHI_CHU'
] as const
type TemplateField = (typeof TEMPLATE_FIELDS)[number]

function getOrCreateTextNodes(doc: XMLDocument, ns: string, cell: Element) {
	const existing = Array.from(cell.getElementsByTagNameNS(ns, 't'))
	if (existing.length) return existing
	let paragraph = Array.from(cell.children).find((n) => n.localName === 'p')
	if (!paragraph) {
		paragraph = doc.createElementNS(ns, 'w:p')
		cell.appendChild(paragraph)
	}
	const run = doc.createElementNS(ns, 'w:r')
	const text = doc.createElementNS(ns, 'w:t')
	run.appendChild(text)
	paragraph.appendChild(run)
	return [text]
}

function triggerWordDownload(blob: Blob, fileName: string) {
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = fileName
	a.click()
	URL.revokeObjectURL(url)
}

export async function downloadTaggedLeaveWordTemplate() {
	const buffer = await fetch('/templates/leave/mau-dang-ki-phep.docx').then(
		(r) => {
			if (!r.ok) throw new Error('Không tải được mẫu Word chuẩn')
			return r.arrayBuffer()
		}
	)
	let zip: JSZip
	try {
		zip = await JSZip.loadAsync(buffer)
	} catch {
		throw new Error(
			'Mẫu không phải file .docx hợp lệ. Hãy mở bằng Word và dùng Save As → Word (.docx), không chỉ đổi tên đuôi.'
		)
	}
	const xmlFile = zip.file('word/document.xml')
	if (!xmlFile) throw new Error('Mẫu Word không có document.xml')
	const doc = new DOMParser().parseFromString(
		await xmlFile.async('string'),
		'application/xml'
	)
	const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
	const table = Array.from(doc.getElementsByTagNameNS(ns, 'tbl'))[1]
	const sampleRow = table
		? Array.from(table.children).filter((n) => n.localName === 'tr')[1]
		: undefined
	if (!sampleRow) throw new Error('Mẫu Word thiếu dòng dữ liệu mẫu')
	const cells = Array.from(sampleRow.children).filter(
		(n) => n.localName === 'tc'
	) as Element[]
	cells.forEach((cell, index) => {
		const texts = getOrCreateTextNodes(doc, ns, cell)
		const firstText = texts[0]
		if (firstText)
			firstText.textContent = `{{${TEMPLATE_FIELDS[index] || ''}}}`
		for (const text of texts.slice(1)) text.textContent = ''
	})
	const allTexts = Array.from(doc.getElementsByTagNameNS(ns, 't'))
	for (const text of allTexts) {
		if ((text.textContent || '').includes('ĐƠN VỊ....................'))
			text.textContent = '{{DON_VI}}'
		if ((text.textContent || '').includes('- Phòng Chính trị;'))
			text.textContent = '{{NOI_NHAN}}'
	}
	zip.file('word/document.xml', new XMLSerializer().serializeToString(doc))
	const blob = await zip.generateAsync({
		type: 'blob',
		mimeType:
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	})
	triggerWordDownload(blob, 'MAU-DANG-KY-NGHI-PHEP-CHUAN.docx')
}

function scopeLabel(row: LeaveRequest) {
	if (row.className) return `LỚP ${row.className}`
	const pos = (row.position || '').toLocaleLowerCase('vi')
	if (/tiểu đoàn trưởng|chính trị viên|chỉ huy/.test(pos))
		return 'CHỈ HUY CƠ QUAN'
	return (row.unitName || 'CƠ QUAN QUẢN LÝ').toUpperCase()
}

function cell(text: string, bold = false, center = false) {
	return new TableCell({
		borders,
		children: [
			new Paragraph({
				alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
				children: [
					new TextRun({
						text,
						bold,
						font: 'Times New Roman',
						size: 24
					})
				]
			})
		]
	})
}

export async function exportLeaveRegistrationWord(
	rows: LeaveRequest[],
	year: number,
	options?: {
		titleSuffix?: string
		managingLabel?: string
		recipient?: string
		templateSource?: string
	}
) {
	if (options?.templateSource) {
		await exportUsingExactTemplate(rows, year, options)
		return
	}
	const sorted = [...rows].sort(
		(a, b) =>
			scopeLabel(a).localeCompare(scopeLabel(b), 'vi') ||
			(a.personnelName || '').localeCompare(b.personnelName || '', 'vi')
	)
	const tableRows: TableRow[] = [
		new TableRow({
			tableHeader: true,
			children: [
				'TT',
				'Họ và tên',
				'Nhập ngũ',
				'Cấp bậc, chức vụ',
				'Đơn vị',
				'Nơi nghỉ',
				'Thời gian nghỉ',
				'Thay thế',
				'Ghi chú'
			].map((x) => cell(x, true, true))
		})
	]
	let lastScope = ''
	let index = 0
	for (const row of sorted) {
		const scope = scopeLabel(row)
		if (scope !== lastScope) {
			tableRows.push(
				new TableRow({
					children: [
						new TableCell({
							columnSpan: 9,
							borders,
							children: [
								new Paragraph({
									children: [
										new TextRun({
											text: scope,
											bold: true,
											font: 'Times New Roman',
											size: 24
										})
									]
								})
							]
						})
					]
				})
			)
			lastScope = scope
		}
		index += 1
		tableRows.push(
			new TableRow({
				children: [
					cell(String(index), false, true),
					cell(row.personnelName || '—'),
					cell(fmt(row.enlistmentDate), false, true),
					cell(
						[row.rank, row.position].filter(Boolean).join(', ') ||
							'—'
					),
					cell(row.unitName || '—'),
					cell(row.localityPath || '—'),
					cell(
						`${fmt(row.startDate)} - ${fmt(row.endDate)}`,
						false,
						true
					),
					cell(
						[row.replacementPersonnelName, row.replacementPosition]
							.filter(Boolean)
							.join(' — ') || '—'
					),
					cell(
						row.note ||
							row.adminNote ||
							row.extraReasons.join(', ') ||
							''
					)
				]
			})
		)
	}
	const now = dayjs()
	const doc = new Document({
		sections: [
			{
				properties: {},
				children: [
					new Paragraph({
						alignment: AlignmentType.CENTER,
						children: [
							new TextRun({
								text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
								bold: true,
								font: 'Times New Roman',
								size: 26
							})
						]
					}),
					new Paragraph({
						alignment: AlignmentType.CENTER,
						children: [
							new TextRun({
								text: 'Độc lập - Tự do - Hạnh phúc',
								bold: true,
								font: 'Times New Roman',
								size: 26
							})
						]
					}),
					new Paragraph({
						alignment: AlignmentType.RIGHT,
						children: [
							new TextRun({
								text: `Ngày ${now.format('DD')} tháng ${now.format('MM')} năm ${now.format('YYYY')}`,
								italic: true,
								font: 'Times New Roman',
								size: 24
							})
						]
					}),
					new Paragraph({
						alignment: AlignmentType.LEFT,
						children: [
							new TextRun({
								text: (
									options?.managingLabel || 'ĐƠN VỊ QUẢN LÝ'
								).toUpperCase(),
								bold: true,
								font: 'Times New Roman',
								size: 26
							})
						]
					}),
					new Paragraph({
						alignment: AlignmentType.CENTER,
						spacing: { before: 240, after: 200 },
						children: [
							new TextRun({
								text: `DANH SÁCH ĐĂNG KÝ NGHỈ PHÉP${options?.titleSuffix ? ` (${options.titleSuffix.toUpperCase()})` : ''}`,
								bold: true,
								font: 'Times New Roman',
								size: 30
							})
						]
					}),
					new Table({
						width: { size: 100, type: WidthType.PERCENTAGE },
						rows: tableRows
					}),
					new Paragraph({
						spacing: { before: 300 },
						alignment: AlignmentType.RIGHT,
						children: [
							new TextRun({
								text: 'CHỈ HUY',
								bold: true,
								font: 'Times New Roman',
								size: 26
							})
						]
					})
				]
			}
		]
	})
	const blob = await Packer.toBlob(doc)
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `danh-sach-dang-ky-nghi-phep-${year}.docx`
	a.click()
	URL.revokeObjectURL(url)
}

async function exportUsingExactTemplate(
	rows: LeaveRequest[],
	year: number,
	options: {
		titleSuffix?: string
		managingLabel?: string
		recipient?: string
		templateSource?: string
	}
) {
	const source =
		options.templateSource || '/templates/leave/mau-dang-ki-phep.docx'
	const buffer = await fetch(source).then((r) => {
		if (!r.ok) throw new Error('Không tải được mẫu Word')
		return r.arrayBuffer()
	})
	let zip: JSZip
	try {
		zip = await JSZip.loadAsync(buffer)
	} catch {
		throw new Error(
			'Mẫu không phải file .docx hợp lệ. Hãy mở bằng Word và dùng Save As → Word (.docx), không chỉ đổi tên đuôi.'
		)
	}
	const xmlFile = zip.file('word/document.xml')
	if (!xmlFile) throw new Error('Mẫu Word không có document.xml')
	const xml = await xmlFile.async('string')
	const doc = new DOMParser().parseFromString(xml, 'application/xml')
	const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
	const tables = Array.from(doc.getElementsByTagNameNS(ns, 'tbl'))
	let listTable = tables[1]
	if (!listTable) throw new Error('Mẫu Word không có bảng danh sách thứ hai')
	let tableRows = Array.from(listTable.children).filter(
		(n) => n.localName === 'tr'
	)
	let sampleRow = tableRows[1]
	for (const table of tables) {
		const rowsInTable = Array.from(table.children).filter(
			(n) => n.localName === 'tr'
		)
		const taggedRow = rowsInTable.find((row) => {
			const content = Array.from(row.getElementsByTagNameNS(ns, 't'))
				.map((t) => t.textContent || '')
				.join('')
			return TEMPLATE_FIELDS.every((field) =>
				content.includes(`{{${field}}}`)
			)
		})
		if (taggedRow) {
			listTable = table
			tableRows = rowsInTable
			sampleRow = taggedRow
			break
		}
	}
	if (!sampleRow) throw new Error('Mẫu Word thiếu dòng dữ liệu mẫu')
	const sampleCells = Array.from(sampleRow.children).filter(
		(n) => n.localName === 'tc'
	) as Element[]
	const taggedIndexes = new Map<TemplateField, number>()
	sampleCells.forEach((cell, index) => {
		const content = Array.from(cell.getElementsByTagNameNS(ns, 't'))
			.map((t) => t.textContent || '')
			.join('')
		for (const field of TEMPLATE_FIELDS)
			if (content.includes(`{{${field}}}`))
				taggedIndexes.set(field, index)
	})
	const usesTags = TEMPLATE_FIELDS.every((field) => taggedIndexes.has(field))
	for (const row of tableRows.slice(1)) listTable.removeChild(row)
	const setCell = (cell: Element, value: string) => {
		const texts = getOrCreateTextNodes(doc, ns, cell)
		const firstText = texts[0]
		if (firstText) firstText.textContent = value
		for (const t of texts.slice(1)) t.textContent = ''
	}
	const setCellParts = (cell: Element, values: string[]) => {
		const texts = getOrCreateTextNodes(doc, ns, cell)
		texts.forEach((t, i) => {
			t.textContent = values[i] || ''
		})
		if (texts.length === 1 && values.length > 1 && texts[0])
			texts[0].textContent = values.filter(Boolean).join(', ')
	}
	rows.forEach((row, index) => {
		const next = sampleRow.cloneNode(true) as Element
		const cells = Array.from(next.children).filter(
			(n) => n.localName === 'tc'
		) as Element[]
		const values: Record<TemplateField, string> = {
			STT: String(index + 1),
			HO_TEN: row.personnelName || '—',
			NHAP_NGU: row.enlistmentDate
				? dayjs(row.enlistmentDate).format('MM/YYYY')
				: '—',
			CAP_BAC: row.rank || '—',
			CHUC_VU_DON_VI:
				[row.position, row.unitName].filter(Boolean).join(', ') || '—',
			NOI_NGHI: row.localityPath || '—',
			THOI_GIAN_NGHI: `${fmt(row.startDate)}-${fmt(row.endDate)}`,
			NGUOI_THAY_THE:
				[row.replacementPersonnelName, row.replacementPosition]
					.filter(Boolean)
					.join(', ') || '',
			GHI_CHU:
				row.note || row.adminNote || row.extraReasons.join(', ') || ''
		}
		TEMPLATE_FIELDS.forEach((field, fallbackIndex) => {
			const cellIndex = usesTags
				? (taggedIndexes.get(field) ?? fallbackIndex)
				: fallbackIndex
			const cell = cells[cellIndex]
			if (!cell) return
			if (field === 'CHUC_VU_DON_VI')
				setCellParts(cell, [row.position || '—', row.unitName || '—'])
			else setCell(cell, values[field])
		})
		listTable.appendChild(next)
	})
	const allTexts = Array.from(doc.getElementsByTagNameNS(ns, 't'))
	for (const t of allTexts) {
		if ((t.textContent || '').includes('ĐĂNG KÝ NGHỈ PHÉP'))
			t.textContent = `ĐĂNG KÝ NGHỈ PHÉP${options.titleSuffix ? ` (${options.titleSuffix.toUpperCase()})` : ''}`
		if ((t.textContent || '').includes('ĐƠN VỊ....................'))
			t.textContent = (options.managingLabel || '').toUpperCase()
		if ((t.textContent || '').includes('{{DON_VI}}'))
			t.textContent = (options.managingLabel || '').toUpperCase()
		if ((t.textContent || '').includes('{{NOI_NHAN}}'))
			t.textContent = options.recipient || '—'
		if (
			options.recipient &&
			(t.textContent || '').includes('- Phòng Chính trị;')
		)
			t.textContent = options.recipient
	}
	zip.file('word/document.xml', new XMLSerializer().serializeToString(doc))
	const blob = await zip.generateAsync({
		type: 'blob',
		mimeType:
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	})
	triggerWordDownload(blob, `danh-sach-dang-ky-nghi-phep-${year}.docx`)
}
