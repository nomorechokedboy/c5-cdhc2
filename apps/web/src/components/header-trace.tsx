import { useIsFetching } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

const SCAN_DELAY_MS = 250

/** Bật cờ sau `delay` ms; tắt ngay khi hết việc, để tải nhanh không nháy. */
function useDelayedFlag(active: boolean, delay: number) {
	const [flag, setFlag] = useState(false)
	useEffect(() => {
		if (!active) {
			setFlag(false)
			return
		}
		const timer = setTimeout(() => setFlag(true), delay)
		return () => clearTimeout(timer)
	}, [active, delay])
	return flag
}

interface HeaderTraceProps {
	/** Phần tử tên trang hiện tại; nhịp tim đứng ngay dưới nó */
	anchorRef: RefObject<HTMLElement | null>
	/** Đổi khi chuyển trang, để đo lại vị trí và đập một nhịp */
	routeKey: string
}

/**
 * Đường nền của thanh đầu trang: nhịp tim nằm dưới tên trang hiện tại và trượt
 * sang vị trí mới khi chuyển trang; khi đang tải dữ liệu, một vệt sáng quét dọc
 * đường nền. Đặt trong phần tử `relative` (chính là thanh đầu trang).
 */
export function HeaderTrace({ anchorRef, routeKey }: HeaderTraceProps) {
	const rootRef = useRef<HTMLDivElement>(null)
	const [x, setX] = useState<number | null>(null)
	const [settled, setSettled] = useState(false)
	const fetching = useIsFetching() > 0
	const scanning = useDelayedFlag(fetching, SCAN_DELAY_MS)

	useLayoutEffect(() => {
		const root = rootRef.current
		const measure = () => {
			const anchor = anchorRef.current
			if (!anchor || !root) return
			setX(
				anchor.getBoundingClientRect().left -
					root.getBoundingClientRect().left
			)
		}
		measure()
		if (typeof ResizeObserver === 'undefined' || !root) return
		// Thu/mở thanh bên đổi bề rộng thanh đầu trang → đo lại
		const observer = new ResizeObserver(measure)
		observer.observe(root)
		return () => observer.disconnect()
	}, [anchorRef, routeKey])

	// Lần đo đầu đặt thẳng vào chỗ, không trượt từ mép trái
	useEffect(() => {
		if (x === null || settled) return
		const frame = requestAnimationFrame(() => setSettled(true))
		return () => cancelAnimationFrame(frame)
	}, [x, settled])

	return (
		<div
			ref={rootRef}
			aria-hidden
			data-scanning={scanning}
			className='pointer-events-none absolute inset-x-0 -bottom-2 h-4'
		>
			{scanning && (
				<div className='trace-scan absolute inset-x-0 top-[7px] h-[2px] overflow-hidden'>
					<div className='trace-scan-bar h-full w-1/4 bg-gold' />
				</div>
			)}
			<div
				className={
					settled
						? 'absolute top-0 left-0 transition-transform duration-700 ease-[cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none'
						: 'absolute top-0 left-0'
				}
				style={{
					transform: `translateX(${x ?? 0}px)`,
					opacity: x === null ? 0 : 1
				}}
			>
				<span
					key={routeKey}
					className='blip-beat block size-4 bg-(image:--blip) bg-contain bg-no-repeat'
				/>
			</div>
		</div>
	)
}
