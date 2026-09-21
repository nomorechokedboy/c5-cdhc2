import type { ComponentType } from 'react'
import type { ProfileTabValue } from '../../student-profile/profile-tabs'
import type { StudentEditTabProps } from '../types'
import { EducationTab } from './EducationTab'
import { FamilyTab } from './FamilyTab'
import { HistoryTab } from './HistoryTab'
import { MilitaryTab } from './MilitaryTab'
import { PersonalTab } from './PersonalTab'

/** Nội dung từng tab của form sửa, cùng khóa với tab của hồ sơ */
export const EDIT_TAB_CONTENT: Record<
	ProfileTabValue,
	ComponentType<StudentEditTabProps>
> = {
	personal: PersonalTab,
	military: MilitaryTab,
	education: EducationTab,
	family: FamilyTab,
	history: HistoryTab
}
