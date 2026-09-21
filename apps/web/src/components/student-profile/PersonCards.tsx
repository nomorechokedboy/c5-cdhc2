import { Users } from 'lucide-react'
import { toDisplayDate } from '@/lib/student-dates'
import type { ChildrenInfo } from '@/types'

interface PersonCardsProps {
	people?: ChildrenInfo[]
	/** «Con», «Người» → «Con 1», «Người 2» */
	noun: string
	emptyText: string
}

/** Danh sách người thân dạng thẻ (con, anh chị em); rỗng thì báo chưa có */
export function PersonCards({ people, noun, emptyText }: PersonCardsProps) {
	if (!people?.length) {
		return (
			<div className='col-span-full rounded-md border-2 border-dashed py-6 text-center text-muted-foreground'>
				<Users className='mx-auto mb-2 h-8 w-8 opacity-50' />
				<p className='text-sm'>{emptyText}</p>
			</div>
		)
	}
	return (
		<>
			{people.map((person, index) => (
				<div key={index} className='rounded border bg-card p-3'>
					<p className='font-medium'>
						{noun} {index + 1}
					</p>
					<p>Họ tên: {person.fullName}</p>
					<p>Ngày sinh: {toDisplayDate(person.dob) || '-'}</p>
				</div>
			))}
		</>
	)
}
