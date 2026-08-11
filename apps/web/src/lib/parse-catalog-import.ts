import * as XLSX from 'xlsx'

function matrixToRows(matrix: unknown[][]): Record<string, unknown>[] {
	const headers = (matrix[0] || []).map((value) => String(value ?? '').trim())
	if (!headers.some(Boolean)) throw new Error('Không tìm thấy dòng tiêu đề')
	return matrix
		.slice(1)
		.map((values) => {
			const row: Record<string, unknown> = {}
			headers.forEach((header, index) => {
				if (header) row[header] = values[index] ?? ''
			})
			return row
		})
		.filter((row) =>
			Object.values(row).some((value) => String(value).trim())
		)
}

function xmlText(value: string) {
	return value
		.replace(/<w:tab\s*\/?>/gi, '\t')
		.replace(/<w:br\s*\/?>/gi, ' ')
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.trim()
}

async function parseDocx(file: File): Promise<Record<string, unknown>[]> {
	const JSZip = (await import('jszip')).default
	const zip = await JSZip.loadAsync(await file.arrayBuffer())
	const xml = await zip.file('word/document.xml')?.async('string')
	if (!xml) throw new Error('File Word không hợp lệ; cần file .docx')

	const tables: string[][][] = []
	const tableRe = /<w:tbl[\s>][\s\S]*?<\/w:tbl>/gi
	for (const tableMatch of xml.matchAll(tableRe)) {
		const rows: string[][] = []
		for (const rowMatch of tableMatch[0].matchAll(
			/<w:tr[\s>][\s\S]*?<\/w:tr>/gi
		)) {
			const cells: string[] = []
			for (const cellMatch of rowMatch[0].matchAll(
				/<w:tc[\s>][\s\S]*?<\/w:tc>/gi
			)) {
				const texts = [
					...cellMatch[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi)
				]
				cells.push(
					xmlText(texts.map((match) => match[1] || '').join(' '))
				)
			}
			if (cells.length) rows.push(cells)
		}
		if (rows.length >= 2) tables.push(rows)
	}
	if (!tables.length) {
		throw new Error(
			'Không tìm thấy bảng trong Word. Hãy đặt dữ liệu trong bảng Word.'
		)
	}
	const best = tables.sort((a, b) => b.length - a.length)[0]!
	return matrixToRows(best)
}

export async function parseCatalogImportFile(
	file: File,
	sheetName?: string
): Promise<Record<string, unknown>[]> {
	const name = file.name.toLowerCase()
	if (name.endsWith('.doc')) {
		throw new Error(
			'File .doc cũ không hỗ trợ trực tiếp. Hãy lưu thành .docx rồi import lại.'
		)
	}
	if (name.endsWith('.docx')) return parseDocx(file)
	const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
	const sheet =
		(sheetName ? workbook.Sheets[sheetName] : undefined) ||
		workbook.Sheets[workbook.SheetNames[0] || '']
	if (!sheet) throw new Error('File không có sheet dữ liệu')
	return matrixToRows(
		XLSX.utils.sheet_to_json(sheet, {
			header: 1,
			defval: '',
			raw: false
		}) as unknown[][]
	)
}
