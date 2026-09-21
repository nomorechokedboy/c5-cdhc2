import { Award, FileText, Phone } from 'lucide-react'
import { FormSection, StudentField } from '@/components/student-fields'
import type { StudentEditTabProps } from '../types'

export function HistoryTab({ form }: StudentEditTabProps) {
	const f = { form, compact: true } as const

	return (
		<div className='space-y-6'>
			<FormSection title='Lịch sử' icon={Award} columns={1}>
				<StudentField {...f} name='achievement' label='Khen thưởng' />
				<StudentField
					{...f}
					name='disciplinaryHistory'
					label='Kỷ luật'
				/>
			</FormSection>

			<FormSection title='Người báo tin' icon={Phone}>
				<StudentField {...f} name='contactPerson.name' label='Họ tên' />
				<StudentField
					{...f}
					name='contactPerson.phoneNumber'
					label='Số điện thoại'
				/>
				<StudentField
					{...f}
					name='contactPerson.address'
					label='Địa chỉ'
				/>
			</FormSection>

			<FormSection title='Tài liệu' icon={FileText} columns={1}>
				<StudentField
					{...f}
					name='relatedDocumentations'
					label='Hồ sơ đi kèm'
				/>
			</FormSection>
		</div>
	)
}
