import { EhtnicOptions, eduLevelOptions, religionOptions } from '@/data/ethnics'
import { StudentField } from '@/components/student-fields'
import type { StudentStepProps } from '../types'
import { StepBody, StepGrid } from './layout'

export function PersonalStep({ form }: StudentStepProps) {
	const f = { form, compact: true } as const

	return (
		<StepBody>
			<StepGrid>
				<StudentField {...f} name='fullName' label='Họ và tên' />
				<form.AppField name='avatar'>
					{(field: any) => (
						<field.UploadField
							label='Ảnh học viên'
							compact
							accept='image/*'
							maxSize={10 * 1024 * 1024}
							dragDropSize='small'
							showBrowseButton={false}
						/>
					)}
				</form.AppField>
			</StepGrid>

			<StepGrid>
				<StudentField {...f} name='studentId' label='Mã số học viên' />
				<StudentField {...f} type='unit' name='unitId' label='Lớp' />
			</StepGrid>

			<StepGrid>
				<StudentField {...f} name='birthPlace' label='Quê quán' />
				<StudentField {...f} name='address' label='Trú quán' />
			</StepGrid>

			<StepGrid>
				<StudentField
					{...f}
					type='select'
					name='ethnic'
					label='Dân tộc'
					placeholder='Chọn dân tộc'
					options={EhtnicOptions}
				/>
				<StudentField
					{...f}
					type='select'
					name='religion'
					label='Tôn giáo'
					placeholder='Chọn tôn giáo'
					options={religionOptions}
				/>
			</StepGrid>

			<StepGrid cols={3}>
				<StudentField
					{...f}
					type='select'
					name='educationLevel'
					label='Trình độ học vấn'
					placeholder='Chọn trình độ học vấn'
					options={eduLevelOptions}
				/>
				<StudentField {...f} name='schoolName' label='Tên trường' />
				<StudentField {...f} name='major' label='Ngành' />
			</StepGrid>

			<StepGrid>
				<StudentField
					{...f}
					name='phone'
					label='Số điện thoại'
					placeholder='123-456-7890'
				/>
				<StudentField
					{...f}
					type='date'
					optional={false}
					name='dob'
					label='Ngày sinh'
				/>
			</StepGrid>
		</StepBody>
	)
}
