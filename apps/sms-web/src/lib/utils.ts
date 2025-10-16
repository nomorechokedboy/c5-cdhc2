import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'

dayjs.locale('vi')

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const formatDate = (timestamp: string | number) => {
	let date = dayjs(timestamp)
	if (typeof timestamp === 'number') {
		date = dayjs.unix(timestamp)
	}

	return date.format('D MMMM, YYYY')
}
