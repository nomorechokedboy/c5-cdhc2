import { describe, expect, it } from 'vitest'
import { APIError, ErrCode } from '@/api/client'
import { deriveAuthState } from './useAuth'

function unauthenticated() {
	return new APIError(401, {
		code: ErrCode.Unauthenticated,
		message: 'invalid token'
	})
}

describe('deriveAuthState', () => {
	it('is authenticated when the user loaded and there is no error', () => {
		expect(deriveAuthState(true, false, null)).toEqual({
			isAuthenticated: true,
			isAuthUnreachable: false
		})
	})

	it('is not authenticated, and not unreachable, with no user and no error (initial state)', () => {
		expect(deriveAuthState(false, false, null)).toEqual({
			isAuthenticated: false,
			isAuthUnreachable: false
		})
	})

	it('logs out on a definitive 401 even with no cached user', () => {
		expect(deriveAuthState(false, true, unauthenticated())).toEqual({
			isAuthenticated: false,
			isAuthUnreachable: false
		})
	})

	it('logs out a cached user when a fresh check comes back a definitive 401', () => {
		expect(deriveAuthState(true, true, unauthenticated())).toEqual({
			isAuthenticated: false,
			isAuthUnreachable: false
		})
	})

	it('is unreachable, not logged out, on a network error with no cached user', () => {
		expect(
			deriveAuthState(false, true, new TypeError('Failed to fetch'))
		).toEqual({ isAuthenticated: false, isAuthUnreachable: true })
	})

	it('is unreachable, not logged out, on a backend 500 with no cached user', () => {
		const err = new APIError(500, {
			code: ErrCode.Internal,
			message: 'boom'
		})
		expect(deriveAuthState(false, true, err)).toEqual({
			isAuthenticated: false,
			isAuthUnreachable: true
		})
	})

	it('stays authenticated on a transient error when a user is already cached', () => {
		expect(
			deriveAuthState(true, true, new TypeError('Failed to fetch'))
		).toEqual({ isAuthenticated: true, isAuthUnreachable: false })
	})
})
