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
import { Mail, Phone, Hash, BookUser, IdCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LangPackManager } from '@/components/langpack-manager'

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

	const roleLabelMap: Record<
		string,
		{
			label: string
			variant: 'default' | 'secondary' | 'outline' | 'destructive'
		}
	> = {
		admin: { label: t('roles.admin'), variant: 'destructive' },
		manager: { label: t('roles.manager'), variant: 'default' },
		teacher: { label: t('roles.teacher'), variant: 'secondary' },
		student: { label: t('roles.student'), variant: 'outline' }
	}

	const displayName = user
		? `${user.firstname} ${user.lastname}`.trim()
		: t('profile.loading')

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
						{t('profile.title')}
					</h1>
					<p className='text-muted-foreground'>
						{t('profile.subtitle')}
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

				{/* Contact info card */}
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>
							{t('profile.contactInfo')}
						</CardTitle>
						<CardDescription>
							{t('profile.syncNote')}
						</CardDescription>
					</CardHeader>
					<CardContent className='divide-y divide-border'>
						<InfoRow
							icon={<Mail className='w-4 h-4' />}
							label={t('profile.email')}
							value={user?.email}
						/>
						<InfoRow
							icon={<Phone className='w-4 h-4' />}
							label={t('profile.phone')}
							value={user?.phone1}
						/>
						<InfoRow
							icon={<Hash className='w-4 h-4' />}
							label={t('profile.idNumber')}
							value={user?.idnumber}
						/>
						<InfoRow
							icon={<BookUser className='w-4 h-4' />}
							label={t('profile.username')}
							value={user?.username}
						/>
						<InfoRow
							icon={<IdCard className='w-4 h-4' />}
							label={t('profile.userCode')}
							value={user?.id ? String(user.id) : undefined}
						/>
					</CardContent>
				</Card>

				{/* Description if present */}
				{user?.description && (
					<Card>
						<CardHeader>
							<CardTitle className='text-base'>
								{t('profile.description')}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-sm text-muted-foreground'>
								{user.description}
							</p>
						</CardContent>
					</Card>
				)}

				{/* Language pack customisation */}
				<LangPackManager />
			</div>
		</ProtectedRoute>
	)
}
