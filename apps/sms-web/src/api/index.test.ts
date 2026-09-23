import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/const', () => ({ ApiUrl: 'http://api.test' }))

const refreshTokenMock = vi.hoisted(() => vi.fn())

vi.mock('./client', () => {
	class MockAPIError extends Error {
		status: number
		code: string
		constructor(status: number, body: { code: string; message: string }) {
			super(body.message)
			this.status = status
			this.code = body.code
		}
	}
	class MockClient {
		authn = { RefreshToken: refreshTokenMock, Me: vi.fn() }
	}
	return { default: MockClient, APIError: MockAPIError }
})

import { APIError } from './client'
import { appFetcher } from './index'

const ACCESS_KEY = 'smsAccessToken'
const REFRESH_KEY = 'smsRefreshToken'

beforeEach(() => {
	localStorage.clear()
	refreshTokenMock.mockReset()
	vi.restoreAllMocks()
})

describe('appFetcher', () => {
	it('attaches the stored access token as a Bearer header', async () => {
		localStorage.setItem(ACCESS_KEY, 'tok-1')
		const fetchSpy = vi
			.spyOn(global, 'fetch')
			.mockResolvedValue(new Response('{}', { status: 200 }))

		await appFetcher('http://api.test/thing')

		const [, init] = fetchSpy.mock.calls[0]
		expect((init?.headers as Record<string, string>).Authorization).toBe(
			'Bearer tok-1'
		)
	})

	it('sends no Authorization header when there is no stored token', async () => {
		const fetchSpy = vi
			.spyOn(global, 'fetch')
			.mockResolvedValue(new Response('{}', { status: 200 }))

		await appFetcher('http://api.test/thing')

		const [, init] = fetchSpy.mock.calls[0]
		expect(
			(init?.headers as Record<string, string> | undefined)?.Authorization
		).toBeUndefined()
	})

	it('refreshes and retries once on a 401, keeping the new tokens', async () => {
		localStorage.setItem(ACCESS_KEY, 'expired')
		localStorage.setItem(REFRESH_KEY, 'refresh-1')
		const fetchSpy = vi
			.spyOn(global, 'fetch')
			.mockResolvedValueOnce(new Response('{}', { status: 401 }))
			.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
		refreshTokenMock.mockResolvedValue({
			accessToken: 'fresh',
			refreshToken: 'refresh-2'
		})

		const resp = await appFetcher('http://api.test/thing')

		expect(resp.status).toBe(200)
		expect(localStorage.getItem(ACCESS_KEY)).toBe('fresh')
		expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-2')
		const [, retryInit] = fetchSpy.mock.calls[1]
		expect(
			(retryInit?.headers as Record<string, string>).Authorization
		).toBe('Bearer fresh')
	})

	it('does not clear stored tokens when the refresh call fails transiently (network error)', async () => {
		localStorage.setItem(ACCESS_KEY, 'expired')
		localStorage.setItem(REFRESH_KEY, 'refresh-1')
		vi.spyOn(global, 'fetch').mockResolvedValueOnce(
			new Response('{}', { status: 401 })
		)
		refreshTokenMock.mockRejectedValue(new TypeError('Failed to fetch'))

		const resp = await appFetcher('http://api.test/thing')

		expect(resp.status).toBe(401)
		expect(localStorage.getItem(ACCESS_KEY)).toBe('expired')
		expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-1')
	})

	it('does not clear stored tokens when the refresh endpoint itself errors (e.g. a 500)', async () => {
		localStorage.setItem(ACCESS_KEY, 'expired')
		localStorage.setItem(REFRESH_KEY, 'refresh-1')
		vi.spyOn(global, 'fetch').mockResolvedValueOnce(
			new Response('{}', { status: 401 })
		)
		refreshTokenMock.mockRejectedValue(
			new APIError(500, { code: 'internal', message: 'boom' })
		)

		const resp = await appFetcher('http://api.test/thing')

		expect(resp.status).toBe(401)
		expect(localStorage.getItem(ACCESS_KEY)).toBe('expired')
		expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-1')
	})

	it('clears stored tokens when the refresh token itself is rejected as unauthenticated', async () => {
		localStorage.setItem(ACCESS_KEY, 'expired')
		localStorage.setItem(REFRESH_KEY, 'bad-refresh')
		vi.spyOn(global, 'fetch').mockResolvedValueOnce(
			new Response('{}', { status: 401 })
		)
		refreshTokenMock.mockRejectedValue(
			new APIError(401, {
				code: 'unauthenticated',
				message: 'invalid refresh token'
			})
		)

		const resp = await appFetcher('http://api.test/thing')

		expect(resp.status).toBe(401)
		expect(localStorage.getItem(ACCESS_KEY)).toBeNull()
		expect(localStorage.getItem(REFRESH_KEY)).toBeNull()
	})

	it('does not attempt a refresh when there is no stored refresh token', async () => {
		localStorage.setItem(ACCESS_KEY, 'expired')
		const fetchSpy = vi
			.spyOn(global, 'fetch')
			.mockResolvedValueOnce(new Response('{}', { status: 401 }))

		const resp = await appFetcher('http://api.test/thing')

		expect(resp.status).toBe(401)
		expect(refreshTokenMock).not.toHaveBeenCalled()
		expect(fetchSpy).toHaveBeenCalledTimes(1)
	})
})
