import baseAxios from 'axios'
import { ApiUrl } from './const'
import Client from '@/api/client'
import { AuthController } from '@/biz'

const axios = baseAxios.create({
	baseURL: ApiUrl
})

export default axios

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
	const isUnauthenticatedResp = resp.status !== 401
	if (isUnauthenticatedResp) {
		return resp
	}

	const refreshToken = AuthController.getRefreshToken()
	const isInvalidRefreshToken = !refreshToken
	if (isInvalidRefreshToken) {
		return resp
	}

	try {
		const tempClient = new Client(ApiUrl)
		const refreshResp = await tempClient.auth.RefreshToken({
			token: refreshToken
		})
		AuthController.setTokens({
			accessToken: refreshResp.accessToken,
			refreshToken: refreshResp.refreshToken
		})

		const newInit = {
			...init,
			headers: {
				...init?.headers,
				Authorization: `Bearer ${refreshResp.accessToken}`
			}
		}

		return await fetch(url, newInit)
	} catch (err) {
		console.error('Token refresh failed:', err)
		AuthController.clearTokens()
		return resp
	}
}
