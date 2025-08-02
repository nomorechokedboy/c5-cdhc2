import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { Bell } from 'lucide-react' // Import Bell component
import { fetchNotifications } from '@/api'

export function NotificationList() {
	const scrollRef = useRef<HTMLDivElement>(null)

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		error
	} = useInfiniteQuery({
		queryKey: ['notifications'],
		queryFn: fetchNotifications,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: null
	})

	useEffect(() => {
		const scrollElement = scrollRef.current
		if (!scrollElement) return

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = scrollElement
			if (
				scrollHeight - scrollTop <= clientHeight * 1.5 &&
				hasNextPage &&
				!isFetchingNextPage
			) {
				fetchNextPage()
			}
		}

		scrollElement.addEventListener('scroll', handleScroll)
		return () => scrollElement.removeEventListener('scroll', handleScroll)
	}, [fetchNextPage, hasNextPage, isFetchingNextPage])

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
			default:
				return '🔔'
		}
	}

	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp)
		const now = new Date()
		const diffInMinutes = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60)
		)

		if (diffInMinutes < 1) return 'Just now'
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`
		if (diffInMinutes < 1440)
			return `${Math.floor(diffInMinutes / 60)}h ago`
		return `${Math.floor(diffInMinutes / 1440)}d ago`
	}

	if (isLoading) {
		return (
			<div className='flex items-center justify-center p-8'>
				<Loader2 className='h-6 w-6 animate-spin' />
			</div>
		)
	}

	if (error) {
		return (
			<div className='p-4 text-center text-red-500'>
				Failed to load notifications
			</div>
		)
	}

	const allNotifications =
		data?.pages.flatMap((page) => page.notifications) ?? []

	return (
		<ScrollArea className='h-96' ref={scrollRef}>
			<div className='divide-y'>
				{allNotifications.map((notification) => (
					<div
						key={notification.id}
						className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
							!notification.read ? 'bg-blue-50' : ''
						}`}
					>
						<div className='flex items-start space-x-3'>
							<div className='relative'>
								<Avatar className='h-10 w-10'>
									<AvatarImage
										src={
											notification.user.avatar ||
											'/placeholder.svg'
										}
										alt={notification.user.name}
									/>
									<AvatarFallback>
										{notification.user.name
											.split(' ')
											.map((n) => n[0])
											.join('')}
									</AvatarFallback>
								</Avatar>
								<div className='absolute -bottom-1 -right-1 bg-white rounded-full p-1'>
									<span className='text-xs'>
										{getNotificationIcon(notification.type)}
									</span>
								</div>
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-sm'>
									<span className='font-medium'>
										{notification.user.name}
									</span>{' '}
									{notification.message}
								</p>
								<p className='text-xs text-gray-500 mt-1'>
									{formatTimestamp(notification.timestamp)}
								</p>
							</div>
							{!notification.read && (
								<div className='w-2 h-2 bg-blue-500 rounded-full mt-2' />
							)}
						</div>
					</div>
				))}

				{isFetchingNextPage && (
					<div className='flex items-center justify-center p-4'>
						<Loader2 className='h-4 w-4 animate-spin mr-2' />
						<span className='text-sm text-gray-500'>
							Loading more...
						</span>
					</div>
				)}

				{!hasNextPage && allNotifications.length > 0 && (
					<div className='p-4 text-center text-gray-500 text-sm'>
						{"You're all caught up!"}
					</div>
				)}

				{allNotifications.length === 0 && (
					<div className='p-8 text-center text-gray-500'>
						<Bell className='h-12 w-12 mx-auto mb-4 opacity-50' />
						<p>No notifications yet</p>
					</div>
				)}
			</div>
		</ScrollArea>
	)
}
