import { useEffect, useRef, useState } from 'react'

/** Các bước đã mở rồi rời đi: bước đó coi như đã xem, trên dải mạch có một nhịp */
export function useVisitedSteps(step: number): number[] {
	const [visited, setVisited] = useState<number[]>([])
	const previous = useRef(step)

	useEffect(() => {
		if (previous.current === step) return
		const left = previous.current
		previous.current = step
		setVisited((v) => (v.includes(left) ? v : [...v, left]))
	}, [step])

	return visited
}
