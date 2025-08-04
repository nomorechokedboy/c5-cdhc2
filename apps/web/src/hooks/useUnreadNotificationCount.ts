import { GetUnreadNotificationsCount } from '@/api'
import { useQuery } from '@tanstack/react-query'

export default function useUnreadNotificationCount() {
	return useQuery({
		queryKey: ['notificationUnreadCount'],
		queryFn: GetUnreadNotificationsCount
	})
}
