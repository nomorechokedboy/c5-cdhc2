import { useStore } from '@tanstack/react-form'
import useUnitOptions from '@/hooks/useUnitOptions'
import type { Student } from '@/types'
import { profileFacts } from '../student-profile/profile-facts'
import { PendingBadge, ProfileStamp } from '../student-profile/ProfileStamp'
import { studentAvatarSrc, studentClassLabel } from '../student-profile/utils'
import { RecordCard } from '../student-record/RecordCard'
import { recordFromValues } from '../student-record/record'
import type { StudentEditFormApi } from './types'

/**
 * Thẻ hồ sơ của form sửa: đọc từ giá trị đang sửa nên đổi tên, mã, cấp bậc, lớp
 * là thẻ đổi theo. Ảnh đổi được ngay trên thẻ; hồ sơ đã xác nhận giữ dấu đỏ.
 */
export function LiveEditCard({
	form,
	student
}: {
	form: StudentEditFormApi
	student: Student
}) {
	const values = useStore(form.store, (s: any) => s.values)
	const { options } = useUnitOptions('class')
	const record = recordFromValues(values)
	// Chưa đổi lớp thì dùng nhãn đầy đủ «Lớp - Đại đội» của hồ sơ; đổi rồi thì lấy theo danh sách lớp
	const unchanged = record.unitId === (student.unit?.id ?? student.unitId)
	const unitLabel = unchanged
		? studentClassLabel(student)
		: options.find((o) => o.value === String(record.unitId ?? ''))?.label

	return (
		<RecordCard
			record={record}
			unitLabel={unitLabel}
			facts={profileFacts(values)}
			empty='dash'
			mobile='compact'
			photoSlot={
				<form.AppField name='avatarFile'>
					{(field: any) => (
						<field.AvatarField
							alt={student.fullName}
							className='size-36 rounded-lg'
							src={studentAvatarSrc(student)}
						/>
					)}
				</form.AppField>
			}
			badge={<PendingBadge status={student.status} />}
			footer={
				<div className='space-y-3'>
					<ProfileStamp status={student.status} />
					<p className='text-xs text-sidebar-foreground/60'>
						Bấm vào ảnh để đổi ảnh đại diện.
					</p>
				</div>
			}
		/>
	)
}
