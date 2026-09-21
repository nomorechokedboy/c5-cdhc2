import { User } from 'lucide-react'
import { FormSection } from '@/components/student-fields'
import { ProfileFields } from '../ProfileFields'
import type { ProfileTabProps } from './types'

export function PersonalTab({ student }: ProfileTabProps) {
	return (
		<FormSection title='Thông tin cá nhân' icon={User} columns={4}>
			<ProfileFields
				items={[
					{ label: 'Họ và tên', value: student.fullName },
					{ label: 'Mã học viên', value: student.studentId },
					{ label: 'Ngày sinh', value: student.dob, date: true },
					{ label: 'Nơi sinh', value: student.birthPlace },
					{ label: 'Dân tộc', value: student.ethnic },
					{ label: 'Tôn giáo', value: student.religion },
					{ label: 'Địa chỉ', value: student.address },
					{ label: 'Số điện thoại', value: student.phone }
				]}
			/>
		</FormSection>
	)
}
