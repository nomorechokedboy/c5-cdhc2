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
import { Mail, Phone, Hash, BookUser, IdCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DashboardHeader } from '@/components/dashboard'

export const Route = createFileRoute('/profile')({
	component: ProfilePage
})

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
	const { t } = useTranslation()
	const { user, role } = useAuth()

	const displayName = user
		? `${user.firstname} ${user.lastname}`.trim()
		: t('profile.loading')

	const initials = user
		? `${user.firstname?.[0] ?? ''}${user.lastname?.[0] ?? ''}`.toUpperCase()
		: 'U'

	return (
		<ProtectedRoute>
			<div className='container mx-auto max-w-2xl space-y-6 p-6'>
				<DashboardHeader
					title={t('profile.title')}
					subtitle={t('profile.subtitle')}
				/>

				{/* Thẻ tên: gáy xanh mực, tên viết to, vai trò đóng dấu */}
				<Card className='border-l-primary border-l-[6px]'>
					<CardContent>
						<div className='flex items-center gap-4'>
							<Avatar className='h-16 w-16 text-lg'>
								<AvatarFallback className='bg-primary text-primary-foreground font-serif font-semibold'>
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className='min-w-0 space-y-1.5'>
								<h2 className='font-serif text-2xl font-semibold'>
									{displayName}
								</h2>
								<div className='flex flex-wrap items-center gap-3'>
									<span className='border-brass -rotate-1 rounded-sm border-2 px-2 py-0.5 text-sm font-semibold'>
										{t(`roles.${role}`, {
											defaultValue: role
										})}
									</span>
									{user?.username && (
										<span className='text-muted-foreground text-sm'>
											@{user.username}
										</span>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Contact info */}
				<Card>
					<CardHeader>
						<CardTitle className='text-lg'>
							{t('profile.contactInfo')}
						</CardTitle>
						<CardDescription>
							{t('profile.syncNote')}
						</CardDescription>
					</CardHeader>
					<CardContent className='divide-rule divide-y'>
						<InfoRow
							icon={<Mail className='h-4 w-4' />}
							label={t('profile.email')}
							value={user?.email}
						/>
						<InfoRow
							icon={<Phone className='h-4 w-4' />}
							label={t('profile.phone')}
							value={user?.phone1}
						/>
						<InfoRow
							icon={<Hash className='h-4 w-4' />}
							label={t('profile.idNumber')}
							value={user?.idnumber}
						/>
						<InfoRow
							icon={<BookUser className='h-4 w-4' />}
							label={t('profile.username')}
							value={user?.username}
						/>
						<InfoRow
							icon={<IdCard className='h-4 w-4' />}
							label={t('profile.userCode')}
							value={user?.id ? String(user.id) : undefined}
						/>
					</CardContent>
				</Card>

				{/* Description */}
				{user?.description && (
					<Card>
						<CardHeader>
							<CardTitle className='text-lg'>
								{t('profile.description')}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-muted-foreground text-sm'>
								{user.description}
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</ProtectedRoute>
	)
}
