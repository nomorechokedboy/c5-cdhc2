import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.locale('vi')
dayjs.extend(relativeTime)
dayjs.extend(weekOfYear)
dayjs.extend(quarterOfYear)
dayjs.extend(utc)
dayjs.extend(timezone)

dayjs.tz.setDefault('Asia/Ho_Chi_Minh')

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatTimestamp(timestamp: string) {
	return dayjs(timestamp).fromNow()
}

export function getCurrentWeekNumber() {
	return dayjs().week()
}

export function getCurrentQuarter() {
	return dayjs().quarter()
}

export function toVNTz(utcTimestamp: string) {
	return dayjs.utc(utcTimestamp).format('DD-MM-YYYY')
}
