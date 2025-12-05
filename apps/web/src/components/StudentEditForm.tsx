import React, { useMemo, useState, useEffect } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Student, ChildrenInfo } from '@/types'
import usePatchStudentInfo from '@/hooks/usePatchStudentInfo'
// option cho dân tộc, tôn giáo, trình độ học vấn
import {
	EhtnicOptions,
	religionOptions,
	eduLevelOptions,
	politicalOptions,
	rankOptions
} from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import { getMediaUri } from '../lib/utils'
import { useAppForm } from '@/hooks/demo.form'
import { toast } from 'sonner'
import useUploadFiles from '@/hooks/useUploadFiles'
import {
	Plus,
	Trash2,
	User,
	Shield,
	GraduationCap,
	Users,
	Award,
	Phone,
	FileText
} from 'lucide-react'

interface StudentEditFormProps {
	student: Student
	onClose?: () => void
}

export default function StudentEditForm({
	student,
	onClose
}: StudentEditFormProps) {
	const { handlePatchStudentInfo, isPending } = usePatchStudentInfo(student)
	const { mutateAsync: uploadFilesMutate } = useUploadFiles()

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

	const form = useAppForm({
		defaultValues: {
			...student,
			politicalOrgOfficialDate: student.politicalOrgOfficialDate,
			enlistmentPeriod: student.enlistmentPeriod,
			rank: student.rank || 'Binh nhất',
			avatar: student.avatar || (null as File | null),
			relatedDocumentations: student.relatedDocumentations || '',
			studentId: student.studentId || '',
			classId: Number(student.classId),
			contactPerson: student.contactPerson || {
				name: '',
				phoneNumber: '',
				address: ''
			},
			siblings: student.siblings || []
		},
		onSubmit: async ({ value: { avatarFile, ...value } }) => {
			try {
				if (avatarFile !== null) {
					const formData = new FormData()
					formData.append('avatarImg', avatarFile)
					const resp = await uploadFilesMutate(formData)
					value.avatar = resp.uris[0]
				}

				if (typeof value.classId === 'string') {
					value.classId = Number(value.classId)
				}
				value.familySize = Number(value.familySize)
				await handlePatchStudentInfo({ ...value })
				if (onClose) onClose()
			} catch (err) {
				console.error('UpdateStudentInfo err: ', err)
				toast.error('Chỉnh sửa thông tin học viên không thành công!')
			}
		}
	})

	const [childrenInfos, setChildrenInfos] = useState<ChildrenInfo[]>(
		student.childrenInfos || []
	)
	const [siblings, setSiblings] = useState<ChildrenInfo[]>(
		student.siblings || []
	)

	// Khi submit form, nhớ set giá trị vào form
	useEffect(() => {
		form.setFieldValue('childrenInfos', childrenInfos)
	}, [childrenInfos])

	useEffect(() => {
		form.setFieldValue('siblings', siblings)
	}, [siblings])

	const addChild = () => {
		setChildrenInfos([...childrenInfos, { fullName: '', dob: '' }])
	}

	const removeChild = (index: number) => {
		setChildrenInfos(childrenInfos.filter((_, i) => i !== index))
	}

	const updateChild = (
		index: number,
		field: keyof ChildrenInfo,
		value: string
	) => {
		const updated = [...childrenInfos]
		updated[index][field] = value
		setChildrenInfos(updated)
	}

	const addSibling = () => {
		setSiblings([...siblings, { fullName: '', dob: '' }])
	}

	const removeSibling = (index: number) => {
		setSiblings(siblings.filter((_, i) => i !== index))
	}

	const updateSibling = (
		index: number,
		field: keyof ChildrenInfo,
		value: string
	) => {
		const updated = [...siblings]
		updated[index][field] = value
		setSiblings(updated)
	}

	const Field = <K extends keyof Student>({
		name,
		label,
		type = 'text',
		options
	}: {
		name: K | string
		label: string
		type?: string
		options?: { label: string; value: string }[]
	}) => (
		<form.Field
			name={name as any}
			children={(field) => (
				<div className='flex flex-col gap-1'>
					<Label>{label}</Label>

					{typeof field.state.value === 'boolean' ? (
						<Checkbox
							checked={field.state.value}
							onCheckedChange={(val) =>
								field.handleChange(Boolean(val))
							}
						/>
					) : options && options.length > 0 ? (
						<select
							className='border rounded px-2 py-1'
							value={field.state.value as string}
							onChange={(e) => field.handleChange(e.target.value)}
						>
							{options.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					) : (
						<Input
							type={type}
							value={field.state.value as string}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
					)}

					{field.state.meta.errors.length > 0 && (
						<span className='text-red-500 text-sm'>
							{field.state.meta.errors.join(', ')}
						</span>
					)}
				</div>
			)}
		/>
	)
	const avatarUri =
		student.avatar === undefined || student.avatar === ''
			? 'avt.jpg'
			: student.avatar

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				form.handleSubmit()
			}}
			className='w-full'
		>
			<Card>
				{/* Header cố định */}
				<CardHeader className='flex flex-col sm:flex-row items-center sm:items-start gap-4'>
					<form.AppField name='avatarFile'>
						{(field: any) => (
							<field.AvatarField
								alt={student.fullName}
								className='rounded-md'
								src={getMediaUri(avatarUri)}
								size='xl'
							/>
						)}
					</form.AppField>
					<div className='text-center sm:text-left'>
						<CardTitle className='text-xl'>
							{student.fullName}
						</CardTitle>
						<p className='text-gray-600'>
							Chức vụ: {student.position}
						</p>
						<p className='text-gray-600'>Cấp bậc: {student.rank}</p>
						<p className='text-gray-600'>
							Lớp:{' '}
							{classOptions.find(
								(c) => c.value === student.class?.id.toString()
							)?.label || 'Chưa có lớp'}
						</p>
					</div>
				</CardHeader>

				<CardContent>
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
							<div className='space-y-6'>
								<div className='border-l-4 border-blue-500 pl-4 py-2 bg-blue-50/30 rounded-r'>
									<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
										<User className='h-4 w-4' />
										Thông tin cá nhân
									</h3>
									<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm'>
										<Field
											name='fullName'
											label='Họ và tên'
										/>
										<Field
											name='studentId'
											label='Mã học viên'
										/>
										<Field name='dob' label='Ngày sinh' />
										<Field
											name='birthPlace'
											label='Nơi sinh'
										/>
										<Field
											name='ethnic'
											label='Dân tộc'
											options={EhtnicOptions}
										/>
										<Field
											name='religion'
											label='Tôn giáo'
											options={religionOptions}
										/>
										<Field name='address' label='Địa chỉ' />
										<Field
											name='phone'
											label='Số điện thoại'
										/>
									</div>
								</div>
							</div>
						</Tabs.Content>

						{/* TAB QUÂN SỰ & CHÍNH TRỊ */}
						<Tabs.Content value='military'>
							<div className='space-y-6'>
								<div className='border-l-4 border-green-500 pl-4 py-2 bg-green-50/30 rounded-r'>
									<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
										<Shield className='h-4 w-4' />
										Quân sự
									</h3>
									<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
										<Field
											name='rank'
											label='Cấp bậc'
											options={rankOptions}
										/>
										<Field
											name='position'
											label='Chức vụ'
										/>
										<Field
											name='classId'
											label='Lớp'
											options={classOptions}
										/>
										<Field
											name='enlistmentPeriod'
											label='Ngày nhập ngũ'
										/>
										<Field
											name='previousUnit'
											label='Đơn vị trước khi nhập học'
										/>
										<Field
											name='previousPosition'
											label='Chức vụ trước khi nhập học'
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
											name='politicalOrg'
											label='Tổ chức'
											options={politicalOptions}
										/>
										<Field
											name='politicalOrgOfficialDate'
											label='Ngày vào Đoàn/Đảng'
										/>
										<Field
											name='cpvOfficialAt'
											label='Ngày chính thức'
										/>
										<Field
											name='cpvId'
											label='Số thẻ Đảng'
										/>
									</div>
								</div>
							</div>
						</Tabs.Content>

						{/* TAB GIA ĐÌNH */}
						<Tabs.Content value='family'>
							<div className='space-y-6'>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
									<div className='border-l-4 border-purple-500 pl-4 py-2 bg-purple-50/30 rounded-r'>
										<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
											<Users className='h-4 w-4' />
											Cha
										</h3>
										<div className='grid grid-cols-1 gap-4 text-sm'>
											<Field
												name='fatherName'
												label='Họ tên'
											/>
											<Field
												name='fatherDob'
												label='Ngày sinh'
											/>
											<Field
												name='fatherJob'
												label='Nghề nghiệp'
											/>
											<Field
												name='fatherPhoneNumber'
												label='Số điện thoại'
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
												name='motherName'
												label='Họ tên'
											/>
											<Field
												name='motherDob'
												label='Ngày sinh'
											/>
											<Field
												name='motherJob'
												label='Nghề nghiệp'
											/>
											<Field
												name='motherPhoneNumber'
												label='Số điện thoại'
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
											name='isMarried'
											label='Đã kết hôn'
										/>
										{form.state.values.isMarried && (
											<>
												<Field
													name='spouseName'
													label='Họ tên Vợ/Chồng'
												/>
												<Field
													name='spouseDob'
													label='Ngày sinh'
												/>
												<Field
													name='spouseJob'
													label='Nghề nghiệp'
												/>
												<Field
													name='spousePhoneNumber'
													label='SĐT Vợ/Chồng'
												/>
											</>
										)}
									</div>
								</div>

								<div className='border-l-4 border-cyan-500 pl-4 py-2 bg-cyan-50/30 rounded-r'>
									<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
										<Users className='h-4 w-4' />
										Con ({childrenInfos.length})
									</h3>
									<div className='space-y-4'>
										{childrenInfos.length === 0 && (
											<div className='text-center py-6 text-gray-500 border-2 border-dashed rounded-md'>
												<Users className='h-8 w-8 mx-auto mb-2 opacity-50' />
												<p className='text-sm'>
													Chưa có thông tin con cái
												</p>
											</div>
										)}
										{childrenInfos.map((child, index) => (
											<div
												key={index}
												className='grid grid-cols-1 md:grid-cols-3 gap-2 items-end border p-3 rounded-md bg-white'
											>
												<div className='flex flex-col gap-1'>
													<Label>Họ tên</Label>
													<Input
														value={child.fullName}
														onChange={(e) =>
															updateChild(
																index,
																'fullName',
																e.target.value
															)
														}
													/>
												</div>

												<div className='flex flex-col gap-1'>
													<Label>Ngày sinh</Label>
													<Input
														value={child.dob}
														onChange={(e) =>
															updateChild(
																index,
																'dob',
																e.target.value
															)
														}
													/>
												</div>

												<Button
													type='button'
													variant='destructive'
													size='icon'
													onClick={() =>
														removeChild(index)
													}
												>
													<Trash2 className='h-4 w-4' />
												</Button>
											</div>
										))}

										<Button
											type='button'
											variant='outline'
											onClick={addChild}
											className='w-full'
										>
											<Plus className='mr-2 h-4 w-4' />{' '}
											Thêm con
										</Button>
									</div>
								</div>

								<div className='border-l-4 border-teal-500 pl-4 py-2 bg-teal-50/30 rounded-r'>
									<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
										<Users className='h-4 w-4' />
										Anh chị em ruột ({siblings.length})
									</h3>
									<div className='space-y-4'>
										{siblings.length === 0 && (
											<div className='text-center py-6 text-gray-500 border-2 border-dashed rounded-md'>
												<Users className='h-8 w-8 mx-auto mb-2 opacity-50' />
												<p className='text-sm'>
													Chưa có thông tin anh chị em
												</p>
											</div>
										)}
										{siblings.map((sibling, index) => (
											<div
												key={index}
												className='grid grid-cols-1 md:grid-cols-3 gap-2 items-end border p-3 rounded-md bg-white'
											>
												<div className='flex flex-col gap-1'>
													<Label>Họ tên</Label>
													<Input
														value={sibling.fullName}
														onChange={(e) =>
															updateSibling(
																index,
																'fullName',
																e.target.value
															)
														}
													/>
												</div>

												<div className='flex flex-col gap-1'>
													<Label>Ngày sinh</Label>
													<Input
														value={sibling.dob}
														onChange={(e) =>
															updateSibling(
																index,
																'dob',
																e.target.value
															)
														}
													/>
												</div>

												<Button
													type='button'
													variant='destructive'
													size='icon'
													onClick={() =>
														removeSibling(index)
													}
												>
													<Trash2 className='h-4 w-4' />
												</Button>
											</div>
										))}

										<Button
											type='button'
											variant='outline'
											onClick={addSibling}
											className='w-full'
										>
											<Plus className='mr-2 h-4 w-4' />{' '}
											Thêm anh chị em
										</Button>
									</div>
								</div>

								<div className='border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50/30 rounded-r'>
									<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
										<Users className='h-4 w-4' />
										Hoàn cảnh gia đình
									</h3>
									<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
										<Field
											name='familyBackground'
											label='Hoàn cảnh gia đình'
										/>
										<Field
											name='familySize'
											label='Số lượng thành viên'
											type='number'
										/>
										<Field
											name='familyBirthOrder'
											label='Con thứ mấy'
										/>
									</div>
								</div>
							</div>
						</Tabs.Content>

						{/* TAB HỌC VẤN & KỸ NĂNG */}
						<Tabs.Content value='education'>
							<div className='space-y-6'>
								<div className='border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50/30 rounded-r'>
									<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
										<GraduationCap className='h-4 w-4' />
										Học vấn
									</h3>
									<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
										<Field
											name='schoolName'
											label='Trường'
										/>
										<Field
											name='major'
											label='Chuyên ngành'
										/>
										<Field
											name='educationLevel'
											label='Trình độ'
											options={eduLevelOptions}
										/>
										<Field
											name='isGraduated'
											label='Đã tốt nghiệp'
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
											name='talent'
											label='Sở trường'
										/>
										<Field
											name='shortcoming'
											label='Sở đoản'
										/>
										<Field
											name='policyBeneficiaryGroup'
											label='Đối tượng chính sách'
										/>
									</div>
								</div>
							</div>
						</Tabs.Content>

						{/* TAB LỊCH SỬ & KHÁC */}
						<Tabs.Content value='history'>
							<div className='space-y-6'>
								<div className='border-l-4 border-amber-500 pl-4 py-2 bg-amber-50/30 rounded-r'>
									<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
										<Award className='h-4 w-4' />
										Lịch sử
									</h3>
									<div className='space-y-4 text-sm'>
										<Field
											name='achievement'
											label='Khen thưởng'
										/>
										<Field
											name='disciplinaryHistory'
											label='Kỷ luật'
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
											name='contactPerson.name'
											label='Họ tên'
										/>
										<Field
											name='contactPerson.phoneNumber'
											label='Số điện thoại'
										/>
										<Field
											name='contactPerson.address'
											label='Địa chỉ'
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
											name='relatedDocumentations'
											label='Hồ sơ đi kèm'
										/>
									</div>
								</div>
							</div>
						</Tabs.Content>
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
