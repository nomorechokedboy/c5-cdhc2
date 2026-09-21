import { Shield, Star } from 'lucide-react'
import { FormSection } from '@/components/student-fields'
import { politicalOptions } from '@/data/ethnics'
import { ProfileFields } from '../ProfileFields'
import type { ProfileTabProps } from './types'

export function MilitaryTab({ student, classLabel }: ProfileTabProps) {
	return (
		<>
			<FormSection title='Quân sự' icon={Shield}>
				<ProfileFields
					items={[
						{ label: 'Cấp bậc', value: student.rank },
						{ label: 'Chức vụ', value: student.position },
						{ label: 'Đơn vị (Lớp)', value: classLabel },
						{
							label: 'Ngày nhập ngũ',
							value: student.enlistmentPeriod
						},
						{
							label: 'Đơn vị trước khi nhập học',
							value: student.previousUnit
						},
						{
							label: 'Chức vụ trước khi nhập học',
							value: student.previousPosition
						}
					]}
				/>
			</FormSection>

			<FormSection title='Chính trị' icon={Star}>
				<ProfileFields
					items={[
						{
							label: 'Tổ chức',
							value: student.politicalOrg,
							options: politicalOptions
						},
						{
							label: 'Ngày vào Đoàn/Đảng',
							value: student.politicalOrgOfficialDate,
							date: true
						},
						{
							label: 'Ngày chính thức',
							value: student.cpvOfficialAt,
							date: true
						},
						{ label: 'Số thẻ Đảng', value: student.cpvId }
					]}
				/>
			</FormSection>
		</>
	)
}
