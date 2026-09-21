import { CardHeader, CardTitle } from '@/components/ui/card'
import { getMediaUri } from '@/lib/utils'
import type { Student } from '@/types'
import type { StudentEditFormApi } from './types'

/** Ảnh đại diện (đổi được) + tóm tắt học viên */
export function StudentEditHeader({
	form,
	student
}: {
	form: StudentEditFormApi
	student: Student
}) {
	const avatarUri = student.avatar ? student.avatar : 'avt.jpg'
	const unit = student.unit
	const unitLabel = unit
		? [unit.name, unit.parent?.name].filter(Boolean).join(' - ')
		: 'Chưa có lớp'

	return (
		<CardHeader className='flex flex-col sm:flex-row items-center sm:items-start gap-4'>
			<form.AppField name='avatarFile'>
				{(field: any) => (
					<field.AvatarField
						alt={student.fullName}
						className='rounded-md'
						src={getMediaUri(avatarUri)}
						size='xl'
					/>
				)}
			</form.AppField>
			<div className='text-center sm:text-left'>
				<CardTitle className='text-xl'>{student.fullName}</CardTitle>
				<p className='text-muted-foreground'>
					Chức vụ: {student.position}
				</p>
				<p className='text-muted-foreground'>Cấp bậc: {student.rank}</p>
				<p className='text-muted-foreground'>Lớp: {unitLabel}</p>
			</div>
		</CardHeader>
	)
}
