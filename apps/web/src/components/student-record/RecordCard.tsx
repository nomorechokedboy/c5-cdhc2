import { User } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DogTag } from '../student-profile/dog-tag'
import type { RecordView } from './record'
import { useObjectUrl } from './useObjectUrl'

export interface RecordCardProps {
	record: RecordView
	/** «Lớp - Đại đội» đã ghép sẵn */
	unitLabel?: string
	/** Ảnh đã có sẵn (hồ sơ đã lưu) */
	photoUrl?: string
	/** Thay hẳn khung ảnh (form sửa cho đổi ảnh ngay trên thẻ) */
	photoSlot?: ReactNode
	/** Thông tin phụ dưới ngày sinh */
	facts?: ReadonlyArray<{ label: string; value?: string | null }>
	badge?: ReactNode
	footer?: ReactNode
	/** Phủ lên cả thẻ (dấu «Đã lập hồ sơ» lúc tạo xong) */
	overlay?: ReactNode
	/** Ô trống: vạch nét đứt (đang nhập) hoặc dấu «-» (hồ sơ đã có) */
	empty?: 'dashed' | 'dash'
	/** Dưới lg: ẩn hẳn (form thêm) hoặc thu thành một dòng (xem, sửa) */
	mobile?: 'hidden' | 'compact'
}

function Line({
	label,
	children,
	empty
}: {
	label: string
	children?: ReactNode
	empty: 'dashed' | 'dash'
}) {
	return (
		<div className='min-w-0'>
			<dt className='text-xs text-sidebar-foreground/60'>{label}</dt>
			<dd className='min-h-5 truncate'>
				{children ||
					(empty === 'dash' ? (
						<span className='text-sidebar-foreground/50'>-</span>
					) : (
						<>
							<span
								aria-hidden
								className='mt-1.5 block h-3 w-2/3 rounded-sm border border-dashed border-sidebar-border'
							/>
							<span className='sr-only'>Chưa nhập</span>
						</>
					))}
			</dd>
		</div>
	)
}

/**
 * Thẻ hồ sơ bên trái hộp thoại: ảnh, thẻ bài, họ tên, lớp, ngày sinh. Thuần trình
 * bày; ai dùng quyết định dữ liệu (đọc từ form đang nhập hay từ hồ sơ đã lưu).
 */
export function RecordCard({
	record,
	unitLabel,
	photoUrl,
	photoSlot,
	facts,
	badge,
	footer,
	overlay,
	empty = 'dashed',
	mobile = 'hidden'
}: RecordCardProps) {
	const previewUrl = useObjectUrl(record.photo)
	const src = previewUrl ?? photoUrl
	const compact = mobile === 'compact'

	return (
		<aside
			aria-label='Thẻ hồ sơ'
			className={cn(
				'relative overflow-hidden bg-sidebar text-sidebar-foreground',
				compact
					? 'flex items-center gap-4 p-4 lg:flex-col lg:items-stretch lg:gap-5 lg:p-6'
					: 'hidden flex-col gap-5 p-6 lg:flex'
			)}
		>
			<div
				className={cn(
					'mx-auto grid shrink-0 place-items-center overflow-hidden rounded-lg bg-sidebar-accent ring-2 ring-gold',
					compact ? 'mx-0 size-16 lg:mx-auto lg:size-36' : 'size-36'
				)}
			>
				{photoSlot ??
					(src ? (
						<img
							src={src}
							alt={record.fullName || 'Ảnh học viên'}
							className='size-full object-cover'
						/>
					) : (
						<User className='size-1/2 text-sidebar-foreground/40' />
					))}
			</div>

			<div className={cn(compact && 'max-lg:hidden')}>
				<DogTag studentId={record.studentId} rank={record.rank} />
			</div>

			<dl className='min-w-0 flex-1 space-y-3 lg:flex-none'>
				<div className='min-w-0'>
					<dt className='text-xs text-sidebar-foreground/60'>
						Họ và tên
					</dt>
					<dd
						className={cn(
							'font-display text-2xl leading-tight font-semibold tracking-wide',
							!record.fullName && 'text-sidebar-foreground/40'
						)}
					>
						{record.fullName ||
							(empty === 'dash' ? '-' : 'Chưa nhập')}
					</dd>
				</div>
				<Line label='Lớp' empty={empty}>
					{unitLabel}
				</Line>
				<Line label='Ngày sinh' empty={empty}>
					{record.dob}
				</Line>
				{facts?.map(({ label, value }) => (
					<div key={label} className='min-w-0 max-lg:hidden'>
						<Line label={label} empty='dash'>
							{value}
						</Line>
					</div>
				))}
			</dl>

			{badge}
			{footer && <div className='lg:mt-auto'>{footer}</div>}
			{overlay}
		</aside>
	)
}
