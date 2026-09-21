import * as Tabs from '@radix-ui/react-tabs'
import { Card, CardContent } from '@/components/ui/card'
import type { Student } from '@/types'
import { EditFooter } from './student-edit/EditFooter'
import { EDIT_TAB_CONTENT } from './student-edit/tabs/content'
import { useEditTabs } from './student-edit/useEditTabs'
import { useStudentEditForm } from './student-edit/useStudentEditForm'
import { ProfileHeader } from './student-profile/ProfileHeader'
import {
	PROFILE_TABS,
	type ProfileTabValue
} from './student-profile/profile-tabs'
import { ProfileTabList } from './student-profile/ProfileTabList'
import { studentAvatarSrc, studentClassLabel } from './student-profile/utils'

interface StudentEditFormProps {
	student: Student
	onClose?: () => void
}

/** Form sửa học viên: cùng đầu hồ sơ với màn xem, ảnh đổi được ngay trên thẻ */
export default function StudentEditForm({
	student,
	onClose
}: StudentEditFormProps) {
	const { form, isPending } = useStudentEditForm(student, onClose)
	const { active, setActive, errorTabs } = useEditTabs(form)

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				form.handleSubmit()
			}}
			className='flex w-full flex-col gap-4'
		>
			<Card className='gap-0 overflow-hidden py-0'>
				<ProfileHeader
					student={student}
					classLabel={studentClassLabel(student)}
					actions={
						<p className='mt-auto text-sm text-muted-foreground'>
							Bấm vào ảnh để đổi ảnh đại diện. Thay đổi chỉ được
							lưu khi bạn bấm «Lưu thay đổi».
						</p>
					}
					avatar={
						<form.AppField name='avatarFile'>
							{(field: any) => (
								<field.AvatarField
									alt={student.fullName}
									className='size-36 rounded-lg'
									src={studentAvatarSrc(student)}
								/>
							)}
						</form.AppField>
					}
				/>
			</Card>

			<Tabs.Root
				value={active}
				onValueChange={(v) => setActive(v as ProfileTabValue)}
				className='w-full'
			>
				<ProfileTabList errorTabs={errorTabs} />

				{/* forceMount: giữ field của mọi tab luôn được mount để lỗi hiển thị đúng chỗ;
				    Radix không tự ẩn tab đang tắt khi forceMount nên phải ẩn bằng class */}
				{PROFILE_TABS.map(({ value }) => {
					const Content = EDIT_TAB_CONTENT[value]
					return (
						<Tabs.Content
							key={value}
							value={value}
							forceMount
							className='data-[state=inactive]:hidden'
						>
							<Card>
								<CardContent className='space-y-6 pt-6'>
									<Content form={form} />
								</CardContent>
							</Card>
						</Tabs.Content>
					)
				})}
			</Tabs.Root>

			<EditFooter
				isPending={isPending}
				errorTabs={errorTabs}
				onCancel={onClose}
			/>
		</form>
	)
}
