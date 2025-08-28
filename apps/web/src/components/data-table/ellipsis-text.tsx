import { useEffect, useRef, useState } from 'react'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface EllipsisTextProps {
	children?: ReactNode
	className?: string
	maxWidth?: string
}

export function EllipsisText({
	children,
	className,
	maxWidth = '200px'
}: EllipsisTextProps) {
	const textRef = useRef<HTMLSpanElement>(null)
	const [isTruncated, setIsTruncated] = useState(false)

	useEffect(() => {
		const checkTruncation = () => {
			if (textRef.current) {
				const isOverflowing =
					textRef.current.scrollWidth > textRef.current.clientWidth
				setIsTruncated(isOverflowing)
			}
		}

		checkTruncation()

		// Check again after a short delay to ensure proper measurement
		const timeoutId = setTimeout(checkTruncation, 100)

		// Add resize listener to recheck on window resize
		window.addEventListener('resize', checkTruncation)

		return () => {
			clearTimeout(timeoutId)
			window.removeEventListener('resize', checkTruncation)
		}
	}, [children, maxWidth])

	const textElement = (
		<span
			ref={textRef}
			className={cn('inline-block truncate', className)}
			style={{ maxWidth }}
		>
			{children}
		</span>
	)

	// Only wrap with tooltip if text is truncated
	if (!isTruncated) {
		return textElement
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>{textElement}</TooltipTrigger>
				<TooltipContent>
					<p className='max-w-xs'>{children}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
