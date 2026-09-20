import { Award, GraduationCap } from 'lucide-react'
import { eduLevelOptions } from '@/data/ethnics'
import { FormSection, StudentField } from '@/components/student-fields'
import type { StudentEditTabProps } from '../types'

export function EducationTab({ form }: StudentEditTabProps) {
	const f = { form, compact: true } as const

	return (
		<div className='space-y-6'>
			<FormSection title='Học vấn' icon={GraduationCap} accent='yellow'>
				<StudentField {...f} name='schoolName' label='Trường' />
				<StudentField {...f} name='major' label='Chuyên ngành' />
				<StudentField
					{...f}
					type='select'
					name='educationLevel'
					label='Trình độ'
					options={eduLevelOptions}
				/>
				<StudentField
					{...f}
					type='checkbox'
					name='isGraduated'
					label='Đã tốt nghiệp'
				/>
			</FormSection>

			<FormSection
				title='Kỹ năng & Chính sách'
				icon={Award}
				accent='emerald'
			>
				<StudentField {...f} name='talent' label='Sở trường' />
				<StudentField {...f} name='shortcoming' label='Sở đoản' />
				<StudentField
					{...f}
					name='policyBeneficiaryGroup'
					label='Đối tượng chính sách'
				/>
			</FormSection>
		</div>
	)
}
