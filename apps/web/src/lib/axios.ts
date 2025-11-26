import baseAxios from 'axios'
import { ApiUrl } from './const'
import Client from '@/api/client'
import { AuthController } from '@/biz'

const axios = baseAxios.create({
	baseURL: ApiUrl
})

export default axios

// Store the ongoing refresh promise
let refreshPromise: Promise<string> | null = null

export async function appFetcher(url: RequestInfo | URL, init?: RequestInit) {
	const accessToken = AuthController.getAccessToken()
	let initWithToken = init
	if (accessToken) {
		initWithToken = {
			...init,
			headers: {
				...init?.headers,
				Authorization: `Bearer ${accessToken}`
			}
		}
	}
	const resp = await fetch(url, initWithToken)

	if (resp.status !== 401) {
		return resp
	}

	const refreshToken = AuthController.getRefreshToken()
	if (!refreshToken) {
		return resp
	}

	try {
		// If a refresh is already in progress, wait for it
		if (!refreshPromise) {
			refreshPromise = (async () => {
				try {
					const tempClient = new Client(ApiUrl)
					const refreshResp = await tempClient.auth.RefreshToken({
						token: refreshToken
					})
					AuthController.setTokens({
						accessToken: refreshResp.accessToken,
						refreshToken: refreshResp.refreshToken
					})
					return refreshResp.accessToken
				} finally {
					// Clear the promise when done (success or failure)
					refreshPromise = null
				}
			})()
		}

		// Wait for the refresh to complete
		const newAccessToken = await refreshPromise

		// Retry the original request with the new token
		const newInit = {
			...init,
			headers: {
				...init?.headers,
				Authorization: `Bearer ${newAccessToken}`
			}
		}
		return await fetch(url, newInit)
	} catch (err) {
		console.error('Token refresh failed:', err)
		AuthController.clearTokens()
		refreshPromise = null // Clear on error
		return resp
	}
}
