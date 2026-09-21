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
		<div
			className={`tabular font-display text-4xl font-semibold ${className}`}
		>
			{value}
		</div>
		<div className='text-sm text-muted-foreground'>{label}</div>
	</div>
)

export function ImportResultSummary({ result }: { result: ImportResult }) {
	return (
		<div className='space-y-5 rounded-lg border bg-card p-5'>
			<h4 className='font-display text-lg font-semibold tracking-wide'>
				Kết quả import:
			</h4>
			<div className='grid grid-cols-3 gap-4'>
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
					<div className='space-y-1'>
						{result.skipped.map((s) => (
							<div
								key={s.row}
								className='rounded-sm bg-destructive/5 p-2 text-sm text-destructive shadow-[inset_3px_0_0_var(--destructive)] pl-3'
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
