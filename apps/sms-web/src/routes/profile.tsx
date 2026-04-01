import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import useAuth from '@/hooks/useAuth'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription
} from '@repo/ui/components/ui/card'
import { Avatar, AvatarFallback } from '@repo/ui/components/ui/avatar'
import { Badge } from '@repo/ui/components/ui/badge'
import { Separator } from '@repo/ui/components/ui/separator'
import { Mail, Phone, Hash, BookUser, IdCard } from 'lucide-react'

export const Route = createFileRoute('/profile')({
	component: ProfilePage
})

const roleLabelMap: Record<
	string,
	{
		label: string
		variant: 'default' | 'secondary' | 'outline' | 'destructive'
	}
> = {
	admin: { label: 'Quản trị viên', variant: 'destructive' },
	manager: { label: 'Quản lý', variant: 'default' },
	teacher: { label: 'Giáo viên', variant: 'secondary' },
	student: { label: 'Học viên', variant: 'outline' }
}

type InfoRowProps = {
	icon: React.ReactNode
	label: string
	value: string | undefined
}

function InfoRow({ icon, label, value }: InfoRowProps) {
	if (!value) return null
	return (
		<div className='flex items-center gap-3 py-3'>
			<div className='text-muted-foreground shrink-0'>{icon}</div>
			<div className='min-w-0'>
				<p className='text-xs text-muted-foreground'>{label}</p>
				<p className='text-sm font-medium truncate'>{value}</p>
			</div>
		</div>
	)
}

function ProfilePage() {
	const { user, role } = useAuth()

	const displayName = user
		? `${user.firstname} ${user.lastname}`.trim()
		: 'Đang tải...'

	const initials = user
		? `${user.firstname?.[0] ?? ''}${user.lastname?.[0] ?? ''}`.toUpperCase()
		: 'U'

	const roleInfo = roleLabelMap[role] ?? {
		label: role,
		variant: 'outline' as const
	}

	return (
		<ProtectedRoute>
			<div className='container max-w-2xl mx-auto p-6 space-y-6'>
				<div>
					<h1 className='text-2xl font-bold tracking-tight'>
						Hồ sơ cá nhân
					</h1>
					<p className='text-muted-foreground'>
						Thông tin tài khoản của bạn
					</p>
				</div>

				{/* Avatar + name card */}
				<Card>
					<CardContent className='pt-6'>
						<div className='flex items-center gap-4'>
							<Avatar className='h-16 w-16 text-lg'>
								<AvatarFallback className='bg-primary/10 text-primary font-semibold'>
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className='space-y-1'>
								<h2 className='text-xl font-semibold'>
									{displayName}
								</h2>
								<div className='flex items-center gap-2'>
									<Badge variant={roleInfo.variant}>
										{roleInfo.label}
									</Badge>
									{user?.username && (
										<span className='text-sm text-muted-foreground'>
											@{user.username}
										</span>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Info card */}
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>
							Thông tin liên hệ
						</CardTitle>
						<CardDescription>
							Dữ liệu được đồng bộ từ hệ thống LMS
						</CardDescription>
					</CardHeader>
					<CardContent className='divide-y divide-border'>
						<InfoRow
							icon={<Mail className='w-4 h-4' />}
							label='Email'
							value={user?.email}
						/>
						<InfoRow
							icon={<Phone className='w-4 h-4' />}
							label='Số điện thoại'
							value={user?.phone1}
						/>
						<InfoRow
							icon={<Hash className='w-4 h-4' />}
							label='Số hiệu'
							value={user?.idnumber}
						/>
						<InfoRow
							icon={<BookUser className='w-4 h-4' />}
							label='Tên đăng nhập'
							value={user?.username}
						/>
						<InfoRow
							icon={<IdCard className='w-4 h-4' />}
							label='Mã số'
							value={user?.id ? String(user.id) : undefined}
						/>
					</CardContent>
				</Card>

				{/* Description if present */}
				{user?.description && (
					<Card>
						<CardHeader>
							<CardTitle className='text-base'>Mô tả</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-sm text-muted-foreground'>
								{user.description}
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</ProtectedRoute>
	)
}
