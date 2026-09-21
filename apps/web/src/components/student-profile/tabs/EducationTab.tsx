import { Award, GraduationCap } from 'lucide-react'
import { FormSection } from '@/components/student-fields'
import { ProfileFields } from '../ProfileFields'
import type { ProfileTabProps } from './types'

export function EducationTab({ student }: ProfileTabProps) {
	return (
		<>
			<FormSection title='Học vấn' icon={GraduationCap}>
				<ProfileFields
					items={[
						{ label: 'Trường', value: student.schoolName },
						{ label: 'Chuyên ngành', value: student.major },
						{ label: 'Trình độ', value: student.educationLevel },
						{
							label: 'Đã tốt nghiệp',
							value: student.isGraduated ? 'Có' : 'Chưa'
						}
					]}
				/>
			</FormSection>

			<FormSection title='Kỹ năng & Chính sách' icon={Award}>
				<ProfileFields
					items={[
						{ label: 'Sở trường', value: student.talent },
						{ label: 'Sở đoản', value: student.shortcoming },
						{
							label: 'Đối tượng chính sách',
							value: student.policyBeneficiaryGroup
						}
					]}
				/>
			</FormSection>
		</>
	)
}
