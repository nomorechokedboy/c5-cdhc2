import useAuth from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'
import ProfileEditForm from './profile-edit-form'
import PasswordChangeForm from './password-change-form'
import dayjs from 'dayjs'
import {
	Edit,
	KeyRound,
	User,
	Award,
	Briefcase,
	Building2,
	UserCircle,
	Calendar,
	Clock
} from 'lucide-react'

export default function ProfileView() {
	const { user } = useAuth()
	const [editOpen, setEditOpen] = useState(false)
	const [passwordOpen, setPasswordOpen] = useState(false)

	if (!user) return <div>Loading...</div>

	return (
		<div className='space-y-6'>
			{/* Action Buttons */}
			<div className='flex gap-3'>
				<Button
					onClick={() => setEditOpen(true)}
					className='flex items-center gap-2'
				>
					<Edit className='w-4 h-4' />
					Chỉnh sửa thông tin
				</Button>
				<Button
					variant='outline'
					onClick={() => setPasswordOpen(true)}
					className='flex items-center gap-2'
				>
					<KeyRound className='w-4 h-4' />
					Đổi mật khẩu
				</Button>
			</div>

			{/* Profile Information Table */}
			<div className='rounded-md border'>
				<div className='p-6 space-y-6'>
					{/* Personal Information Section */}
					<div>
						<h3 className='text-lg font-semibold mb-4'>
							Thông tin cá nhân
						</h3>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
							<InfoRow
								icon={<User className='w-4 h-4' />}
								label='Họ và tên'
								value={user.displayName}
							/>
							<InfoRow
								icon={<Award className='w-4 h-4' />}
								label='Cấp bậc'
								value={user.rank || '—'}
							/>
							<InfoRow
								icon={<Briefcase className='w-4 h-4' />}
								label='Chức vụ'
								value={user.position || '—'}
							/>
							<InfoRow
								icon={<Building2 className='w-4 h-4' />}
								label='Đơn vị'
								value={user.unitName || '—'}
							/>
						</div>
					</div>

					<Separator />

					{/* Login Information Section */}
					<div>
						<h3 className='text-lg font-semibold mb-4'>
							Thông tin đăng nhập
						</h3>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
							<InfoRow
								icon={<UserCircle className='w-4 h-4' />}
								label='Tên tài khoản'
								value={user.username}
							/>
						</div>
					</div>

					<Separator />

					{/* System Information Section */}
					<div>
						<h3 className='text-lg font-semibold mb-4'>
							Thông tin hệ thống
						</h3>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
							<InfoRow
								icon={<Calendar className='w-4 h-4' />}
								label='Ngày tạo'
								value={dayjs(user.createdAt).format(
									'DD/MM/YYYY HH:mm:ss'
								)}
							/>
							<InfoRow
								icon={<Clock className='w-4 h-4' />}
								label='Ngày cập nhật'
								value={dayjs(user.updatedAt).format(
									'DD/MM/YYYY HH:mm:ss'
								)}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Edit Forms */}
			<ProfileEditForm
				open={editOpen}
				setOpen={setEditOpen}
				user={user}
			/>
			<PasswordChangeForm open={passwordOpen} setOpen={setPasswordOpen} />
		</div>
	)
}

function InfoRow({
	icon,
	label,
	value
}: {
	icon?: React.ReactNode
	label: string
	value: string
}) {
	return (
		<div className='space-y-2'>
			<div className='flex items-center gap-2 text-muted-foreground'>
				{icon}
				<p className='text-sm font-medium'>{label}</p>
			</div>
			<p className='text-sm font-semibold'>{value}</p>
		</div>
	)
}
