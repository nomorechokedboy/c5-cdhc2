import { Shield, Star } from 'lucide-react'
import { politicalOptions, rankOptions } from '@/data/ethnics'
import { FormSection, StudentField } from '@/components/student-fields'
import type { StudentEditTabProps } from '../types'

export function MilitaryTab({ form }: StudentEditTabProps) {
	const f = { form, compact: true } as const

	return (
		<div className='space-y-6'>
			<FormSection title='Quân sự' icon={Shield} accent='green'>
				<StudentField
					{...f}
					type='select'
					name='rank'
					label='Cấp bậc'
					options={rankOptions}
				/>
				<StudentField {...f} name='position' label='Chức vụ' />
				<StudentField {...f} type='unit' name='unitId' label='Lớp' />
				<StudentField
					{...f}
					type='date'
					name='enlistmentPeriod'
					label='Ngày nhập ngũ'
				/>
				<StudentField
					{...f}
					name='previousUnit'
					label='Đơn vị trước khi nhập học'
				/>
				<StudentField
					{...f}
					name='previousPosition'
					label='Chức vụ trước khi nhập học'
				/>
			</FormSection>

			<FormSection title='Chính trị' icon={Star} accent='yellow'>
				<StudentField
					{...f}
					type='select'
					name='politicalOrg'
					label='Tổ chức'
					options={politicalOptions}
				/>
				<StudentField
					{...f}
					type='date'
					name='politicalOrgOfficialDate'
					label='Ngày vào Đoàn/Đảng'
				/>
				<StudentField
					{...f}
					type='date'
					name='cpvOfficialAt'
					label='Ngày chính thức'
				/>
				<StudentField {...f} name='cpvId' label='Số thẻ Đảng' />
			</FormSection>
		</div>
	)
}
