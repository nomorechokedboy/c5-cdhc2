import { MarkAsRead } from '@/api'
import useUnreadNotificationCount from '@/hooks/useUnreadNotificationCount'
import { formatTimestamp } from '@/lib/utils'
import type { AppNotification, Student } from '@/types'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Cake } from 'lucide-react'

export type NotificationProps = {
	notification: AppNotification
	onClick?: () => void
}

const getNotificationIcon = (type: string) => {
	switch (type) {
		case 'like':
			return '❤️'
		case 'comment':
			return '💬'
		case 'follow':
			return '👤'
		case 'mention':
			return '@'
		case 'birthday':
			return <Cake size={16} />
		default:
			return '🔔'
	}
}

export default function Notification({
	notification,
	onClick
}: NotificationProps) {
	const { refetch: refetchUnreadNotification } = useUnreadNotificationCount()
	const { mutate } = useMutation({
		mutationFn: MarkAsRead,
		onSuccess: () => {
			refetchUnreadNotification()
		},
		onError: (err) => {
			console.error('MarkAsRead error: ', err)
		}
	})
	const birthdayMsg = 'Tuần này có sinh nhật của đồng chí'
	const notificationMsg =
		notification.totalCount === 1
			? `${birthdayMsg} ${(notification.items[0].relatedData as Student).fullName}.`
			: `${birthdayMsg} ${(notification.items[0].relatedData as Student).fullName} và ${notification.totalCount} đồng chí khác.`

	function handleReadNotification() {
		if (notification.readAt !== null) {
			onClick?.()
			return
		}

		if (notification.id === undefined) {
			console.log(
				'Notification.handleReadNotification: Notification id is undefined'
			)
		} else {
			mutate({ ids: [notification.id] })
		}

		onClick?.()
	}

	return (
		<Link to='/birthday' onClick={handleReadNotification}>
			<div
				className={`p-4 hover:bg-gray-50 transition-colors ${
					!notification.readAt === null ? 'bg-blue-50' : ''
				}`}
			>
				<div className='flex flex-col gap-2 space-x-3'>
					<div className='flex gap-2'>
						<div className='bg-white rounded-full p-1'>
							<span className='text-xs'>
								{getNotificationIcon(
									notification.notificationType
								)}
							</span>
						</div>
						{notification.title}
					</div>
					<div className='flex-1 min-w-0'>
						<p className='text-sm'>
							<span className='font-medium'>
								{notificationMsg}
							</span>
						</p>
						<p className='text-xs text-gray-500 mt-1'>
							{formatTimestamp(notification.createdAt)}
						</p>
					</div>
					{!notification.readAt && (
						<div className='w-2 h-2 bg-blue-500 rounded-full mt-2' />
					)}
				</div>
			</div>
		</Link>
	)
}
