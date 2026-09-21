import * as Tabs from '@radix-ui/react-tabs'
import type { ComponentType, ElementType } from 'react'
import { Award, GraduationCap, Shield, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Student } from '@/types'
import { StudentEditHeader } from './student-edit/StudentEditHeader'
import {
	EducationTab,
	FamilyTab,
	HistoryTab,
	MilitaryTab,
	PersonalTab
} from './student-edit/tabs'
import type { StudentEditTabProps } from './student-edit/types'
import { useStudentEditForm } from './student-edit/useStudentEditForm'

const TABS: Array<{
	value: string
	label: string
	icon: ElementType<{ className?: string }>
	Content: ComponentType<StudentEditTabProps>
}> = [
	{
		value: 'personal',
		label: 'Thông tin cá nhân',
		icon: User,
		Content: PersonalTab
	},
	{
		value: 'military',
		label: 'Quân sự & Chính trị',
		icon: Shield,
		Content: MilitaryTab
	},
	{
		value: 'education',
		label: 'Học vấn & Kỹ năng',
		icon: GraduationCap,
		Content: EducationTab
	},
	{ value: 'family', label: 'Gia đình', icon: Users, Content: FamilyTab },
	{
		value: 'history',
		label: 'Lịch sử & Khác',
		icon: Award,
		Content: HistoryTab
	}
]

interface StudentEditFormProps {
	student: Student
	onClose?: () => void
}

export default function StudentEditForm({
	student,
	onClose
}: StudentEditFormProps) {
	const { form, isPending } = useStudentEditForm(student, onClose)

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				form.handleSubmit()
			}}
			className='w-full'
		>
			<Card>
				<StudentEditHeader form={form} student={student} />

				<CardContent>
					<Tabs.Root defaultValue={TABS[0].value} className='w-full'>
						<Tabs.List className='flex border-b mb-4 space-x-4 px-2 overflow-x-auto'>
							{TABS.map(({ value, label, icon: Icon }) => (
								<Tabs.Trigger
									key={value}
									value={value}
									className='pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary whitespace-nowrap'
								>
									<Icon className='h-4 w-4 inline mr-1' />
									{label}
								</Tabs.Trigger>
							))}
						</Tabs.List>

						{/* forceMount: giữ field của mọi tab luôn được mount để lỗi hiển thị đúng chỗ */}
						{TABS.map(({ value, Content }) => (
							<Tabs.Content key={value} value={value} forceMount>
								<Content form={form} />
							</Tabs.Content>
						))}
					</Tabs.Root>

					<div className='flex justify-end mt-6 gap-2'>
						<Button
							type='button'
							variant='outline'
							onClick={onClose}
						>
							Hủy
						</Button>
						<Button type='submit' disabled={isPending}>
							{isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</form>
	)
}
