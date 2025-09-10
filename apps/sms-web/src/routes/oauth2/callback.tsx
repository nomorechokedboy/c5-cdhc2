import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

const Oauth2CallbackSearchSchema = z.object({
	accessToken: z.string().jwt().nonempty(),
	refreshToken: z.string().jwt().nonempty()
})

export const Route = createFileRoute('/oauth2/callback')({
	component: Callback,
	validateSearch: Oauth2CallbackSearchSchema,
	loaderDeps: ({ search: { accessToken, refreshToken } }) => ({
		accessToken,
		refreshToken
	}),
	loader: ({ deps: { accessToken, refreshToken } }) => {
		const isTokensValid =
			accessToken.length !== 0 && refreshToken.length !== 0
		if (!isTokensValid) {
			// Impl error handling here
			return
		}

		if (!window.opener) {
			// Impl error handling here
			return
		}

		window.opener.postMessage({ token: { accessToken, refreshToken } }, '*')
		window.close()
	}
})

export default function Callback() {
	return null
}
