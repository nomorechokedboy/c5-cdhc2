import { GetNotifications } from '@/api'
import { useInfiniteQuery } from '@tanstack/react-query'

const PAGE_SIZE = 10

async function FetchNotifications({ pageParam }: { pageParam: number }) {
	const resp = await GetNotifications({
		page: pageParam,
		pageSize: PAGE_SIZE
	})

	return { data: resp, page: pageParam }
}

export default function useInfiniteNotification() {
	return useInfiniteQuery({
		queryKey: ['notifications'],
		queryFn: FetchNotifications,
		getNextPageParam: (lastPage) => {
			return lastPage.data.length < PAGE_SIZE
				? undefined
				: lastPage.page + 1
		},
		initialPageParam: 0
	})
}
