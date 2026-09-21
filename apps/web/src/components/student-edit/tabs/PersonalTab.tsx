import { User } from 'lucide-react'
import { EhtnicOptions, religionOptions } from '@/data/ethnics'
import { FormSection, StudentField } from '@/components/student-fields'
import type { StudentEditTabProps } from '../types'

export function PersonalTab({ form }: StudentEditTabProps) {
	const f = { form, compact: true } as const

	return (
		<FormSection title='Thông tin cá nhân' icon={User} columns={4}>
			<StudentField {...f} name='fullName' label='Họ và tên' />
			<StudentField {...f} name='studentId' label='Mã học viên' />
			<StudentField {...f} type='date' name='dob' label='Ngày sinh' />
			<StudentField {...f} name='birthPlace' label='Nơi sinh' />
			<StudentField
				{...f}
				type='select'
				name='ethnic'
				label='Dân tộc'
				options={EhtnicOptions}
			/>
			<StudentField
				{...f}
				type='select'
				name='religion'
				label='Tôn giáo'
				options={religionOptions}
			/>
			<StudentField {...f} name='address' label='Địa chỉ' />
			<StudentField {...f} name='phone' label='Số điện thoại' />
		</FormSection>
	)
}
