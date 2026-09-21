import { Award, FileText, Phone } from 'lucide-react'
import { FormSection } from '@/components/student-fields'
import { ProfileFields } from '../ProfileFields'
import type { ProfileTabProps } from './types'

export function HistoryTab({ student }: ProfileTabProps) {
	const contact = student.contactPerson
	return (
		<>
			<FormSection title='Lịch sử' icon={Award} columns={1}>
				<ProfileFields
					items={[
						{ label: 'Khen thưởng', value: student.achievement },
						{ label: 'Kỷ luật', value: student.disciplinaryHistory }
					]}
				/>
			</FormSection>

			<FormSection title='Người báo tin' icon={Phone}>
				<ProfileFields
					items={[
						{ label: 'Họ tên', value: contact?.name },
						{ label: 'Số điện thoại', value: contact?.phoneNumber },
						{ label: 'Địa chỉ', value: contact?.address }
					]}
				/>
			</FormSection>

			<FormSection title='Tài liệu' icon={FileText} columns={1}>
				<ProfileFields
					items={[
						{
							label: 'Hồ sơ đi kèm',
							value: student.relatedDocumentations
						}
					]}
				/>
			</FormSection>
		</>
	)
}
