import { useState, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationList } from './notification-list'
import { useClickAway, useKey } from 'react-use'
import useUnreadNotificationCount from '@/hooks/useUnreadNotificationCount'
import { MarkAllAsRead } from '@/api'

export function NotificationBell() {
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const queryClient = useQueryClient()
	const { data: unreadCount } = useUnreadNotificationCount()

	const { mutate: markAllAsRead, isPending: isMarkingAll } = useMutation({
		mutationFn: MarkAllAsRead,
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ['notificationUnreadCount']
			})
			void queryClient.invalidateQueries({ queryKey: ['notifications'] })
		},
		onError: (err) => {
			console.error('MarkAllAsRead error: ', err)
		}
	})

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

	function handleMarkAllAsRead(e: React.MouseEvent) {
		e.preventDefault()
		e.stopPropagation()
		if ((unreadCount ?? 0) <= 0 || isMarkingAll) return
		markAllAsRead()
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
				{(unreadCount ?? 0) > 0 && (
					<Badge
						variant='destructive'
						className='absolute -top-1 -right-1 h-5 min-w-5 rounded-full p-0 px-1 flex items-center justify-center text-xs'
					>
						{unreadCount}
					</Badge>
				)}
			</Button>

			{isOpen && (
				<div className='absolute right-0 top-full mt-2 w-80 max-h-[70vh] overflow-hidden bg-white dark:bg-background rounded-lg shadow-lg border z-50 flex flex-col'>
					<div className='p-4 border-b shrink-0 flex items-center justify-between gap-2'>
						<h3 className='font-semibold text-lg'>Thông báo</h3>
						{(unreadCount ?? 0) > 0 && (
							<Button
								variant='ghost'
								size='sm'
								className='h-8 px-2 text-xs text-primary shrink-0'
								onClick={handleMarkAllAsRead}
								disabled={isMarkingAll}
							>
								{isMarkingAll
									? 'Đang xử lý...'
									: 'Đã đọc tất cả'}
							</Button>
						)}
					</div>
					<div className='overflow-y-auto flex-1'>
						<NotificationList onItemClick={handleCloseDropdown} />
					</div>
				</div>
			)}
		</div>
	)
}
