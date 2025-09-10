export type AppToken = {
	accessToken: string
	refreshToken: string
}

export type TokenEvent = {
	token: AppToken
}
