class authController {
	public static accessTokenKey = 'qlhvAccessToken'
	public static refreshTokenKey = 'qlhvRefreshToken'

	constructor() {}

	private setToken(k: string, val: string) {
		localStorage.setItem(k, val)
	}

	setTokens({
		refreshToken,
		accessToken
	}: {
		accessToken: string
		refreshToken: string
	}) {
		this.setToken(authController.accessTokenKey, accessToken)
		this.setToken(authController.refreshTokenKey, refreshToken)
	}

	private clearToken(k: string) {
		localStorage.removeItem(k)
	}

	clearAccessToken() {
		this.clearToken(authController.accessTokenKey)
	}

	clearRefreshToken() {
		this.clearToken(authController.refreshTokenKey)
	}

	clearTokens() {
		this.clearAccessToken()
		this.clearRefreshToken()
	}

	getAccessToken() {
		return localStorage.getItem(authController.accessTokenKey)
	}

	getRefreshToken() {
		return localStorage.getItem(authController.refreshTokenKey)
	}
}

export const AuthController = new authController()
