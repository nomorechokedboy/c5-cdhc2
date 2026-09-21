import { Award, GraduationCap, Shield, User, Users } from 'lucide-react'
import type { ElementType } from 'react'

/** Năm nhóm thông tin của hồ sơ học viên; xem và sửa dùng chung để hai màn khớp nhau */
export const PROFILE_TABS = [
	{ value: 'personal', label: 'Thông tin cá nhân', icon: User },
	{ value: 'military', label: 'Quân sự & Chính trị', icon: Shield },
	{ value: 'education', label: 'Học vấn & Kỹ năng', icon: GraduationCap },
	{ value: 'family', label: 'Gia đình', icon: Users },
	{ value: 'history', label: 'Lịch sử & Khác', icon: Award }
] as const satisfies ReadonlyArray<{
	value: string
	label: string
	icon: ElementType<{ className?: string }>
}>

export type ProfileTabValue = (typeof PROFILE_TABS)[number]['value']
