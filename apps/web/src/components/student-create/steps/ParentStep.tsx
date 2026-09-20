import { PersonListField, StudentField } from '@/components/student-fields'
import type { StudentStepProps } from '../types'
import { StepBody, StepGrid, StepGroup } from './layout'

export function ParentStep({ form }: StudentStepProps) {
	const f = { form } as const

	return (
		<StepBody>
			<StepGroup title='Thông tin chung về gia cảnh'>
				<StepGrid>
					<StudentField
						{...f}
						type='number'
						name='familySize'
						label='Số thành viên trong gia đình'
						min={0}
					/>
					<StudentField
						{...f}
						name='familyBirthOrder'
						label='Con thứ bao nhiêu'
					/>
				</StepGrid>
				<StepGrid cols={1}>
					<StudentField
						{...f}
						type='textarea'
						name='familyBackground'
						label='Sơ lược hoàn cảnh gia đình'
					/>
				</StepGrid>
			</StepGroup>

			<StepGroup title='Thông tin về cha'>
				<StepGrid>
					<StudentField {...f} name='fatherName' label='Tên cha' />
					<StudentField
						{...f}
						type='date'
						name='fatherDob'
						label='Ngày sinh của cha'
					/>
					<StudentField
						{...f}
						name='fatherJob'
						label='Nghề nghiệp cha'
					/>
					<StudentField
						{...f}
						name='fatherPhoneNumber'
						label='Số điện thoại cha'
					/>
				</StepGrid>
			</StepGroup>

			<StepGroup title='Thông tin về mẹ'>
				<StepGrid>
					<StudentField {...f} name='motherName' label='Tên mẹ' />
					<StudentField
						{...f}
						type='date'
						name='motherDob'
						label='Ngày sinh mẹ'
					/>
					<StudentField
						{...f}
						name='motherJob'
						label='Nghề nghiệp mẹ'
					/>
					<StudentField
						{...f}
						name='motherPhoneNumber'
						label='Số điện thoại mẹ'
					/>
				</StepGrid>
			</StepGroup>

			<PersonListField
				form={form}
				name='siblings'
				title='Anh chị em ruột'
				addLabel='Thêm thông tin anh/chị/em'
				emptyText='Chưa có thông tin anh chị em'
				accent='teal'
			/>
		</StepBody>
	)
}
