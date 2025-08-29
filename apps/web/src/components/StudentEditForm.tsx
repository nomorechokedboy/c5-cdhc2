import React, { useMemo } from 'react'
import { useForm } from '@tanstack/react-form'
import * as Tabs from '@radix-ui/react-tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Student } from '@/types'
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
import ChildrenInfo from './children-info'

interface StudentEditFormProps {
	student: Student
	onClose?: () => void
}

export default function StudentEditForm({
	student,
	onClose
}: StudentEditFormProps) {
	const currentYear = new Date().getFullYear()
	const { handlePatchStudentInfo, isPending } = usePatchStudentInfo(student)

	const { data: classes = [], refetch } = useClassData()
	// options cho select lớp
	const classOptions = useMemo(
		() =>
			classes.map((c) => ({
				value: c.id.toString(),
				label: `${c.name} - ${c.unit.name}`
			})),
		[classes]
	)

	const form = useForm({
		defaultValues: {
			...student,
			politicalOrgOfficialDate:
				student.politicalOrgOfficialDate || `26/03/${currentYear}`,
			enlistmentPeriod:
				student.enlistmentPeriod || `13/02/${currentYear}`,
			rank: student.rank || 'Binh nhất'
		},
		onSubmit: async ({ value }) => {
			await handlePatchStudentInfo({ ...value })
			if (onClose) onClose()
		}
	})

	const [childrenInfos, setChildrenInfos] = React.useState(
		student.childrenInfos || []
	)

	// Khi submit form, nhớ set giá trị vào form
	React.useEffect(() => {
		form.setFieldValue('childrenInfos', childrenInfos)
	}, [childrenInfos])

	const addChild = () => {
		setChildrenInfos([...childrenInfos, { fullName: '', dob: '' }])
	}

	const removeChild = (index: number) => {
		setChildrenInfos(childrenInfos.filter((_, i) => i !== index))
	}

	const updateChild = (
		index: number,
		field: keyof (typeof childrenInfos)[0],
		value: string
	) => {
		const updated = [...childrenInfos]
		updated[index][field] = value
		setChildrenInfos(updated)
	}

	const Field = <K extends keyof Student>({
		name,
		label,
		type = 'text',
		options
	}: {
		name: K
		label: string
		type?: string
		options?: { label: string; value: string }[]
	}) => (
		<form.Field
			name={name}
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
					<div className='w-32 h-32 bg-gray-200 rounded-md overflow-hidden'>
						<img
							src='avt.jpg'
							alt={student.fullName}
							width={128}
							height={128}
							className='object-cover w-full h-full'
						/>
					</div>
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
								(c) => c.value === student.class.id.toString()
							)?.label || 'Chưa có lớp'}
						</p>
					</div>
				</CardHeader>

				<CardContent>
					<Tabs.Root defaultValue='info' className='w-full'>
						<Tabs.List className='flex border-b mb-4 space-x-4 px-2'>
							<Tabs.Trigger
								value='info'
								className='pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600'
							>
								Thông tin
							</Tabs.Trigger>
							<Tabs.Trigger
								value='family'
								className='pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600'
							>
								Gia đình
							</Tabs.Trigger>
							<Tabs.Trigger
								value='education'
								className='pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600'
							>
								Học vấn
							</Tabs.Trigger>
						</Tabs.List>

						{/* TAB THÔNG TIN */}
						<Tabs.Content value='info'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
								<Field name='fullName' label='Họ và tên' />
								<Field name='dob' label='Ngày sinh' />
								<Field
									name='classId'
									label='Lớp'
									options={classOptions}
								/>
								<Field name='birthPlace' label='Nơi sinh' />
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
								<Field name='phone' label='Số điện thoại' />
								<Field
									name='politicalOrg'
									label='Đoàn/Đảng'
									options={politicalOptions}
								/>
								<Field
									name='politicalOrgOfficialDate'
									label='Ngày vào Đoàn/Đảng'
								/>
								<Field
									name='rank'
									label='Cấp bậc'
									options={rankOptions}
								/>
							</div>
						</Tabs.Content>

						{/* TAB GIA ĐÌNH */}
						<Tabs.Content value='family'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
								<Field name='fatherName' label='Họ tên Cha' />
								<Field
									name='fatherJob'
									label='Nghề nghiệp Cha'
								/>
								<Field name='motherName' label='Họ tên Mẹ' />
								<Field
									name='motherJob'
									label='Nghề nghiệp Mẹ'
								/>
								<Field
									name='fatherPhoneNumber'
									label='SĐT Cha'
								/>
								<Field
									name='motherPhoneNumber'
									label='SĐT Mẹ'
								/>
								<Field name='isMarried' label='Đã kết hôn' />
								<Field
									name='spouseName'
									label='Họ tên Vợ/Chồng'
								/>
								<Field
									name='spousePhoneNumber'
									label='SĐT Vợ/Chồng'
								/>
								{/* Con cái */}
								{/* Danh sách con cái */}
								<div className='col-span-full space-y-4'>
									<Label>Danh sách con cái</Label>
									{childrenInfos.map((child, index) => (
										<div
											key={index}
											className='grid grid-cols-1 md:grid-cols-3 gap-2 items-end border p-3 rounded-md'
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
												onClick={() =>
													removeChild(index)
												}
											>
												Xóa
											</Button>
										</div>
									))}

									<Button
										type='button'
										variant='outline'
										onClick={addChild}
									>
										Thêm con
									</Button>
								</div>
							</div>
						</Tabs.Content>

						{/* TAB HỌC VẤN */}
						<Tabs.Content value='education'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
								<Field name='schoolName' label='Trường' />
								<Field name='major' label='Chuyên ngành' />
								<Field
									name='educationLevel'
									label='Trình độ học vấn'
									options={eduLevelOptions}
								/>
								<Field
									name='enlistmentPeriod'
									label='Thời gian nhập ngũ'
								/>
								<Field
									name='isGraduated'
									label='Đã tốt nghiệp'
								/>
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
