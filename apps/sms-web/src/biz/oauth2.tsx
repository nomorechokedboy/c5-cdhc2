import { ApiUrl } from '@/const'
import { env } from '@/env'

// Generate the OAuth2 authorization URL
export const generateOAuth2Url = () => {
	const params = new URLSearchParams({
		client_id: env.VITE_CLIENT_ID,
		redirect_uri: `${ApiUrl}/${env.VITE_REDIRECT_URI}`,
		scope: 'user_info',
		response_type: 'code',
		state: 'randomstate'
	})

	return `${env.VITE_OAUTH2_URL}/${env.VITE_TOKEN_URI}?${params.toString()}`
}

// Use it in your component
export const oauth2Uri = generateOAuth2Url()

// Or create a login function
export const initiateOAuth2Login = () => {
	const windowFeatures =
		'width=600,height=700,resizable,scrollbars=yes,status=yes'
	window.open(oauth2Uri, '_blank', windowFeatures)
}
