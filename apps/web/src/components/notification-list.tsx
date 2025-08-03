import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Cake, Loader2 } from 'lucide-react'
import { Bell } from 'lucide-react'
import { GetNotifications } from '@/api'
import { formatTimestamp } from '@/lib/utils'
import dayjs from 'dayjs'
import type { AppNotification } from '@/types'

const PAGE_SIZE = 10

async function FetchNotifications({ pageParam }: { pageParam: number }) {
	const resp = await GetNotifications({
		page: pageParam,
		pageSize: PAGE_SIZE
	})

	return { data: resp, page: pageParam }
}

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
		queryFn: FetchNotifications,
		getNextPageParam: (lastPage) => {
			return lastPage.data.length < PAGE_SIZE
				? undefined
				: lastPage.page + 1
		},
		initialPageParam: 0
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
			case 'birthday':
				return <Cake size={16} />
			default:
				return '🔔'
		}
	}

	// Group notifications by date
	const groupNotificationsByDate = (notifications: AppNotification[]) => {
		const groups: Record<string, AppNotification[]> = {}

		notifications.forEach((notification) => {
			const date = dayjs(notification.createdAt).format('YYYY-MM-DD')

			if (!groups[date]) {
				groups[date] = []
			}
			groups[date].push(notification)
		})

		return groups
	}

	// Format date for display
	const formatDateHeader = (dateString: string) => {
		const date = dayjs(dateString)
		const today = dayjs()
		const yesterday = today.subtract(1, 'day')

		if (date.isSame(today, 'day')) {
			return 'Hôm nay'
		} else if (date.isSame(yesterday, 'day')) {
			return 'Hôm qua'
		} else if (date.isSame(today, 'year')) {
			return date.format('DD/MM')
		} else {
			return date.format('DD/MM/YYYY')
		}
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

	const allNotifications = data?.pages.flatMap((page) => page.data) ?? []
	const groupedNotifications = groupNotificationsByDate(allNotifications)

	// Sort dates in descending order (most recent first)
	const sortedDates = Object.keys(groupedNotifications).sort(
		(a, b) => dayjs(b).valueOf() - dayjs(a).valueOf()
	)

	return (
		<ScrollArea className='h-96' ref={scrollRef}>
			<div>
				{sortedDates.map((date) => (
					<div key={date} className='mb-4'>
						{/* Date Header */}
						<div className='sticky top-0 bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide border-b'>
							{formatDateHeader(date)}
						</div>

						{/* Notifications for this date */}
						<div className='divide-y'>
							{groupedNotifications[date].map((notification) => {
								const birthdayMsg =
									'Tuần này có sinh nhật của đồng chí'
								const notificationMsg =
									notification.totalCount === 1
										? `${birthdayMsg} X.`
										: `${birthdayMsg} X và ${notification.totalCount} đồng chí khác.`

								return (
									<div
										key={notification.id}
										className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
											!notification.readAt === null
												? 'bg-blue-50'
												: ''
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
													{formatTimestamp(
														notification.createdAt
													)}
												</p>
											</div>
											{!notification.readAt && (
												<div className='w-2 h-2 bg-blue-500 rounded-full mt-2' />
											)}
										</div>
									</div>
								)
							})}
						</div>
					</div>
				))}

				{isFetchingNextPage && (
					<div className='flex items-center justify-center p-4'>
						<Loader2 className='h-4 w-4 animate-spin mr-2' />
						<span className='text-sm text-gray-500'>
							Đang tải...
						</span>
					</div>
				)}

				{!hasNextPage && allNotifications.length > 0 && (
					<div className='p-4 text-center text-gray-500 text-sm'>
						Không còn thông báo mới
					</div>
				)}

				{allNotifications.length === 0 && (
					<div className='p-8 text-center text-gray-500'>
						<Bell className='h-12 w-12 mx-auto mb-4 opacity-50' />
						<p>Chưa có thông báo nào</p>
					</div>
				)}
			</div>
		</ScrollArea>
	)
}
