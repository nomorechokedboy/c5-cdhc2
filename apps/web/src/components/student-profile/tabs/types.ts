import type { Student } from '@/types'

export interface ProfileTabProps {
	student: Student
	/** «Lớp - Đại đội» đã ghép sẵn */
	classLabel?: string
}
