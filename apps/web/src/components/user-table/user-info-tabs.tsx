import { useState, useMemo } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import UserEditForm from './user-edit-form'
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
import useUserData from '@/hooks/useUsers'

interface StudentInfoTabsProps {
	user: User
}

export default function StudentInfoTabs({ user }: StudentInfoTabsProps) {
	const [open, setOpen] = useState(false)

	const [editOpen, setEditOpen] = useState(false)

	const {
		data: users = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useUserData()
	console.log('isloading', isLoadingStudents)
	const avatarUri = '/avt.jpg'

	return (
		<>
			{/* HEADER + NÚT SỬA */}
			<Card className='mb-4'>
				<CardHeader className='flex flex-col sm:flex-row items-center sm:items-start gap-4'>
					<div className='w-32 h-32 bg-gray-200 rounded-md overflow-hidden'>
						<img
							src={getMediaUri(avatarUri)}
							alt={user?.displayName}
							className='object-cover w-full h-full'
						/>
					</div>
					<div className='flex-1'>
						<CardTitle className='text-xl'>
							{user?.displayName}
						</CardTitle>
						<p className='text-gray-600'>
							Tên tài khoản: {user?.username}
						</p>
						<p className='text-gray-600'>
							Đơn vị: {user?.unit?.name}
						</p>
						<p className='text-gray-600'>
							Loại tài khoản:
							{user?.isSuperUser
								? ' Quản trị viên'
								: ' Người dùng'}
						</p>
						{/* <p className='text-gray-600'>
                            Ngày nhập ngũ: {student.enlistmentPeriod}
                        </p> */}
					</div>

					<Button variant='outline' onClick={() => setOpen(true)}>
						<UserPen /> Sửa
					</Button>

					<UserEditForm
						editingUser={{
							id: user?.id,
							displayName: user?.displayName,
							unitId: user.unitId,
							isSuperUser: user.isSuperUser
						}}
						open={open}
						setOpen={setOpen}
						onSuccess={() => {
							refetchStudents()
							setEditOpen(false)
						}}
						onClose={() => setOpen(false)}
					/>
				</CardHeader>
			</Card>

			{/* TABS */}
		</>
	)
}
