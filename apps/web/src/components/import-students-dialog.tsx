import React, { useState, useRef, useMemo } from 'react'
import XLSX from 'xlsx'
import {
	FileUp,
	Download,
	AlertCircle,
	CheckCircle,
	X,
	Upload,
	FileSpreadsheet,
	Info,
	Users,
	ArrowRight
} from 'lucide-react'
import useCreateStudents from '@/hooks/useCreateStudents'
import { toIsoDate } from '@/common'
import type { StudentBody } from '@/types'
import useClassData from '@/hooks/useClasses'
export interface ImportStudentsDialogProps {
	isOpen: boolean
	onClose: () => void
	onSuccess?: (results: {
		successCount: number
		errorCount: number
		totalCount: number
		errors: { row: number; message: string }[]
	}) => void
}

export function ImportStudentsDialog({
	isOpen,
	onClose,
	onSuccess
}: ImportStudentsDialogProps) {
	const { data: classes = [] } = useClassData()
	// options cho select lớp
	const classOptions = useMemo(
		() =>
			classes.map((c) => ({
				value: c.id.toString(),
				label: `${c.name} - ${c.unit.name}`
			})),
		[classes]
	)

	const createStudentsMutation = useCreateStudents()
	const [students, setStudents] = useState<StudentBody[]>([])
	const [selectedFile, setSelectedFile] = useState(null)
	const [dragActive, setDragActive] = useState(false)
	const [uploadStatus, setUploadStatus] = useState('idle') // idle, uploading, success, error
	const [uploadMessage, setUploadMessage] = useState('')
	const [importResults, setImportResults] = useState<{
		successCount: number
		errorCount: number
		totalCount: number
		errors: { row: number; message: string }[]
	} | null>(null)
	const fileInputRef = useRef(null)

	const downloadTemplate = () => {
		// Headers mapping
		const headers = [
			'fullName',
			'birthPlace',
			'address',
			'dob',
			'rank',
			'previousUnit',
			'previousPosition',
			'ethnic',
			'religion',
			'enlistmentPeriod',
			'politicalOrg',
			'politicalOrgOfficialDate',
			'cpvId',
			'educationLevel',
			'schoolName',
			'major',
			'isGraduated',
			'talent',
			'shortcoming',
			'policyBeneficiaryGroup',
			'fatherName',
			'fatherDob',
			'fatherPhoneNumber',
			'fatherJob',
			'motherName',
			'motherDob',
			'motherPhoneNumber',
			'motherJob',
			'isMarried',
			'spouseName',
			'spouseDob',
			'spouseJob',
			'spousePhoneNumber',
			'familySize',
			'familyBackground',
			'familyBirthOrder',
			'achievement',
			'disciplinaryHistory',
			'childrenInfos',
			'phone',
			'classId'
		]
		const vietnameseHeaders = [
			'Họ và tên',
			'Nơi sinh',
			'Địa chỉ',
			'Ngày sinh',
			'Cấp bậc',
			'Đơn vị cũ',
			'Chức vụ cũ',
			'Dân tộc',
			'Tôn giáo',
			'Thời gian nhập ngũ',
			'Đoàn/Đảng',
			'Ngày chính thức vào Đảng/Đoàn',
			'ID Đảng viên',
			'Trình độ học vấn',
			'Tên trường',
			'Chuyên ngành',
			'Đã tốt nghiệp',
			'Tài năng',
			'Thiếu sót',
			'Nhóm thụ hưởng chính sách',
			'Tên cha',
			'Ngày sinh cha',
			'Số điện thoại cha',
			'Nghề nghiệp cha',
			'Tên mẹ',
			'Ngày sinh mẹ',
			'Số điện thoại mẹ',
			'Nghề nghiệp mẹ',
			'Đã kết hôn',
			'Tên vợ/chồng',
			'Ngày sinh vợ/chồng',
			'Nghề nghiệp vợ/chồng',
			'Số điện thoại vợ/chồng',
			'Quy mô gia đình',
			'Hoàn cảnh gia đình',
			'Thứ tự sinh trong gia đình',
			'Thành tích',
			'Lịch sử kỷ luật',
			'Thông tin con cái',
			'Số điện thoại',
			'ID Lớp'
		]
		// Sample data
		const sampleData = [
			{
				fullName: 'Nguyễn Văn A',
				birthPlace: 'Hà Nội',
				address: '123 Đường ABC, Hà Nội',
				dob: '01/01/2000',
				rank: 'Binh nhất',
				previousUnit: 'Đại đội 1',
				previousPosition: '',
				ethnic: 'Kinh',
				religion: 'Không',
				enlistmentPeriod: '2024',
				politicalOrg: 'hcyu',
				politicalOrgOfficialDate: '26/03/2020',
				cpvId: '',
				educationLevel: '12/12',
				schoolName: 'THPT Hà Nội',
				major: 'Toán',
				isGraduated: false,
				talent: 'Văn nghệ',
				shortcoming: 'Chưa có',
				policyBeneficiaryGroup: 'Không',
				fatherName: 'Nguyễn Văn B',
				fatherDob: '01/01/1970',
				fatherPhoneNumber: '0912345678',
				fatherJob: 'Công nhân',
				motherName: 'Trần Thị C',
				motherDob: '02/02/1972',
				motherPhoneNumber: '0987654321',
				motherJob: 'Giáo viên',
				isMarried: false,
				spouseName: '',
				spouseDob: '',
				spouseJob: '',
				spousePhoneNumber: '',
				familySize: 4,
				familyBackground: 'Không',
				familyBirthOrder: 'Con cả',
				achievement: 'Học sinh giỏi',
				disciplinaryHistory: '',
				childrenInfos: [],
				phone: '0911222333',
				classId: 1
			}
		]

		// Create workbook and worksheet
		const wb = XLSX.utils.book_new()

		// Create data array with headers and sample data
		const data = [
			vietnameseHeaders, // Row 0: Vietnamese headers
			headers, // Row 1: API field names
			headers.map((h) => (sampleData[0] as any)[h] ?? '')
		]

		// Convert array to worksheet
		const ws = XLSX.utils.aoa_to_sheet(data)

		// Set column widths for better readability
		const colWidths = headers.map(() => ({ wch: 20 }))
		ws['!cols'] = colWidths

		// Style the header rows
		const headerStyle = {
			fill: { fgColor: { rgb: '4472C4' } },
			font: { color: { rgb: 'FFFFFF' }, bold: true },
			alignment: { horizontal: 'center' }
		}

		const apiHeaderStyle = {
			fill: { fgColor: { rgb: 'D9E1F2' } },
			font: { color: { rgb: '2F5597' }, bold: true },
			alignment: { horizontal: 'center' }
		}

		// Apply styles to Vietnamese headers (row 0)
		for (let i = 0; i < vietnameseHeaders.length; i++) {
			const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i })
			if (!ws[cellAddress]) ws[cellAddress] = { v: vietnameseHeaders[i] }
			ws[cellAddress].s = headerStyle
		}

		// Apply styles to API headers (row 1)
		for (let i = 0; i < headers.length; i++) {
			const cellAddress = XLSX.utils.encode_cell({ r: 1, c: i })
			if (!ws[cellAddress]) ws[cellAddress] = { v: headers[i] }
			ws[cellAddress].s = apiHeaderStyle
		}

		// Add main sheet to workbook
		XLSX.utils.book_append_sheet(wb, ws, 'Mẫu Import')

		// Create instruction sheet
		const instructionData = [
			['📘 HƯỚNG DẪN SỬ DỤNG FILE IMPORT'],
			[''],

			['1. ĐỊNH DẠNG DỮ LIỆU'],
			['• Ngày tháng: DD/MM/YYYY (ví dụ: 03/05/2000)'],
			["• Đã tốt nghiệp: Nhập 'Có' hoặc 'Không'"],
			["• Đã kết hôn: Nhập 'Có' hoặc 'Không'"],
			['• Số điện thoại: Định dạng 10-11 số'],
			[''],

			['2. CÁC TRƯỜNG BẮT BUỘC'],
			['• Họ và tên (không được để trống)'],
			['• Ngày sinh (định dạng DD/MM/YYYY)'],
			['• Số điện thoại (10-11 số)'],
			['• ID Lớp (số nguyên, xem tại sheet Danh sách lớp)'],
			[''],

			['3. GHI CHÚ QUAN TRỌNG'],
			['• KHÔNG được xóa hoặc thay đổi tên cột'],
			['• KHÔNG được xóa dòng 2 (chứa tên trường API)'],
			['• Nhập dữ liệu từ dòng 4 trở đi'],
			['• Các trường để trống nếu không có thông tin'],
			['• Dữ liệu mẫu ở dòng 3 có thể xóa hoặc chỉnh sửa'],
			[''],

			['4. MÃ TỔ CHỨC CHÍNH TRỊ'],
			['• hcyu: Đoàn Thanh niên Cộng sản Hồ Chí Minh'],
			['• cpv: Đảng Cộng sản Việt Nam'],
			[''],

			['5. CÁC GIÁ TRỊ BOOLEAN'],
			['• isGraduated: true hoặc false'],
			['• isMarried: true hoặc false'],
			[''],

			['6. CẤP BẬC'],
			[
				'Binh nhất, Binh nhì, Hạ sĩ, Trung sĩ, Thượng sĩ, Thiếu úy chuyên nghiệp, Trung úy chuyên nghiệp, Thượng úy chuyên nghiệp, Đại úy chuyên nghiệp, Thiếu tá chuyên nghiệp, Trung tá chuyên nghiệp, Thượng tá chuyên nghiệp'
			],
			[''],

			['7. TRÌNH ĐỘ HỌC VẤN'],
			['9/12, 10/12, 11/12, 12/12, Cao đẳng, Đại học, Sau đại học'],
			[''],

			['8. TÔN GIÁO'],
			['Không, Phật giáo, Công giáo, Cao Đài, Tin Lành, Hòa Hảo, ...'],
			[''],

			['9. LIÊN HỆ HỖ TRỢ'],
			['Nếu có thắc mắc, vui lòng liên hệ bộ phận IT để được hỗ trợ.'],
			['']
		]

		const wsInstruction = XLSX.utils.aoa_to_sheet(instructionData)

		// Style instruction sheet
		const titleStyle = {
			fill: { fgColor: { rgb: '4472C4' } },
			font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 14 },
			alignment: { horizontal: 'center' }
		}
		// Apply title style
		const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 })
		if (!wsInstruction[titleCell])
			wsInstruction[titleCell] = { v: 'HƯỚNG DẪN SỬ DỤNG FILE IMPORT' }
		wsInstruction[titleCell].s = titleStyle

		// Set column width for instruction sheet
		wsInstruction['!cols'] = [{ wch: 60 }]

		// Add instruction sheet to workbook
		XLSX.utils.book_append_sheet(wb, wsInstruction, 'Hướng dẫn')

		// thêm sheet Danh sách lớp hiện tại
		const classData = [
			['ID Lớp', 'Tên lớp - Tên đơn vị'],
			...classOptions.map((c) => [c.value, c.label])
		]
		const wsClasses = XLSX.utils.aoa_to_sheet(classData)
		wsClasses['!cols'] = [{ wch: 15 }, { wch: 40 }]
		// Style header
		const classHeaderStyle = {
			fill: { fgColor: { rgb: '4472C4' } },
			font: { color: { rgb: 'FFFFFF' }, bold: true },
			alignment: { horizontal: 'center' }
		}
		for (let i = 0; i < classData[0].length; i++) {
			const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i })
			if (!wsClasses[cellAddress])
				wsClasses[cellAddress] = { v: classData[0][i] }
			wsClasses[cellAddress].s = classHeaderStyle
		}
		XLSX.utils.book_append_sheet(wb, wsClasses, 'Danh sách lớp')

		// Download the Excel file
		XLSX.writeFile(wb, 'Mau_Import_Hoc_Vien.xlsx')
	}

	const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		if (e.type === 'dragenter' || e.type === 'dragover') {
			setDragActive(true)
		} else if (e.type === 'dragleave') {
			setDragActive(false)
		}
	}

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setDragActive(false)

		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleFileSelect(e.dataTransfer.files[0])
		}
	}

	const handleFileSelect = (file) => {
		if (
			file &&
			(file.type === 'text/csv' ||
				file.name.endsWith('.csv') ||
				file.type === 'application/vnd.ms-excel' ||
				file.type ===
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
				file.name.endsWith('.xlsx') ||
				file.name.endsWith('.xls'))
		) {
			// Reset states
			setUploadStatus('idle')
			setUploadMessage('')
			setImportResults(null)

			// Create FileReader
			const reader = new FileReader()

			// Handle successful file read
			reader.onload = (e) => {
				try {
					const data = new Uint8Array(e.target.result)
					const workbook = XLSX.read(data, { type: 'array' })
					const sheetName = workbook.SheetNames[0]
					const worksheet = workbook.Sheets[sheetName]

					// Parse to JSON array
					const jsonData = XLSX.utils.sheet_to_json(worksheet, {
						defval: '',
						header: 1 // Read as array of arrays first
					})

					// Skip header rows if needed (row 0: Vietnamese headers, row 1: API field names)
					// const dataRows = jsonData.slice(2) // Start from row 2 (actual data)
					const dataRows = jsonData
						.slice(2)
						.filter((row) =>
							row.some(
								(cell) =>
									cell !== '' &&
									cell !== null &&
									cell !== undefined
							)
						)

					// Convert to objects using API field names from row 1
					const headers = jsonData[1] // API field names

					const booleanFields = ['isGraduated', 'isMarried']

					const students = dataRows.map((row) => {
						const student: Record<string, any> = {}
						headers.forEach((header, index) => {
							let value = row[index] ?? '' // giữ nguyên false, 0

							if (booleanFields.includes(header)) {
								if (typeof value === 'string') {
									const normalized = value
										.trim()
										.toLowerCase()
									if (
										normalized === 'có' ||
										normalized === 'true'
									)
										value = true
									else if (
										normalized === 'không' ||
										normalized === 'false'
									)
										value = false
									else value = '' // trường hợp để trống hoặc không hợp lệ
								}
							}

							if (header === 'childrenInfos') {
								if (
									typeof value === 'string' &&
									value.trim() !== ''
								) {
									try {
										value = JSON.parse(value)
										if (!Array.isArray(value)) value = []
									} catch {
										value = []
									}
								} else {
									value = []
								}
							}

							if (
								[
									'dob',
									'fatherDob',
									'motherDob',
									'spouseDob',
									'politicalOrgOfficialDate'
								].includes(header) &&
								typeof value === 'string' &&
								value.trim() !== ''
							) {
								value = toIsoDate(value)
							}

							student[header] = value
						})
						return student
					})

					console.log('Parsed students data:', students)
					// Update states
					setStudents(students)
					setSelectedFile(file)
					setUploadStatus('ready') // or whatever status you want
				} catch (error) {
					console.error('Error parsing file:', error)
					setUploadMessage(
						'Lỗi đọc file. Vui lòng kiểm tra định dạng file.'
					)
					setUploadStatus('error')
				}
			}

			// Handle file read error
			reader.onerror = (error) => {
				console.error('FileReader error:', error)
				setUploadMessage('Lỗi đọc file. Vui lòng thử lại.')
				setUploadStatus('error')
			}

			// Actually read the file as ArrayBuffer
			reader.readAsArrayBuffer(file)
		} else {
			setUploadMessage('Vui lòng chọn file CSV hoặc Excel (.xlsx, .xls)')
			setUploadStatus('error')
		}
	}

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			handleFileSelect(e.target.files[0])
		}
	}

	const handleImport = async () => {
		if (!selectedFile) {
			setUploadMessage('Vui lòng chọn file để import')
			setUploadStatus('error')
			return
		}

		setUploadStatus('uploading')
		setUploadMessage('Đang xử lý file...')

		console.log('Importing students:', students)

		// For demo: simulate API call
		/* setTimeout(() => {
			// Mock success response
			const mockResults = {
				successCount: 25,
				errorCount: 2,
				totalCount: 27,
				errors: [
					{ row: 3, message: 'Số điện thoại không hợp lệ' },
					{ row: 8, message: 'Ngày sinh không đúng định dạng' }
				]
			}

			setUploadStatus('success')
			setImportResults(mockResults)
			setUploadMessage(
				`Import hoàn tất! Thành công: ${mockResults.successCount}/${mockResults.totalCount} học viên`
			)
			onSuccess?.(mockResults)
		}, 2000) */

		// Real API call - uncomment when ready

		try {
			console.log('request body:', JSON.stringify(students, null, 2))
			const result = await createStudentsMutation.mutateAsync(students)

			const mockResults = {
				successCount: students.length,
				errorCount: 0,
				totalCount: students.length,
				errors: []
			}

			setUploadStatus('success')
			setImportResults(mockResults)
			setUploadMessage(
				`Import hoàn tất! Thành công: ${mockResults.successCount}/${mockResults.totalCount} học viên`
			)
			onSuccess?.(mockResults)
		} catch (error) {
			console.error('Import error:', error)
			setUploadStatus('error')
			setUploadMessage(`Lỗi import: ${error?.message || error}`)

			// Set error results
			const errorResults = {
				successCount: 0,
				errorCount: students.length,
				totalCount: students.length,
				errors: [{ row: 1, message: error?.message || 'Unknown error' }]
			}
			setImportResults(errorResults)
		}
	}

	const resetDialog = () => {
		setSelectedFile(null)
		setUploadStatus('idle')
		setUploadMessage('')
		setImportResults(null)
		setDragActive(false)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	const handleClose = () => {
		resetDialog()
		onClose()
	}

	if (!isOpen) return null

	return (
		<div className=' flex items-center justify-center z-50 p-4'>
			<div className='bg-white rounded-xl w-[90vw] max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl'>
				{/* Header */}
				<div className='flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-xl'>
					<div className='flex items-center space-x-3'>
						<Users className='h-6 w-6' />
						<h2 className='text-xl font-semibold'>
							Import danh sách học viên
						</h2>
					</div>
					<button
						onClick={handleClose}
						className='text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white hover:bg-opacity-20'
					>
						<X className='h-5 w-5' />
					</button>
				</div>

				{/* Content */}
				<div className='p-6 space-y-6'>
					{/* Instructions */}
					<div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
						<div className='flex items-start space-x-3'>
							<Info className='h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0' />
							<div>
								<h3 className='font-medium text-blue-900 mb-2'>
									Hướng dẫn import
								</h3>
								<div className='text-sm text-blue-800 space-y-2'>
									<div className='flex items-center space-x-2'>
										<span className='bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium'>
											1
										</span>
										<span>Tải xuống file mẫu</span>
									</div>
									<div className='flex items-center space-x-2'>
										<span className='bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium'>
											2
										</span>
										<span>
											Điền thông tin học viên theo định
											dạng mẫu
										</span>
									</div>
									<div className='flex items-center space-x-2'>
										<span className='bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium'>
											3
										</span>
										<span>Tải file lên và nhấn Import</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Download template */}
					<div className='border border-gray-200 rounded-lg p-4'>
						<div className='flex items-center justify-between'>
							<div className='flex items-center space-x-3'>
								<FileSpreadsheet className='h-8 w-8 text-green-500' />
								<div>
									<h3 className='font-medium text-gray-900'>
										File mẫu Excel
									</h3>
									<p className='text-sm text-gray-500'>
										Tải xuống để có cấu trúc dữ liệu chính
										xác
									</p>
								</div>
							</div>
							<button
								onClick={downloadTemplate}
								className='flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors'
							>
								<Download className='h-4 w-4' />
								<span>Tải xuống</span>
							</button>
						</div>
					</div>

					{/* File upload area */}
					<div className='space-y-4'>
						<h3 className='font-medium text-gray-900'>
							Chọn file để import
						</h3>

						<div
							className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
								dragActive
									? 'border-blue-400 bg-blue-50'
									: selectedFile
										? 'border-green-400 bg-green-50'
										: 'border-gray-300 hover:border-gray-400'
							}`}
							onDragEnter={handleDrag}
							onDragLeave={handleDrag}
							onDragOver={handleDrag}
							onDrop={handleDrop}
						>
							<input
								ref={fileInputRef}
								type='file'
								accept='.csv,.xlsx,.xls'
								onChange={handleFileInputChange}
								className='hidden'
							/>

							{selectedFile ? (
								<div className='space-y-3'>
									<CheckCircle className='h-12 w-12 text-green-500 mx-auto' />
									<div>
										<p className='font-medium text-green-700'>
											{selectedFile.name}
										</p>
										<p className='text-sm text-gray-500'>
											{(
												selectedFile.size /
												1024 /
												1024
											).toFixed(2)}{' '}
											MB
										</p>
									</div>
									<button
										onClick={() =>
											fileInputRef.current?.click()
										}
										className='text-blue-500 hover:text-blue-600 text-sm font-medium'
									>
										Chọn file khác
									</button>
								</div>
							) : (
								<div className='space-y-3'>
									<FileUp className='h-12 w-12 text-gray-400 mx-auto' />
									<div>
										<p className='text-gray-600'>
											Kéo thả file vào đây hoặc{' '}
											<button
												onClick={() =>
													fileInputRef.current?.click()
												}
												className='text-blue-500 hover:text-blue-600 font-medium'
											>
												chọn file
											</button>
										</p>
										<p className='text-sm text-gray-400 mt-1'>
											Hỗ trợ file CSV, Excel (.xlsx, .xls)
										</p>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Status message */}
					{uploadMessage && (
						<div
							className={`flex items-center space-x-2 p-3 rounded-lg ${
								uploadStatus === 'success'
									? 'bg-green-50 text-green-700 border border-green-200'
									: uploadStatus === 'error'
										? 'bg-red-50 text-red-700 border border-red-200'
										: 'bg-blue-50 text-blue-700 border border-blue-200'
							}`}
						>
							{uploadStatus === 'success' && (
								<CheckCircle className='h-5 w-5 flex-shrink-0' />
							)}
							{uploadStatus === 'error' && (
								<AlertCircle className='h-5 w-5 flex-shrink-0' />
							)}
							{uploadStatus === 'uploading' && (
								<div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500'></div>
							)}
							<span>{uploadMessage}</span>
						</div>
					)}

					{/* Import results */}
					{importResults && (
						<div className='bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3'>
							<h4 className='font-medium text-gray-900'>
								Kết quả import:
							</h4>
							<div className='grid grid-cols-3 gap-4 text-sm'>
								<div className='text-center'>
									<div className='text-2xl font-bold text-green-600'>
										{importResults.successCount}
									</div>
									<div className='text-gray-600'>
										Thành công
									</div>
								</div>
								<div className='text-center'>
									<div className='text-2xl font-bold text-red-600'>
										{importResults.errorCount}
									</div>
									<div className='text-gray-600'>Lỗi</div>
								</div>
								<div className='text-center'>
									<div className='text-2xl font-bold text-blue-600'>
										{importResults.totalCount}
									</div>
									<div className='text-gray-600'>
										Tổng cộng
									</div>
								</div>
							</div>

							{importResults.errors &&
								importResults.errors.length > 0 && (
									<div className='mt-3 space-y-2'>
										<h5 className='font-medium text-red-700'>
											Chi tiết lỗi:
										</h5>
										<div className='max-h-32 overflow-y-auto space-y-1'>
											{importResults.errors.map(
												(error, index) => (
													<div
														key={index}
														className='text-sm text-red-600 bg-red-50 p-2 rounded'
													>
														Dòng {error.row}:{' '}
														{error.message}
													</div>
												)
											)}
										</div>
									</div>
								)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className='flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl'>
					<button
						onClick={handleClose}
						className='px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors'
					>
						{uploadStatus === 'success' ? 'Đóng' : 'Hủy'}
					</button>

					{uploadStatus !== 'success' && (
						<button
							onClick={handleImport}
							disabled={
								!selectedFile || uploadStatus === 'uploading'
							}
							className='flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
						>
							{uploadStatus === 'uploading' ? (
								<>
									<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
									<span>Đang import...</span>
								</>
							) : (
								<>
									<Upload className='h-4 w-4' />
									<span>Import danh sách</span>
									<ArrowRight className='h-4 w-4' />
								</>
							)}
						</button>
					)}
				</div>
			</div>
		</div>
	)
}
