import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useVisitedSteps } from './useVisitedSteps'

describe('useVisitedSteps', () => {
	it('adds a step once it is left, never the current one, without duplicates', () => {
		const { result, rerender } = renderHook(
			({ step }) => useVisitedSteps(step),
			{
				initialProps: { step: 0 }
			}
		)
		expect(result.current).toEqual([])
		act(() => rerender({ step: 2 }))
		expect(result.current).toEqual([0])
		act(() => rerender({ step: 0 }))
		expect(result.current).toEqual([0, 2])
		act(() => rerender({ step: 2 }))
		expect(result.current).toEqual([0, 2])
	})
})
