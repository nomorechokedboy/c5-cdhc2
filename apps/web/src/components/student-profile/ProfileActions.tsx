import { CheckCircle, FileDown, UserPen } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { isSuperAdmin } from '@/lib/utils'
import type { Student } from '@/types'
import { ExportStudentDataDialog } from '../export-student-data-dialog'
import StudentEditForm from '../StudentEditForm'
import { RECORD_DIALOG_CLASS, RECORD_TITLE_CLASS } from '../student-record'
import { ConfirmStudentDialog } from './ConfirmStudentDialog'
import { useConfirmStudent } from './useConfirmStudent'

/** Tải phiếu, xác nhận, chỉnh sửa; hồ sơ đã xác nhận chỉ super admin mới sửa được */
export function ProfileActions({ student }: { student: Student }) {
	const [editOpen, setEditOpen] = useState(false)
	const [confirmOpen, setConfirmOpen] = useState(false)
	const { confirm, isPending } = useConfirmStudent(student)

	const canEdit = isSuperAdmin() || student.status !== 'confirmed'

	const handleConfirm = async () => {
		if (await confirm()) setConfirmOpen(false)
	}

	return (
		<div className='flex flex-wrap justify-end gap-2'>
			<ExportStudentDataDialog
				data={[student as any]}
				defaultFilename={`Phiếu-học-viên-${student.fullName?.replace(' ', '_')}`}
				defaultValues={{
					underUnitName: 'TRƯỜNG CAO ĐẲNG HẬU CẦN 2',
					unitName: '\tTỔNG CỤC HẬU CẦN – KỸ THUẬT'
				}}
				templType='StudentEnrollmentFormTempl'
				id='ExportStudentEnrollmentFormDialog'
			>
				<Button className='whitespace-nowrap'>
					<FileDown /> Tải phiếu
				</Button>
			</ExportStudentDataDialog>

			{student.status === 'pending' && (
				<>
					<Button
						variant='secondary'
						className='whitespace-nowrap'
						onClick={() => setConfirmOpen(true)}
					>
						<CheckCircle /> Xác nhận
					</Button>
					<ConfirmStudentDialog
						open={confirmOpen}
						onOpenChange={setConfirmOpen}
						studentName={student.fullName}
						pending={isPending}
						onConfirm={handleConfirm}
					/>
				</>
			)}

			{canEdit && (
				<Dialog open={editOpen} onOpenChange={setEditOpen}>
					<DialogTrigger asChild>
						<Button variant='outline' className='whitespace-nowrap'>
							<UserPen /> Chỉnh sửa
						</Button>
					</DialogTrigger>
					<DialogContent className={RECORD_DIALOG_CLASS}>
						<StudentEditForm
							student={student}
							heading={
								<DialogTitle className={RECORD_TITLE_CLASS}>
									Sửa thông tin học viên
								</DialogTitle>
							}
							onClose={() => setEditOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			)}
		</div>
	)
}
