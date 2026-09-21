import * as Tabs from '@radix-ui/react-tabs'
import type { ComponentType } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { Student } from '@/types'
import { ProfileActions } from './ProfileActions'
import { ProfileHeader } from './ProfileHeader'
import { PROFILE_TABS } from './profile-tabs'
import { ProfileTabList } from './ProfileTabList'
import {
	EducationTab,
	FamilyTab,
	HistoryTab,
	MilitaryTab,
	PersonalTab,
	type ProfileTabProps
} from './tabs'
import { studentClassLabel } from './utils'

const TAB_CONTENT: Record<
	(typeof PROFILE_TABS)[number]['value'],
	ComponentType<ProfileTabProps>
> = {
	personal: PersonalTab,
	military: MilitaryTab,
	education: EducationTab,
	family: FamilyTab,
	history: HistoryTab
}

/** Hồ sơ học viên chỉ đọc: đầu hồ sơ + năm nhóm thông tin */
export function StudentProfile({ student }: { student: Student }) {
	const classLabel = studentClassLabel(student)

	return (
		<>
			<Card className='mb-4 gap-0 overflow-hidden py-0'>
				<ProfileHeader
					student={student}
					classLabel={classLabel}
					actions={<ProfileActions student={student} />}
				/>
			</Card>

			<Tabs.Root defaultValue={PROFILE_TABS[0].value} className='w-full'>
				<ProfileTabList />
				{PROFILE_TABS.map(({ value }) => {
					const Content = TAB_CONTENT[value]
					return (
						<Tabs.Content key={value} value={value}>
							<Card>
								<CardContent className='space-y-6 pt-6'>
									<Content
										student={student}
										classLabel={classLabel}
									/>
								</CardContent>
							</Card>
						</Tabs.Content>
					)
				})}
			</Tabs.Root>
		</>
	)
}
