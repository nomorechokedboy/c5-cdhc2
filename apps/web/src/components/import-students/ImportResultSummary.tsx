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
		<div className='text-muted-foreground'>{label}</div>
	</div>
)

export function ImportResultSummary({ result }: { result: ImportResult }) {
	return (
		<div className='bg-muted/50 border border-border rounded-lg p-4 space-y-3'>
			<h4 className='font-medium text-foreground'>Kết quả import:</h4>
			<div className='grid grid-cols-3 gap-4 text-sm'>
				<Stat
					value={result.created}
					label='Đã thêm'
					className='text-success'
				/>
				<Stat
					value={result.skipped.length}
					label='Bỏ qua (lỗi)'
					className='text-destructive'
				/>
				<Stat
					value={result.total}
					label='Tổng cộng'
					className='text-info'
				/>
			</div>

			{result.skipped.length > 0 && (
				<div className='space-y-2'>
					<h5 className='font-medium text-destructive'>
						Các dòng đã bỏ qua:
					</h5>
					<div className='max-h-32 overflow-y-auto space-y-1'>
						{result.skipped.map((s) => (
							<div
								key={s.row}
								className='text-sm text-destructive bg-destructive/10 p-2 rounded'
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
