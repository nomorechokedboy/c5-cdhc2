import { ApiUrl } from '@/const'
import Client from './client'
import { AuthController } from '@/biz'
import { CourseCategory } from '@/types'

const client = new Client(ApiUrl, { fetcher: appFetcher })
const tempClient = new Client(ApiUrl, {})

async function appFetcher(url: RequestInfo | URL, init?: RequestInit) {
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
		const refreshResp = await tempClient.authn.RefreshToken({
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

class authnApi {
	async GetUserInfo() {
		return client.authn.Me()
	}
}

export const AuthApi = new authnApi()

class categoryApi {
	async GetCategories() {
		return client.usrcategories
			.GetCategories()
			.then((resp) => resp.Data.map(CourseCategory.fromEntity))
	}
}

export const CategoryApi = new categoryApi()

class courseApi {
	async GetCourses({ CategoryId }: { CategoryId: number }) {
		return client.usrcourses
			.GetCourses({ CategoryId })
			.then((resp) => resp.Data)
	}
}

export const CourseApi = new courseApi()
