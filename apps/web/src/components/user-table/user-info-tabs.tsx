import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import UserEditForm from './user-edit-form'
import type { User } from '@/types'
import { getMediaUri, isSuperAdmin } from '@/lib/utils'
import { UserPen, Shield, User as UserIcon, Building2, Award, Briefcase } from 'lucide-react'
import useUserData from '@/hooks/useUsers'

interface StudentInfoTabsProps {
	user: User
}

export default function StudentInfoTabs({ user }: StudentInfoTabsProps) {
	const [open, setOpen] = useState(false)
	const { refetch: refetchStudents } = useUserData()
	console.log('Render UserInfoTabs for user:', user)
	const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) => {
		if (!value) return null
		return (
			<div className='flex items-center gap-2 text-sm'>
				<Icon className='w-4 h-4 text-gray-500' />
				<span className='text-gray-600'>
					<span className='font-medium'>{label}:</span> {value}
				</span>
			</div>
		)
	}

	return (
		<>
			<Card className='mb-4'>
				<CardHeader>
					<div className='flex flex-col sm:flex-row gap-6'>
						{/* Avatar */}
						<div className='flex-shrink-0'>
							<div className='w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg overflow-hidden shadow-md'>
								<img
									src={getMediaUri('/avt.jpg')}
									alt={user?.displayName}
									className='object-cover w-full h-full'
								/>
							</div>
						</div>

						{/* User Info */}
						<div className='flex-1 space-y-3'>
							{/* Name and Account Type */}
							<div className='flex flex-wrap items-center gap-2'>
								<CardTitle className='text-2xl font-bold'>
									{user?.displayName}
								</CardTitle>
								{user?.isSuperUser && (
									<Badge variant='default' className='bg-blue-600'>
										<Shield className='w-3 h-3 mr-1' />
										Quản trị viên
									</Badge>
								)}
							</div>

							{/* Position (if exists) - shown prominently */}
							{user?.position && (
								<p className='text-lg text-blue-600 font-medium'>
									{user.position}
								</p>
							)}

							{/* Info Grid */}
							<div className='grid grid-cols-1 md:grid-cols-2 gap-2 pt-2'>
								<InfoItem
									icon={UserIcon}
									label='Tên tài khoản'
									value={user?.username}
								/>
								<InfoItem
									icon={Building2}
									label='Đơn vị'
									value={user?.unit?.name}
								/>
								<InfoItem
									icon={Award}
									label='Cấp bậc'
									value={user?.rank}
								/>
								<InfoItem
									icon={Briefcase}
									label='Chức vụ'
									value={user?.position}
								/>
							</div>

							{/* Account Type for non-admin users */}
							{!user?.isSuperUser && (
								<div className='flex items-center gap-2 text-sm pt-2'>
									<UserIcon className='w-4 h-4 text-gray-500' />
									<span className='text-gray-600'>
										<span className='font-medium'>Loại tài khoản:</span> Người dùng
									</span>
								</div>
							)}
						</div>

						{/* Edit Button */}
						{isSuperAdmin() && (
							<div className='flex-shrink-0'>
								<Button
									variant='outline'
									onClick={() => setOpen(true)}
									className='w-full sm:w-auto'
								>
									<UserPen className='w-4 h-4 mr-2' />
									Sửa
								</Button>
							</div>
						)}
					</div>
				</CardHeader>
			</Card>

			{/* Edit Form Dialog */}
			<UserEditForm
				editingUser={{
					id: user?.id,
					displayName: user?.displayName,
					unitId: user.unitId,
					isSuperUser: user.isSuperUser,
					rank: user?.rank,
					position: user?.position
				}}
				open={open}
				setOpen={setOpen}
				onSuccess={() => {
					refetchStudents()
				}}
				onClose={() => setOpen(false)}
			/>
		</>
	)
}
