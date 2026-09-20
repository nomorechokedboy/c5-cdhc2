import type { ComponentType } from 'react'
import {
	familyInfoSchema,
	militaryInfoSchema,
	parentInfoSchema,
	personalInfoSchema
} from './schema'
import {
	FamilyStep,
	MilitaryStep,
	ParentStep,
	PersonalStep
} from './steps/index'
import type { StudentStepProps } from './types'

/** Các bước của biểu mẫu thêm học viên: schema kiểm tra + nội dung của từng bước */
export const STUDENT_STEPS: Array<{
	id: string
	title: string
	schema: { safeParse: (value: unknown) => any }
	Content: ComponentType<StudentStepProps>
}> = [
	{
		id: 'personal',
		title: 'Thông tin cá nhân',
		schema: personalInfoSchema,
		Content: PersonalStep
	},
	{
		id: 'military',
		title: 'Thông tin khác',
		schema: militaryInfoSchema,
		Content: MilitaryStep
	},
	{
		id: 'parent',
		title: 'Thông tin bố mẹ',
		schema: parentInfoSchema,
		Content: ParentStep
	},
	{
		id: 'family',
		title: 'Thông tin vợ/chồng và con',
		schema: familyInfoSchema,
		Content: FamilyStep
	}
]
