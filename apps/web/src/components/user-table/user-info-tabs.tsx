import { useState, useMemo } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import StudentEditForm from './user-edit-form'
import type { User } from '@/types'
import {
	EhtnicOptions,
	religionOptions,
	eduLevelOptions,
	politicalOptions
} from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import { getMediaUri } from '@/lib/utils'
import { FileDown, UserPen } from 'lucide-react'

interface StudentInfoTabsProps {
	student: User
}

export default function StudentInfoTabs({ student }: StudentInfoTabsProps) {
	const [open, setOpen] = useState(false)

	// const { data: classes = [], refetch } = useClassData()
	// // options cho select lớp
	// const classOptions = useMemo(
	//     () =>
	//         classes.map((c) => ({
	//             value: c.id.toString(),
	//             label: `${c.name} - ${c.unit.name}`
	//         })),
	//     [classes]
	// )

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
	const avatarUri = '/avt.jpg'

	return (
		<>
			{/* HEADER + NÚT SỬA */}
			<Card className='mb-4'>
				<CardHeader className='flex flex-col sm:flex-row items-center sm:items-start gap-4'>
					<div className='w-32 h-32 bg-gray-200 rounded-md overflow-hidden'>
						<img
							src={getMediaUri(avatarUri)}
							alt={student.displayName}
							className='object-cover w-full h-full'
						/>
					</div>
					<div className='flex-1'>
						<CardTitle className='text-xl'>
							{student.displayName}
						</CardTitle>
						<p className='text-gray-600'>
							Chức vụ: {student.username}
						</p>
						<p className='text-gray-600'>
							Cấp bậc: {student.unitId}
						</p>
						<p className='text-gray-600'>
							Lớp:
							{/* tìm lớp bằng value trong classOptions */}
							{/* {classOptions.find(
                                (c) => c.value === student?.class?.id.toString()
                            )?.label || 'Chưa có lớp'} */}
							{student.isSuperUser}
						</p>
						{/* <p className='text-gray-600'>
                            Ngày nhập ngũ: {student.enlistmentPeriod}
                        </p> */}
					</div>
					<Dialog open={open} onOpenChange={setOpen}>
						<DialogTrigger asChild>
							<Button variant='outline'>
								<UserPen /> Sửa
							</Button>
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
		</>
	)
}
