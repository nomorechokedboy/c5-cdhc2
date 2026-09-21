import { PersonListField, StudentField } from '@/components/student-fields'
import type { StudentStepProps } from '../types'
import { StepBody, StepGrid, StepGroup } from './layout'

export function FamilyStep({ form }: StudentStepProps) {
	const f = { form } as const

	return (
		<StepBody>
			<StepGroup title='Thông tin về vợ/chồng'>
				<StepGrid>
					<StudentField
						{...f}
						name='spouseName'
						label='Tên vợ/chồng'
					/>
					<StudentField
						{...f}
						type='date'
						name='spouseDob'
						label='Ngày sinh của vợ/chồng'
					/>
					<StudentField
						{...f}
						name='spousePhoneNumber'
						label='Số điện thoại vợ/chồng'
					/>
					<StudentField
						{...f}
						name='spouseJob'
						label='Nghề nghiệp vợ/chồng'
					/>
				</StepGrid>
			</StepGroup>

			<PersonListField
				form={form}
				name='childrenInfos'
				title='Con'
				addLabel='Thêm thông tin con cái'
				emptyText='Chưa có thông tin con cái'
			/>
		</StepBody>
	)
}
