import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'

dayjs.locale('vi')
dayjs.extend(relativeTime)

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const formatTimestamp = (timestamp: string) => {
	return dayjs(timestamp).fromNow()
}
