import { MarkAsRead } from '@/api'
import useUnreadNotificationCount from '@/hooks/useUnreadNotificationCount'
import { formatTimestamp } from '@/lib/utils'
import type { AppNotification, AppNotificationType } from '@/types'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { BookOpenCheck, Cake, UserRoundCheck, Wrench } from 'lucide-react'

export type NotificationProps = {
	notification: AppNotification
	onClick?: () => void
}

const getNotificationIcon = (type: AppNotificationType | string) => {
	switch (type) {
		case 'officialCpv':
			return <UserRoundCheck size={16} />
		case 'birthday':
			return <Cake size={16} />
		case 'assetProposal':
			return <Wrench size={16} />
		case 'examWorkflow':
			return <BookOpenCheck size={16} />
		default:
			return '🔔'
	}
}

/** Đích khi bấm thông báo */
function resolveNotificationPath(n: AppNotification): string {
	const t = String(n.notificationType || '')
	const text = `${n.title || ''} ${n.message || ''}`

	// Đề thi: [exam:123] → chi tiết; không có id → hàng đợi duyệt
	const examMatch = text.match(/\[exam:(\d+)\]/i)
	if (
		t === 'examWorkflow' ||
		/đề thi|ngân hàng đề|mã qr đề|chờ bgh|chờ cnk|ban khảo thí/i.test(text)
	) {
		if (examMatch) return `/de-thi/chi-tiet/${examMatch[1]}`
		return '/de-thi/duyet'
	}

	if (
		t === 'assetProposal' ||
		t === 'asset_proposal' ||
		/đề xuất|sua chua|sửa chữa|thanh lý|thu hồi|kết quả sửa/i.test(text)
	) {
		return '/vat-tu/de-xuat'
	}
	if (t === 'birthday' || /sinh nhật/i.test(text)) {
		return '/birthday'
	}
	if (t === 'officialCpv' || /chuyển đảng|đảng chính thức/i.test(text)) {
		return '/chuyen-dang-chinh-thuc'
	}
	return '/'
}

export default function Notification({
	notification,
	onClick
}: NotificationProps) {
	const navigate = useNavigate()
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

	function handleClick(e: React.MouseEvent) {
		e.preventDefault()
		e.stopPropagation()

		if (notification.readAt == null && notification.id) {
			mutate({ ids: [notification.id] })
		}

		const path = resolveNotificationPath(notification)
		onClick?.()
		if (path.startsWith('/de-thi/chi-tiet/')) {
			const id = path.split('/').pop() || ''
			void navigate({
				to: '/de-thi/chi-tiet/$id',
				params: { id }
			})
		} else if (path === '/de-thi/duyet') {
			void navigate({ to: '/de-thi/duyet' })
		} else if (path === '/vat-tu/de-xuat') {
			void navigate({ to: '/vat-tu/de-xuat' })
		} else if (path === '/birthday') {
			void navigate({ to: '/birthday' })
		} else if (path === '/chuyen-dang-chinh-thuc') {
			void navigate({ to: '/chuyen-dang-chinh-thuc' })
		} else {
			void navigate({ to: '/' })
		}
	}

	const path = resolveNotificationPath(notification)

	return (
		<button
			type='button'
			className='w-full text-left'
			onClick={handleClick}
		>
			<div
				className={`p-4 hover:bg-gray-50 dark:hover:bg-muted/40 transition-colors ${
					notification.readAt == null
						? 'bg-blue-50 dark:bg-blue-950/30'
						: ''
				}`}
			>
				<div className='flex gap-3 items-start'>
					<div className='bg-white dark:bg-background rounded-full p-1.5 shrink-0 border'>
						{getNotificationIcon(notification.notificationType)}
					</div>
					<div className='min-w-0 flex-1'>
						<div className='font-medium text-sm leading-snug'>
							{notification.title}
						</div>
						<p className='text-sm text-muted-foreground mt-1 leading-snug'>
							{(notification.message || '')
								.replace(/\s*\[exam:\d+\]\s*/gi, ' ')
								.trim()}
						</p>
						<p className='text-xs text-gray-500 mt-1'>
							{formatTimestamp(notification.createdAt)}
							{path === '/vat-tu/de-xuat' ? (
								<span className='ml-2 text-primary'>
									→ Đề xuất / sửa chữa
								</span>
							) : path.startsWith('/de-thi') ? (
								<span className='ml-2 text-primary'>
									→ Đề thi
								</span>
							) : null}
						</p>
					</div>
					{notification.readAt == null && (
						<div className='w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0' />
					)}
				</div>
			</div>
		</button>
	)
}
