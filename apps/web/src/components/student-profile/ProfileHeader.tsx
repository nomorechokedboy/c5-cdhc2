import type { ReactNode } from 'react'
import type { Student } from '@/types'
import { ApprovedStamp } from './approved-stamp'
import { DogTag } from './dog-tag'
import { studentAvatarSrc } from './utils'

interface ProfileHeaderProps {
	student: Student
	classLabel?: string
	/** Thay ảnh mặc định (màn sửa cho đổi ảnh ngay trên thẻ) */
	avatar?: ReactNode
	/** Nút thao tác đặt cuối cột phải */
	actions?: ReactNode
}

/**
 * Đầu hồ sơ: cột trái tối có ảnh và thẻ bài, cột phải có tên, bốn thông tin nhanh
 * và thao tác. Hồ sơ đã xác nhận có dấu đỏ đóng ở góc phải.
 */
export function ProfileHeader({
	student,
	classLabel,
	avatar,
	actions
}: ProfileHeaderProps) {
	const quickFacts = [
		{ label: 'Cấp bậc', value: student.rank },
		{ label: 'Chức vụ', value: student.position },
		{ label: 'Lớp', value: classLabel ?? 'Chưa có lớp' },
		{ label: 'Nhập ngũ', value: student.enlistmentPeriod }
	]

	return (
		<div className='grid lg:grid-cols-[15rem_1fr]'>
			<aside className='flex flex-col items-center gap-5 bg-sidebar p-6'>
				<div className='size-36 shrink-0 overflow-hidden rounded-lg bg-sidebar-accent ring-2 ring-gold'>
					{avatar ?? (
						<img
							src={studentAvatarSrc(student)}
							alt={student.fullName}
							className='size-full object-cover'
						/>
					)}
				</div>
				<DogTag studentId={student.studentId} rank={student.rank} />
			</aside>

			<div className='relative flex min-w-0 flex-col gap-5 p-6'>
				{student.status === 'confirmed' && (
					<ApprovedStamp className='absolute top-3 right-4 hidden sm:grid' />
				)}
				<div className='sm:pr-36'>
					<h2 className='font-display text-3xl font-semibold tracking-wide'>
						{student.fullName}
					</h2>
					{student.status === 'pending' && (
						<p className='mt-1 inline-flex items-center rounded-full border border-gold bg-gold/15 px-3 py-0.5 text-sm font-medium'>
							Chờ xác nhận
						</p>
					)}
				</div>

				<dl className='grid grid-cols-2 gap-x-6 gap-y-3 border-y py-4 lg:grid-cols-4'>
					{quickFacts.map(({ label, value }) => (
						<div key={label}>
							<dt className='text-xs text-muted-foreground'>
								{label}
							</dt>
							<dd className='font-semibold'>{value || '-'}</dd>
						</div>
					))}
				</dl>

				{actions}
			</div>
		</div>
	)
}
