import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HeaderTrace } from './header-trace'

afterEach(cleanup)

function anchorAt(left: number) {
	const el = document.createElement('li')
	el.getBoundingClientRect = () => ({ left }) as DOMRect
	return { current: el }
}

function renderTrace(client: QueryClient, left = 120, routeKey = '/') {
	return render(
		<QueryClientProvider client={client}>
			<HeaderTrace anchorRef={anchorAt(left)} routeKey={routeKey} />
		</QueryClientProvider>
	)
}

describe('HeaderTrace', () => {
	it('puts the blip under the anchor', () => {
		const { container } = renderTrace(new QueryClient(), 120)
		const blip = container.querySelector('.blip-beat')!
		expect((blip.parentElement as HTMLElement).style.transform).toBe(
			'translateX(120px)'
		)
	})

	it('scans only after a fetch has run for a moment, and stops when it ends', async () => {
		const client = new QueryClient()
		const { container } = renderTrace(client)
		const root = container.firstElementChild as HTMLElement
		expect(root.dataset.scanning).toBe('false')

		let finish!: () => void
		const gate = new Promise<number>(
			(resolve) => (finish = () => resolve(1))
		)
		let request!: Promise<unknown>
		act(() => {
			request = client.fetchQuery({
				queryKey: ['slow'],
				queryFn: () => gate
			})
		})

		// chưa quá ngưỡng trễ → chưa quét, tải nhanh không nháy
		expect(root.dataset.scanning).toBe('false')
		await waitFor(() => expect(root.dataset.scanning).toBe('true'), {
			timeout: 1500
		})
		expect(container.querySelector('.trace-scan')).not.toBeNull()

		await act(async () => {
			finish()
			await request
		})
		await waitFor(() => expect(root.dataset.scanning).toBe('false'))
		expect(container.querySelector('.trace-scan')).toBeNull()
	})

	it('does not scan for a fetch that finishes before the delay', async () => {
		const client = new QueryClient()
		const { container } = renderTrace(client)
		const root = container.firstElementChild as HTMLElement
		await act(async () => {
			await client.fetchQuery({
				queryKey: ['fast'],
				queryFn: async () => 1
			})
		})
		await new Promise((r) => setTimeout(r, 350))
		expect(root.dataset.scanning).toBe('false')
	})
})
