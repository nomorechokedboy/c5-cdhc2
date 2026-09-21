import { politicalOptions, rankOptions } from '@/data/ethnics'
import { StudentField } from '@/components/student-fields'
import type { StudentStepProps } from '../types'
import { StepBody, StepGrid } from './layout'

export function MilitaryStep({ form }: StudentStepProps) {
	const f = { form, compact: true } as const

	return (
		<StepBody>
			<StepGrid>
				<StudentField
					{...f}
					type='select'
					name='rank'
					label='Cấp bậc'
					placeholder='Chọn cấp bậc'
					options={rankOptions}
				/>
				<StudentField
					{...f}
					type='date'
					name='enlistmentPeriod'
					label='Ngày nhập ngũ'
				/>
				<StudentField
					{...f}
					name='policyBeneficiaryGroup'
					label='Diện chính sách'
				/>
				<StudentField
					{...f}
					name='relatedDocumentations'
					label='Hồ sơ nộp tại đơn vị mới'
				/>
			</StepGrid>

			<StepGrid>
				<StudentField {...f} name='previousUnit' label='Đơn vị cũ' />
				<StudentField
					{...f}
					name='previousPosition'
					label='Chức vụ công tác tại đơn vị cũ'
				/>
			</StepGrid>

			<StepGrid>
				<StudentField
					{...f}
					type='select'
					name='politicalOrg'
					label='Đoàn/Đảng'
					options={politicalOptions}
				/>
				<StudentField
					{...f}
					type='date'
					name='politicalOrgOfficialDate'
					label='Ngày vào Đoàn/Đảng'
				/>
			</StepGrid>

			<StepGrid>
				<StudentField {...f} name='cpvId' label='Số thẻ Đảng' />
			</StepGrid>

			<StepGrid cols={3}>
				<StudentField
					{...f}
					name='contactPerson.name'
					label='Khi cần báo tin cho'
				/>
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
			</StepGrid>

			<StepGrid cols={1}>
				<StudentField
					{...f}
					type='textarea'
					name='talent'
					label='Sở trường'
				/>
				<StudentField
					{...f}
					type='textarea'
					name='shortcoming'
					label='Sở đoản'
				/>
				<StudentField
					{...f}
					type='textarea'
					name='achievement'
					label='Thành tích'
				/>
				<StudentField
					{...f}
					type='textarea'
					name='disciplinaryHistory'
					label='Kỷ luật'
				/>
			</StepGrid>
		</StepBody>
	)
}
