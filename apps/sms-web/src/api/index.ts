import { ApiUrl } from '@/const'
import Client, { type mdlapi } from './client'
import { AuthController } from '@/biz'
import { CourseCategory } from '@/types'

console.log({ ApiUrl })
const client = new Client(ApiUrl, { fetcher: appFetcher })
const tempClient = new Client(ApiUrl, {})

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
					const refreshResp = await tempClient.authn.RefreshToken({
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
			.then((resp) => resp.data.map(CourseCategory.fromEntity))
	}

	async GetCourses({ CategoryId }: { CategoryId: number }) {
		return client.usrcategories
			.GetCategoryCourses(CategoryId)
			.then((resp) => resp.data)
	}
}

export const CategoryApi = new categoryApi()

class courseApi {
	GetCourses() {
		return client.usrcourses.GetCourses({}).then((resp) => resp.data)
	}

	GetCourseDetails({ id }: { id: number }) {
		return client.usrcourses.GetCourseDetails(id)
	}

	UpdateCourseGrades(params: mdlapi.UpdateGradesRequest) {
		return client.usrcourses.UpdateCourseGrades(params)
	}
}

export const CourseApi = new courseApi()

class userApi {
	GetGrades() {
		return client.usrgrades.GetUserGrades()
	}
}

export const UserApi = new userApi()
