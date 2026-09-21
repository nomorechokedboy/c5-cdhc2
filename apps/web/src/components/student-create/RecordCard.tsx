import { User } from 'lucide-react'
import type { ReactNode } from 'react'
import useUnitOptions from '@/hooks/useUnitOptions'
import { cn } from '@/lib/utils'
import { ApprovedStamp } from '../student-profile/approved-stamp'
import { DogTag } from '../student-profile/dog-tag'
import type { RecordView } from './record'
import { useObjectUrl } from './useObjectUrl'

interface RecordCardProps {
	record: RecordView
	/** Số phần đã hoàn thành / tổng số phần */
	done: number
	total: number
	/** Đóng dấu «Đã lập hồ sơ» lên thẻ */
	stamped?: boolean
}

function Line({ label, children }: { label: string; children?: ReactNode }) {
	return (
		<div className='min-w-0'>
			<dt className='text-xs text-sidebar-foreground/60'>{label}</dt>
			<dd className='min-h-5 truncate'>
				{children || (
					<>
						<span
							aria-hidden
							className='mt-1.5 block h-3 w-2/3 rounded-sm border border-dashed border-sidebar-border'
						/>
						<span className='sr-only'>Chưa nhập</span>
					</>
				)}
			</dd>
		</div>
	)
}

/**
 * Thẻ hồ sơ được dựng dần theo những gì người dùng nhập: ảnh, thẻ bài,
 * họ tên, lớp, ngày sinh. Ô nào chưa có hiện vạch nét đứt.
 */
export function RecordCard({ record, done, total, stamped }: RecordCardProps) {
	const photoUrl = useObjectUrl(record.photo)
	const { options } = useUnitOptions('class')
	const unitLabel = options.find(
		(o) => o.value === String(record.unitId ?? '')
	)?.label

	return (
		<aside
			aria-label='Thẻ hồ sơ đang lập'
			className='relative hidden flex-col gap-5 overflow-hidden bg-sidebar p-6 text-sidebar-foreground lg:flex'
		>
			<div className='mx-auto grid size-36 shrink-0 place-items-center overflow-hidden rounded-lg bg-sidebar-accent ring-2 ring-gold'>
				{photoUrl ? (
					<img
						src={photoUrl}
						alt='Ảnh học viên'
						className='size-full object-cover'
					/>
				) : (
					<User className='size-16 text-sidebar-foreground/40' />
				)}
			</div>

			<DogTag studentId={record.studentId} rank={record.rank} />

			<dl className='space-y-3'>
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
						{record.fullName || 'Chưa nhập'}
					</dd>
				</div>
				<Line label='Lớp'>{unitLabel}</Line>
				<Line label='Ngày sinh'>{record.dob}</Line>
			</dl>

			<p className='mt-auto text-sm text-sidebar-foreground/70'>
				<span className='tabular font-display text-lg font-semibold text-gold'>
					{done}/{total}
				</span>{' '}
				phần đã ghi
			</p>

			{stamped && (
				<div className='absolute inset-0 grid place-items-center bg-sidebar/70'>
					<ApprovedStamp
						label='Đã lập hồ sơ'
						ariaLabel='Hồ sơ đã lập'
						className='size-44'
					/>
				</div>
			)}
		</aside>
	)
}
