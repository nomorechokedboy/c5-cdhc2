import { FileSpreadsheet } from 'lucide-react'
import { ApprovedStamp } from '../student-profile/approved-stamp'

interface ImportCardProps {
	file: File | null
	total: number
	validCount: number
	invalidCount: number
	/** Import xong: đóng dấu lên phiếu */
	stamped: boolean
}

const Figure = ({
	label,
	value,
	className
}: {
	label: string
	value?: number
	className?: string
}) => (
	<div>
		<dt className='text-xs text-sidebar-foreground/60'>{label}</dt>
		<dd
			className={`tabular font-display text-3xl leading-tight font-semibold ${className ?? ''}`}
		>
			{value ?? '-'}
		</dd>
	</div>
)

/**
 * Phiếu nhập bên trái: file đang xử lý và số dòng hợp lệ / lỗi. Cùng khung với
 * thẻ hồ sơ học viên; xong việc thì đóng dấu «Đã import».
 */
export function ImportCard({
	file,
	total,
	validCount,
	invalidCount,
	stamped
}: ImportCardProps) {
	const loaded = total > 0

	return (
		<aside
			aria-label='Phiếu nhập'
			className='relative hidden flex-col gap-5 overflow-hidden bg-sidebar p-6 text-sidebar-foreground lg:flex'
		>
			<div className='mx-auto grid size-28 place-items-center rounded-lg bg-sidebar-accent ring-2 ring-gold'>
				<FileSpreadsheet className='size-1/2 text-gold' />
			</div>

			<div className='min-w-0'>
				<p className='text-xs text-sidebar-foreground/60'>File</p>
				{file ? (
					<>
						<p className='font-display text-xl leading-tight font-semibold tracking-wide break-words'>
							{file.name}
						</p>
						<p className='tabular text-sm text-sidebar-foreground/60'>
							{(file.size / 1024).toFixed(1)} KB
						</p>
					</>
				) : (
					<>
						<span
							aria-hidden
							className='mt-1.5 block h-3 w-2/3 rounded-sm border border-dashed border-sidebar-border'
						/>
						<span className='sr-only'>Chưa chọn file</span>
					</>
				)}
			</div>

			<dl className='grid grid-cols-2 gap-x-4 gap-y-3 border-t border-sidebar-border pt-5'>
				<div className='col-span-2'>
					<Figure
						label='Số dòng dữ liệu'
						value={loaded ? total : undefined}
					/>
				</div>
				<Figure
					label='Hợp lệ'
					value={loaded ? validCount : undefined}
					className='text-gold'
				/>
				<Figure
					label='Có lỗi'
					value={loaded ? invalidCount : undefined}
					className={invalidCount > 0 ? 'text-red-300' : ''}
				/>
			</dl>

			{stamped && (
				<div className='absolute inset-0 grid place-items-center bg-sidebar/70'>
					<ApprovedStamp
						label='Đã import'
						ariaLabel='Đã import xong'
						className='size-44'
					/>
				</div>
			)}
		</aside>
	)
}
