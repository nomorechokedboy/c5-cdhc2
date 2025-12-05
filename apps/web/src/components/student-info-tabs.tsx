import { useState, useMemo } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import StudentEditForm from './StudentEditForm'
import type { Student } from '@/types'
import { politicalOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import { getMediaUri, isSuperAdmin } from '@/lib/utils'
import {
	FileDown,
	UserPen,
	CheckCircle,
	User,
	Shield,
	GraduationCap,
	Users,
	Award,
	Phone,
	FileText
} from 'lucide-react'
import { ExportStudentDataDialog } from './export-student-data-dialog'
import useUpdateStudent from '@/hooks/useUpdateStudent'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

interface StudentInfoTabsProps {
	student: Student
}

export default function StudentInfoTabs({ student }: StudentInfoTabsProps) {
	const [open, setOpen] = useState(false)
	const queryClient = useQueryClient()
	const { mutateAsync: updateStudent, isPending: isUpdating } =
		useUpdateStudent()

	const { data: classes = [] } = useClassData()
	// options cho select lớp
	const classOptions = useMemo(
		() =>
			classes.map((c) => ({
				value: c.id.toString(),
				label: `${c.name} - ${c.unit.name}`
			})),
		[classes]
	)

	const handleConfirmStudent = async () => {
		const confirmed = confirm(
			'Bạn có chắc chắn muốn xác nhận thông tin học viên này không? Bạn sẽ không thể chỉnh sửa thông tin học viên sau khi xác nhận.'
		)
		if (!confirmed) return

		try {
			await updateStudent({
				data: [
					{
						id: student.id,
						status: 'confirmed',
						classId: student.class?.id
					}
				]
			})
			toast.success('Xác nhận học viên thành công!')
			// Invalidate queries to refetch data
			queryClient.invalidateQueries({ queryKey: ['students'] })
			queryClient.invalidateQueries({
				queryKey: ['student', student.id]
			})
		} catch (error) {
			toast.error('Xác nhận học viên thất bại!')
			console.error(error)
		}
	}

	const canEdit = isSuperAdmin() || student.status !== 'confirmed'

	const Field = ({
		label,
		value,
		options
	}: {
		label: string
		value?: string | number | null
		options?: { label: string; value: string }[]
	}) => {
		const displayValue =
			options && value
				? options.find((opt) => opt.value === value.toString())
						?.label || '-'
				: value || '-'

		return (
			<div>
				<p className='text-xs font-medium text-gray-500'>{label}</p>
				<p>{displayValue}</p>
			</div>
		)
	}
	const avatarUri =
		student.avatar === undefined || student.avatar === ''
			? '/avt.jpg'
			: student.avatar

	return (
		<>
			{/* HEADER + NÚT SỬA */}
			<Card className='mb-4 border-l-4 '>
				<CardHeader className='flex flex-col lg:flex-row items-start gap-6 p-6 bg-gradient-to-r from-blue-50/50 to-transparent'>
					{/* Avatar Section */}
					<div className='relative group'>
						<div className='w-40 h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden shrink-0 ring-4 ring-white shadow-lg'>
							<img
								src={getMediaUri(avatarUri)}
								alt={student.fullName}
								className='object-cover w-full h-full transition-transform group-hover:scale-105'
							/>
						</div>
						{student.status === 'pending' && (
							<div className='absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md'>
								Chờ xác nhận
							</div>
						)}
						{student.status === 'confirmed' && (
							<div className='absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1'>
								<CheckCircle className='h-3 w-3' />
								Đã xác nhận
							</div>
						)}
					</div>

					{/* Info Section */}
					<div className='flex-1 min-w-0'>
						<div className='flex items-start justify-between gap-4 mb-4'>
							<div>
								<CardTitle className='text-2xl font-bold text-gray-900 mb-1'>
									{student.fullName}
								</CardTitle>
								<p className='text-sm text-gray-500'>
									Mã học viên:{' '}
									<span className='font-semibold text-gray-700'>
										{student.studentId || 'Chưa có'}
									</span>
								</p>
							</div>
						</div>

						<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
							<div className='flex items-center gap-2 text-sm'>
								<Shield className='h-4 w-4 text-green-600 shrink-0' />
								<div>
									<p className='text-xs text-gray-500'>
										Cấp bậc
									</p>
									<p className='font-semibold text-gray-900'>
										{student.rank || '-'}
									</p>
								</div>
							</div>

							<div className='flex items-center gap-2 text-sm'>
								<User className='h-4 w-4 text-blue-600 shrink-0' />
								<div>
									<p className='text-xs text-gray-500'>
										Chức vụ
									</p>
									<p className='font-semibold text-gray-900'>
										{student.position || '-'}
									</p>
								</div>
							</div>

							<div className='flex items-center gap-2 text-sm'>
								<Users className='h-4 w-4 text-purple-600 shrink-0' />
								<div>
									<p className='text-xs text-gray-500'>Lớp</p>
									<p className='font-semibold text-gray-900'>
										{classOptions.find(
											(c) =>
												c.value ===
												student?.class?.id.toString()
										)?.label || 'Chưa có lớp'}
									</p>
								</div>
							</div>

							<div className='flex items-center gap-2 text-sm'>
								<svg
									className='h-4 w-4 text-amber-600 shrink-0'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
									/>
								</svg>
								<div>
									<p className='text-xs text-gray-500'>
										Nhập ngũ
									</p>
									<p className='font-semibold text-gray-900'>
										{student.enlistmentPeriod || '-'}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					<div className='flex flex-row lg:flex-col gap-2 w-full lg:w-auto'>
						<ExportStudentDataDialog
							data={[student as any]}
							defaultFilename={`Phiếu-học-viên-${student.fullName?.replace(' ', '_')}`}
							defaultValues={{
								underUnitName: 'TRƯỜNG CAO ĐẲNG HẬU CẦN 2',
								unitName: '	TỔNG CỤC HẬU CẦN – KỸ THUẬT'
							}}
							templType='StudentEnrollmentFormTempl'
							id='ExportStudentEnrollmentFormDialog'
						>
							<Button
								className='flex-1 lg:w-full whitespace-nowrap'
								size='sm'
							>
								<FileDown className='mr-2 h-4 w-4' /> Tải phiếu
							</Button>
						</ExportStudentDataDialog>

						{student.status === 'pending' && (
							<Button
								onClick={handleConfirmStudent}
								disabled={isUpdating}
								variant='default'
								size='sm'
								className='bg-green-600 hover:bg-green-700 flex-1 lg:w-full whitespace-nowrap'
							>
								<CheckCircle className='mr-2 h-4 w-4' /> Xác
								nhận
							</Button>
						)}

						{canEdit && (
							<Dialog open={open} onOpenChange={setOpen}>
								<DialogTrigger asChild>
									<Button
										variant='outline'
										size='sm'
										className='flex-1 lg:w-full whitespace-nowrap'
									>
										<UserPen className='mr-2 h-4 w-4' />{' '}
										Chỉnh sửa
									</Button>
								</DialogTrigger>
								<DialogContent className='max-w-screen-lg w-full h-screen overflow-y-auto p-6'>
									<StudentEditForm
										student={student}
										onClose={() => setOpen(false)}
									/>
								</DialogContent>
							</Dialog>
						)}
					</div>
				</CardHeader>
			</Card>

			{/* TABS */}
			<Tabs.Root defaultValue='personal' className='w-full'>
				<Tabs.List className='flex border-b mb-4 space-x-4 px-2 overflow-x-auto'>
					<Tabs.Trigger
						value='personal'
						className='pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 whitespace-nowrap'
					>
						<User className='h-4 w-4 inline mr-1' />
						Thông tin cá nhân
					</Tabs.Trigger>

					<Tabs.Trigger
						value='military'
						className='pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 whitespace-nowrap'
					>
						<Shield className='h-4 w-4 inline mr-1' />
						Quân sự & Chính trị
					</Tabs.Trigger>

					<Tabs.Trigger
						value='education'
						className='pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 whitespace-nowrap'
					>
						<GraduationCap className='h-4 w-4 inline mr-1' />
						Học vấn & Kỹ năng
					</Tabs.Trigger>

					<Tabs.Trigger
						value='family'
						className='pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 whitespace-nowrap'
					>
						<Users className='h-4 w-4 inline mr-1' />
						Gia đình
					</Tabs.Trigger>

					<Tabs.Trigger
						value='history'
						className='pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 whitespace-nowrap'
					>
						<Award className='h-4 w-4 inline mr-1' />
						Lịch sử & Khác
					</Tabs.Trigger>
				</Tabs.List>

				{/* TAB THÔNG TIN CÁ NHÂN */}
				<Tabs.Content value='personal'>
					<Card>
						<CardContent className='space-y-6 pt-6'>
							<div className='border-l-4 border-blue-500 pl-4 py-2 bg-blue-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<User className='h-4 w-4' />
									Thông tin cá nhân
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm'>
									<Field
										label='Họ và tên'
										value={student.fullName}
									/>
									<Field
										label='Mã học viên'
										value={student.studentId}
									/>
									<Field
										label='Ngày sinh'
										value={student.dob}
									/>
									<Field
										label='Nơi sinh'
										value={student.birthPlace}
									/>
									<Field
										label='Dân tộc'
										value={student.ethnic}
									/>
									<Field
										label='Tôn giáo'
										value={student.religion}
									/>
									<Field
										label='Địa chỉ'
										value={student.address}
									/>
									<Field
										label='Số điện thoại'
										value={student.phone}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</Tabs.Content>

				{/* TAB QUÂN SỰ & CHÍNH TRỊ */}
				<Tabs.Content value='military'>
					<Card>
						<CardContent className='space-y-6 pt-6'>
							<div className='border-l-4 border-green-500 pl-4 py-2 bg-green-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<Shield className='h-4 w-4' />
									Quân sự
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
									<Field
										label='Cấp bậc'
										value={student.rank}
									/>
									<Field
										label='Chức vụ'
										value={student.position}
									/>
									<Field
										label='Đơn vị (Lớp)'
										value={
											classOptions.find(
												(c) =>
													c.value ===
													student?.class?.id.toString()
											)?.label
										}
									/>
									<Field
										label='Ngày nhập ngũ'
										value={student.enlistmentPeriod}
									/>
									<Field
										label='Đơn vị trước khi nhập học'
										value={student.previousUnit}
									/>
									<Field
										label='Chức vụ trước khi nhập học'
										value={student.previousPosition}
									/>
								</div>
							</div>

							<div className='border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<svg
										className='h-4 w-4'
										fill='currentColor'
										viewBox='0 0 20 20'
									>
										<path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
									</svg>
									Chính trị
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
									<Field
										label='Tổ chức'
										value={student.politicalOrg}
										options={politicalOptions}
									/>
									<Field
										label='Ngày vào Đoàn/Đảng'
										value={student.politicalOrgOfficialDate}
									/>
									<Field
										label='Ngày chính thức'
										value={student.cpvOfficialAt}
									/>
									<Field
										label='Số thẻ Đảng'
										value={student.cpvId}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</Tabs.Content>

				{/* TAB GIA ĐÌNH */}
				<Tabs.Content value='family'>
					<Card>
						<CardContent className='space-y-6 pt-6'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div className='border-l-4 border-purple-500 pl-4 py-2 bg-purple-50/30 rounded-r'>
									<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
										<Users className='h-4 w-4' />
										Cha
									</h3>
									<div className='grid grid-cols-1 gap-4 text-sm'>
										<Field
											label='Họ tên'
											value={student.fatherName}
										/>
										<Field
											label='Ngày sinh'
											value={student.fatherDob}
										/>
										<Field
											label='Nghề nghiệp'
											value={student.fatherJob}
										/>
										<Field
											label='Số điện thoại'
											value={student.fatherPhoneNumber}
										/>
									</div>
								</div>
								<div className='border-l-4 border-pink-500 pl-4 py-2 bg-pink-50/30 rounded-r'>
									<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
										<Users className='h-4 w-4' />
										Mẹ
									</h3>
									<div className='grid grid-cols-1 gap-4 text-sm'>
										<Field
											label='Họ tên'
											value={student.motherName}
										/>
										<Field
											label='Ngày sinh'
											value={student.motherDob}
										/>
										<Field
											label='Nghề nghiệp'
											value={student.motherJob}
										/>
										<Field
											label='Số điện thoại'
											value={student.motherPhoneNumber}
										/>
									</div>
								</div>
							</div>

							<div className='border-l-4 border-orange-500 pl-4 py-2 bg-orange-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<svg
										className='h-4 w-4'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
										/>
									</svg>
									Hôn nhân
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
									<Field
										label='Tình trạng'
										value={
											student.isMarried
												? 'Đã kết hôn'
												: 'Độc thân'
										}
									/>
									{student.isMarried && (
										<>
											<Field
												label='Họ tên Vợ/Chồng'
												value={student.spouseName}
											/>
											<Field
												label='Ngày sinh'
												value={student.spouseDob}
											/>
											<Field
												label='Nghề nghiệp'
												value={student.spouseJob}
											/>
											<Field
												label='SĐT Vợ/Chồng'
												value={
													student.spousePhoneNumber
												}
											/>
										</>
									)}
								</div>
							</div>

							<div className='border-l-4 border-cyan-500 pl-4 py-2 bg-cyan-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<Users className='h-4 w-4' />
									Con ({student.childrenInfos?.length || 0})
								</h3>
								{student.childrenInfos &&
								student.childrenInfos.length > 0 ? (
									<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
										{student.childrenInfos.map(
											(child, idx) => (
												<div
													key={idx}
													className='border p-3 rounded bg-white'
												>
													<p className='font-medium'>
														Con {idx + 1}
													</p>
													<p>
														Họ tên: {child.fullName}
													</p>
													<p>
														Ngày sinh: {child.dob}
													</p>
												</div>
											)
										)}
									</div>
								) : (
									<div className='text-center py-6 text-gray-500 border-2 border-dashed rounded-md'>
										<Users className='h-8 w-8 mx-auto mb-2 opacity-50' />
										<p className='text-sm'>
											Chưa có thông tin con cái
										</p>
									</div>
								)}
							</div>

							<div className='border-l-4 border-teal-500 pl-4 py-2 bg-teal-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<Users className='h-4 w-4' />
									Anh chị em ruột (
									{student.siblings?.length || 0})
								</h3>
								{student.siblings &&
								student.siblings.length > 0 ? (
									<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
										{student.siblings.map(
											(sibling, idx) => (
												<div
													key={idx}
													className='border p-3 rounded bg-white'
												>
													<p className='font-medium'>
														Người {idx + 1}
													</p>
													<p>
														Họ tên:{' '}
														{sibling.fullName}
													</p>
													<p>
														Ngày sinh: {sibling.dob}
													</p>
												</div>
											)
										)}
									</div>
								) : (
									<div className='text-center py-6 text-gray-500 border-2 border-dashed rounded-md'>
										<Users className='h-8 w-8 mx-auto mb-2 opacity-50' />
										<p className='text-sm'>
											Chưa có thông tin anh chị em
										</p>
									</div>
								)}
							</div>

							<div className='border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<Users className='h-4 w-4' />
									Hoàn cảnh gia đình
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
									<Field
										label='Hoàn cảnh gia đình'
										value={student.familyBackground}
									/>
									<Field
										label='Số lượng thành viên'
										value={student.familySize}
									/>
									<Field
										label='Con thứ mấy'
										value={student.familyBirthOrder}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</Tabs.Content>

				{/* TAB HỌC VẤN & KỸ NĂNG */}
				<Tabs.Content value='education'>
					<Card>
						<CardContent className='space-y-6 pt-6'>
							<div className='border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<GraduationCap className='h-4 w-4' />
									Học vấn
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
									<Field
										label='Trường'
										value={student.schoolName}
									/>
									<Field
										label='Chuyên ngành'
										value={student.major}
									/>
									<Field
										label='Trình độ'
										value={student.educationLevel}
									/>
									<Field
										label='Đã tốt nghiệp'
										value={
											student.isGraduated ? 'Có' : 'Chưa'
										}
									/>
								</div>
							</div>

							<div className='border-l-4 border-emerald-500 pl-4 py-2 bg-emerald-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<Award className='h-4 w-4' />
									Kỹ năng & Chính sách
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
									<Field
										label='Sở trường'
										value={student.talent}
									/>
									<Field
										label='Sở đoản'
										value={student.shortcoming}
									/>
									<Field
										label='Đối tượng chính sách'
										value={student.policyBeneficiaryGroup}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</Tabs.Content>

				{/* TAB LỊCH SỬ & KHÁC */}
				<Tabs.Content value='history'>
					<Card>
						<CardContent className='space-y-6 pt-6'>
							<div className='border-l-4 border-amber-500 pl-4 py-2 bg-amber-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<Award className='h-4 w-4' />
									Lịch sử
								</h3>
								<div className='space-y-4 text-sm'>
									<Field
										label='Khen thưởng'
										value={student.achievement}
									/>
									<Field
										label='Kỷ luật'
										value={student.disciplinaryHistory}
									/>
								</div>
							</div>

							<div className='border-l-4 border-rose-500 pl-4 py-2 bg-rose-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<Phone className='h-4 w-4' />
									Người báo tin
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
									<Field
										label='Họ tên'
										value={student.contactPerson?.name}
									/>
									<Field
										label='Số điện thoại'
										value={
											student.contactPerson?.phoneNumber
										}
									/>
									<Field
										label='Địa chỉ'
										value={student.contactPerson?.address}
									/>
								</div>
							</div>

							<div className='border-l-4 border-slate-500 pl-4 py-2 bg-slate-50/30 rounded-r'>
								<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
									<FileText className='h-4 w-4' />
									Tài liệu
								</h3>
								<div className='text-sm'>
									<Field
										label='Hồ sơ đi kèm'
										value={student.relatedDocumentations}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</Tabs.Content>
			</Tabs.Root>
		</>
	)
}
