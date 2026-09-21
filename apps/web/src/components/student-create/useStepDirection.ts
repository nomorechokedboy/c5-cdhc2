import { useRef } from 'react'

/** «next» khi bước tăng, «prev» khi giảm: để giấy trượt đúng chiều */
export function useStepDirection(step: number): 'next' | 'prev' {
	const last = useRef(step)
	const direction = useRef<'next' | 'prev'>('next')
	if (step !== last.current) {
		direction.current = step > last.current ? 'next' : 'prev'
		last.current = step
	}
	return direction.current
}
