import { useState, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationList } from './notification-list'
import { useClickAway, useKey } from 'react-use'
import useUnreadNotificationCount from '@/hooks/useUnreadNotificationCount'

export function NotificationBell() {
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const { data: unreadCount } = useUnreadNotificationCount()

	async function requestNotificationPermission() {
		if ('Notification' in window) {
			await Notification.requestPermission()
		}
	}

	function handleCloseDropdown() {
		setIsOpen(false)
	}

	async function handleClick() {
		await requestNotificationPermission()

		setIsOpen(!isOpen)
	}

	useClickAway(dropdownRef, handleCloseDropdown)
	useKey(isOpen ? 'Escape' : null, handleCloseDropdown)

	return (
		<div className='relative' ref={dropdownRef}>
			<Button
				variant='ghost'
				size='icon'
				className='relative'
				onClick={handleClick}
			>
				<Bell className='h-5 w-5' />
				<Badge
					variant='destructive'
					className='absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs'
				>
					{unreadCount ?? 0}
				</Badge>
			</Button>

			{isOpen && (
				<div className='absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50'>
					<div className='p-4 border-b'>
						<h3 className='font-semibold text-lg'>Notifications</h3>
					</div>
					<NotificationList onItemClick={handleCloseDropdown} />
				</div>
			)}
		</div>
	)
}
