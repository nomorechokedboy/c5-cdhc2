import { ApiUrl } from '@/const'
import Client, { type mdlapi } from './client'
import { AuthController } from '@/biz'
import { CourseCategory } from '@/types'
import { env } from '@/env'

console.log({ ApiUrl, redirectUrl: env.VITE_REDIRECT_URI })
const client = new Client(ApiUrl, { fetcher: appFetcher })
const tempClient = new Client(ApiUrl, {})

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

	if (resp.status !== 401) return resp

	const refreshToken = AuthController.getRefreshToken()
	if (!refreshToken) return resp

	try {
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
					refreshPromise = null
				}
			})()
		}

		const newAccessToken = await refreshPromise
		return await fetch(url, {
			...init,
			headers: {
				...init?.headers,
				Authorization: `Bearer ${newAccessToken}`
			}
		})
	} catch (err) {
		console.error('Token refresh failed:', err)
		AuthController.clearTokens()
		refreshPromise = null
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

// ── Application-level language pack ──────────────────────────────────────────
// These calls bypass the generated Encore client because the appconfig package
// is new and the client.ts hasn't been regenerated yet. They use appFetcher so
// the PUT/DELETE requests automatically carry the auth token.

class langPackApi {
	/** Fetch the current app-level language pack. Public endpoint. */
	async Get(): Promise<Record<string, unknown>> {
		try {
			const resp = await fetch(`${ApiUrl}/config/langpack`)
			if (!resp.ok) return {}
			const data = await resp.json()
			return (data.pack as Record<string, unknown>) ?? {}
		} catch {
			return {}
		}
	}

	/** Save a new language pack. Admin only. */
	async Set(pack: Record<string, unknown>): Promise<void> {
		const resp = await appFetcher(`${ApiUrl}/config/langpack`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pack })
		})
		if (!resp.ok) {
			const body = await resp.json().catch(() => ({}))
			throw new Error(body?.message ?? 'Failed to save lang pack')
		}
	}

	/** Remove the custom pack, reverting all users to defaults. Admin only. */
	async Delete(): Promise<void> {
		const resp = await appFetcher(`${ApiUrl}/config/langpack`, {
			method: 'DELETE'
		})
		if (!resp.ok) {
			const body = await resp.json().catch(() => ({}))
			throw new Error(body?.message ?? 'Failed to delete lang pack')
		}
	}
}
export const LangPackApi = new langPackApi()
