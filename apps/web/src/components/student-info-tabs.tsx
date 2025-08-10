import React, { useState, useMemo } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import StudentEditForm from './StudentEditForm'
import type { Student } from '@/types'
import {
	EhtnicOptions,
	religionOptions,
	eduLevelOptions,
	politicalOptions
} from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'

interface StudentInfoTabsProps {
	student: Student
}

export default function StudentInfoTabs({ student }: StudentInfoTabsProps) {
	const [open, setOpen] = useState(false)

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

	const Field = ({
		label,
		value,
		options
	}: {
		label: string
		value?: string
		options?: { label: string; value: string }[]
	}) => {
		const displayValue =
			options && value
				? options.find((opt) => opt.value === value)?.label || '-'
				: value || '-'

		return (
			<div>
				<p className='text-xs font-medium text-gray-500'>{label}</p>
				<p>{displayValue}</p>
			</div>
		)
	}

	return (
		<>
			{/* HEADER + NÚT SỬA */}
			<Card className='mb-4'>
				<CardHeader className='flex flex-col sm:flex-row items-center sm:items-start gap-4'>
					<div className='w-32 h-32 bg-gray-200 rounded-md overflow-hidden'>
						<img
							src='/avt.jpg'
							alt={student.fullName}
							className='object-cover w-full h-full'
						/>
					</div>
					<div className='flex-1'>
						<CardTitle className='text-xl'>
							{student.fullName}
						</CardTitle>
						<p className='text-gray-600'>
							Chức vụ: {student.position}
						</p>
						<p className='text-gray-600'>Cấp bậc: {student.rank}</p>
						<p className='text-gray-600'>
							Lớp:
							{/* tìm lớp bằng value trong classOptions */}
							{classOptions.find(
								(c) => c.value === student.class.id.toString()
							)?.label || 'Chưa có lớp'}
						</p>
					</div>
					<Dialog open={open} onOpenChange={setOpen}>
						<DialogTrigger asChild>
							<Button variant='outline'>Sửa</Button>
						</DialogTrigger>
						<DialogContent className='max-w-screen-lg w-full h-screen overflow-y-auto p-6'>
							<StudentEditForm
								student={student}
								onClose={() => setOpen(false)}
							/>
						</DialogContent>
					</Dialog>
				</CardHeader>
			</Card>

			{/* TABS */}
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
					<Card>
						<CardContent className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
							<Field label='Ngày sinh' value={student.dob} />
							<Field
								label='Nơi sinh'
								value={student.birthPlace}
							/>
							<Field label='Dân tộc' value={student.ethnic} />
							<Field label='Tôn giáo' value={student.religion} />
							<Field label='Địa chỉ' value={student.address} />
							<Field
								label='Số điện thoại'
								value={student.phone}
							/>
							<Field
								label='Tổ chức chính trị'
								value={student.politicalOrg}
								options={politicalOptions}
							/>
							<Field
								label='Ngày vào Đoàn/Đảng'
								value={student.politicalOrgOfficialDate}
							/>
						</CardContent>
					</Card>
				</Tabs.Content>

				{/* TAB GIA ĐÌNH */}
				<Tabs.Content value='family'>
					<Card>
						<CardContent className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
							<Field
								label='Cha'
								value={`${student.fatherName} (${student.fatherJob})`}
							/>
							<Field
								label='Mẹ'
								value={`${student.motherName} (${student.motherJob})`}
							/>
							<Field
								label='SĐT Cha'
								value={student.fatherPhoneNumber}
							/>
							<Field
								label='SĐT Mẹ'
								value={student.motherPhoneNumber}
							/>
							<Field
								label='Tình trạng hôn nhân'
								value={
									student.isMarried
										? 'Đã kết hôn'
										: 'Độc thân'
								}
							/>
							{student.isMarried && (
								<>
									<Field
										label='Vợ/Chồng'
										value={student.spouseName}
									/>
									<Field
										label='SĐT Vợ/Chồng'
										value={student.spousePhoneNumber}
									/>
								</>
							)}
							<Field
								label='Số con'
								value={`${student.childrenInfos.length}`}
							/>
							{student.childrenInfos.map((child, idx) => (
								<Field
									key={idx}
									label={`Con ${idx + 1}`}
									value={`${child.fullName} (${child.dob})`}
								/>
							))}
						</CardContent>
					</Card>
				</Tabs.Content>

				{/* TAB HỌC VẤN */}
				<Tabs.Content value='education'>
					<Card>
						<CardContent className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
							<Field label='Trường' value={student.schoolName} />
							<Field label='Chuyên ngành' value={student.major} />
							<Field
								label='Trình độ học vấn'
								value={student.educationLevel}
							/>
							<Field
								label='Thời gian nhập ngũ'
								value={student.enlistmentPeriod}
							/>
							<Field
								label='Đã tốt nghiệp'
								value={student.isGraduated ? 'Có' : 'Chưa'}
							/>
						</CardContent>
					</Card>
				</Tabs.Content>
			</Tabs.Root>
		</>
	)
}
