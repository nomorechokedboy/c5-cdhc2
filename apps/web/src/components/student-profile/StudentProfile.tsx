import { useState, type ComponentType, type ReactNode } from 'react'
import type { Student } from '@/types'
import {
	RECORD_TITLE_CLASS,
	RecordCard,
	RecordMain,
	SlideIn,
	recordFromStudent,
	useVisitedSteps
} from '../student-record'
import { ProfileActions } from './ProfileActions'
import { PendingBadge, ProfileStamp } from './ProfileStamp'
import { profileFacts } from './profile-facts'
import {
	PROFILE_STEPS,
	PROFILE_TABS,
	type ProfileTabValue
} from './profile-tabs'
import {
	EducationTab,
	FamilyTab,
	HistoryTab,
	MilitaryTab,
	PersonalTab,
	type ProfileTabProps
} from './tabs'
import { studentAvatarSrc, studentClassLabel } from './utils'

const TAB_CONTENT: Record<ProfileTabValue, ComponentType<ProfileTabProps>> = {
	personal: PersonalTab,
	military: MilitaryTab,
	education: EducationTab,
	family: FamilyTab,
	history: HistoryTab
}

/**
 * Hồ sơ học viên chỉ đọc, cùng khung với form thêm/sửa: thẻ hồ sơ bên trái
 * (có dấu «Đã xác nhận» khi đã xác nhận), năm nhóm thông tin trên giấy điện tim
 * bên phải, thao tác ở đáy. `heading` là tiêu đề của hộp thoại chứa nó.
 */
export function StudentProfile({
	student,
	heading
}: {
	student: Student
	heading?: ReactNode
}) {
	const [step, setStep] = useState(0)
	const visited = useVisitedSteps(step)
	const classLabel = studentClassLabel(student)
	const Content = TAB_CONTENT[PROFILE_TABS[step].value]

	return (
		<>
			<RecordCard
				record={recordFromStudent(student)}
				unitLabel={classLabel}
				photoUrl={studentAvatarSrc(student)}
				facts={profileFacts(student)}
				empty='dash'
				mobile='compact'
				badge={<PendingBadge status={student.status} />}
				footer={<ProfileStamp status={student.status} />}
			/>
			<RecordMain
				title={
					heading ?? (
						<h2 className={RECORD_TITLE_CLASS}>
							Thông tin học viên
						</h2>
					)
				}
				steps={PROFILE_STEPS}
				currentStep={step}
				completedSteps={visited}
				onStepClick={setStep}
				footer={<ProfileActions student={student} />}
			>
				{(direction) => (
					<SlideIn step={step} direction={direction}>
						<div className='space-y-6'>
							<Content
								student={student}
								classLabel={classLabel}
							/>
						</div>
					</SlideIn>
				)}
			</RecordMain>
		</>
	)
}
