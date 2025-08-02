import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationList } from './notification-list'

export function NotificationBell() {
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [])

	return (
		<div className='relative' ref={dropdownRef}>
			<Button
				variant='ghost'
				size='icon'
				className='relative'
				onClick={() => setIsOpen(!isOpen)}
			>
				<Bell className='h-5 w-5' />
				<Badge
					variant='destructive'
					className='absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs'
				>
					3
				</Badge>
			</Button>

			{isOpen && (
				<div className='absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50'>
					<div className='p-4 border-b'>
						<h3 className='font-semibold text-lg'>Notifications</h3>
					</div>
					<NotificationList />
				</div>
			)}
		</div>
	)
}
