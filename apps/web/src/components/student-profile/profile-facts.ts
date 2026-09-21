import type { Student } from '@/types'

/** Thông tin phụ dưới ngày sinh trên thẻ hồ sơ */
export const profileFacts = (
	v: Pick<Student, 'position' | 'enlistmentPeriod'>
) => [
	{ label: 'Chức vụ', value: v.position },
	{ label: 'Nhập ngũ', value: v.enlistmentPeriod }
]
