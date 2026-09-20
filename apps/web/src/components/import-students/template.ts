import ExcelJS from 'exceljs'
import type { UnitOption } from '@/hooks/useUnitOptions'
import { IMPORT_COLUMNS } from './columns'
import { unitLabel } from './units'

const HEADER_ROW_VN = { bold: true, color: 'FFFFFFFF', fill: '4472C4' }
const HEADER_ROW_KEY = { bold: true, color: 'FF2F5597', fill: 'D9E1F2' }
const FIRST_DATA_ROW = 4 // dòng 3 là dòng mẫu
const LAST_DATA_ROW = 1000

const LISTS_SHEET = 'Danh mục'
const UNITS_SHEET = 'Danh sách lớp'

const INSTRUCTIONS = [
	'📘 HƯỚNG DẪN NHẬP THÔNG TIN HỌC VIÊN',
	'',
	'1. Dòng thứ 3 (Nguyễn Văn A) chỉ là dữ liệu mẫu. Nhập xong có thể xóa dòng này; nếu giữ nguyên, học viên đó cũng sẽ được thêm vào hệ thống.',
	'',
	'2. Các cột ngày (Ngày sinh, Ngày sinh cha/mẹ/vợ/chồng, Ngày chính thức vào Đảng/Đoàn) bắt buộc nhập theo định dạng DD/MM/YYYY. KHÔNG đổi định dạng ô.',
	'',
	'3. Cột Lớp: chọn từ danh sách (dạng "Tên lớp - Tên đại đội"). Cũng có thể nhập ID lớp trong sheet "Danh sách lớp".',
	'',
	'4. Các cột có danh sách chọn (dropdown) vui lòng chỉ chọn từ danh sách có sẵn (sheet "Danh mục").',
	'',
	'5. KHÔNG được thay đổi tên cột (dòng 1, dòng 2) và chỉ nhập dữ liệu từ dòng 4 trở đi.',
	'',
	'6. Nếu có thắc mắc, vui lòng liên hệ bộ phận IT để được hỗ trợ.'
]

function styleHeaderRow(
	row: ExcelJS.Row,
	style: { bold: boolean; color: string; fill: string }
) {
	row.eachCell((cell) => {
		cell.font = { bold: style.bold, color: { argb: style.color } }
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: style.fill }
		}
		cell.alignment = { horizontal: 'center', vertical: 'middle' }
	})
}

/**
 * File mẫu: dropdown trỏ tới vùng ô trong sheet "Danh mục" / "Danh sách lớp" thay vì
 * chuỗi nội tuyến — Excel giới hạn chuỗi list 255 ký tự nên danh sách dân tộc/lớp bị cắt.
 */
export function buildTemplateWorkbook(units: UnitOption[]): ExcelJS.Workbook {
	const workbook = new ExcelJS.Workbook()
	// Thứ tự sheet: nhập liệu → hướng dẫn → danh sách lớp → danh mục
	const sheet = workbook.addWorksheet('Mẫu Import')
	const instructions = workbook.addWorksheet('Hướng dẫn')
	const unitsSheet = workbook.addWorksheet(UNITS_SHEET)
	const listsSheet = workbook.addWorksheet(LISTS_SHEET)

	const labels = units.map(unitLabel)
	const sampleUnit = labels[0] ?? ''

	styleHeaderRow(
		sheet.addRow(IMPORT_COLUMNS.map((c) => c.header)),
		HEADER_ROW_VN
	)
	styleHeaderRow(
		sheet.addRow(IMPORT_COLUMNS.map((c) => c.key)),
		HEADER_ROW_KEY
	)
	sheet.addRow(
		IMPORT_COLUMNS.map((c) => (c.kind === 'unit' ? sampleUnit : c.sample))
	)

	const addListValidation = (
		columnIndex: number,
		sourceSheet: string,
		sourceColumn: string,
		length: number
	) => {
		if (length === 0) return
		const letter = sheet.getColumn(columnIndex + 1).letter
		sheet.dataValidations.add(
			`${letter}${FIRST_DATA_ROW}:${letter}${LAST_DATA_ROW}`,
			{
				type: 'list',
				allowBlank: true,
				formulae: [
					`'${sourceSheet}'!$${sourceColumn}$2:$${sourceColumn}$${length + 1}`
				]
			}
		)
	}

	// Mỗi cột có dropdown → một cột riêng trong sheet "Danh mục"
	let listColumn = 0
	IMPORT_COLUMNS.forEach((column, index) => {
		const col = sheet.getColumn(index + 1)
		col.width = 20
		// Ô ngày để dạng text: nhập dd/mm/yyyy không bị Excel tự đổi thành số ngày
		if (column.kind === 'date') col.numFmt = '@'
		if (column.kind === 'number') col.numFmt = '0'

		if (column.list?.length) {
			listColumn += 1
			const source = listsSheet.getColumn(listColumn)
			source.width = 24
			listsSheet.getCell(1, listColumn).value = column.header
			listsSheet.getCell(1, listColumn).font = { bold: true }
			column.list.forEach((value, i) => {
				listsSheet.getCell(i + 2, listColumn).value = value
			})
			addListValidation(
				index,
				LISTS_SHEET,
				source.letter,
				column.list.length
			)
		}
		if (column.kind === 'unit') {
			addListValidation(index, UNITS_SHEET, 'B', labels.length)
		}
	})

	INSTRUCTIONS.forEach((line) => instructions.addRow([line]))
	instructions.getColumn(1).width = 100

	unitsSheet.addRow(['ID Lớp', 'Tên lớp - Tên đại đội'])
	units.forEach((u, i) => unitsSheet.addRow([Number(u.value), labels[i]]))
	unitsSheet.getColumn(1).width = 10
	unitsSheet.getColumn(2).width = 50

	return workbook
}

export async function downloadStudentTemplate(units: UnitOption[]) {
	const buffer = await buildTemplateWorkbook(units).xlsx.writeBuffer()
	const blob = new Blob([buffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	})
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = 'Mau_Import_Hoc_Vien.xlsx'
	link.click()
	URL.revokeObjectURL(url)
}
