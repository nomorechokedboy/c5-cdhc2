import type { ImportResult } from './useStudentImport'

const Stat = ({
	value,
	label,
	className
}: {
	value: number
	label: string
	className: string
}) => (
	<div className='text-center'>
		<div className={`text-2xl font-bold ${className}`}>{value}</div>
		<div className='text-gray-600'>{label}</div>
	</div>
)

export function ImportResultSummary({ result }: { result: ImportResult }) {
	return (
		<div className='bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3'>
			<h4 className='font-medium text-gray-900'>Kết quả import:</h4>
			<div className='grid grid-cols-3 gap-4 text-sm'>
				<Stat
					value={result.created}
					label='Đã thêm'
					className='text-green-600'
				/>
				<Stat
					value={result.skipped.length}
					label='Bỏ qua (lỗi)'
					className='text-red-600'
				/>
				<Stat
					value={result.total}
					label='Tổng cộng'
					className='text-blue-600'
				/>
			</div>

			{result.skipped.length > 0 && (
				<div className='space-y-2'>
					<h5 className='font-medium text-red-700'>
						Các dòng đã bỏ qua:
					</h5>
					<div className='max-h-32 overflow-y-auto space-y-1'>
						{result.skipped.map((s) => (
							<div
								key={s.row}
								className='text-sm text-red-600 bg-red-50 p-2 rounded'
							>
								Dòng {s.row}: {s.message}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
