import baseAxios, { AxiosError, type AxiosRequestConfig } from 'axios'

const PORT = import.meta.env.DEV ? 4000 : 8080

const axios = baseAxios.create({
	baseURL: `http://localhost:${PORT}`
})

export async function AxiosFetcher(url: RequestInfo | URL, init?: RequestInit) {
	// Convert RequestInit to AxiosRequestConfig
	const config: AxiosRequestConfig = {
		method: init?.method as any,
		headers: init?.headers as any,
		data: init?.body,
		// Axios expects a string, fetch can pass URL or RequestInfo
		url: typeof url === 'string' ? url : url.toString()
	}

	try {
		const response = await axios(config)

		// Construct a Response-like object so Encore’s client can use it
		return new Response(JSON.stringify(response.data), {
			status: response.status,
			statusText: response.statusText,
			headers: new Headers(
				Object.entries(response.headers).map(([k, v]) => [k, String(v)])
			)
		})
	} catch (err: unknown) {
		if (!(err instanceof AxiosError)) {
			console.error('Unknown error', err)
			throw err // unexpected error
		}

		if (err.response) {
			// Axios error with response
			return new Response(JSON.stringify(err.response.data), {
				status: err.response.status,
				statusText: err.response.statusText,
				headers: new Headers(
					Object.entries(err.response.headers).map(([k, v]) => [
						k,
						String(v)
					])
				)
			})
		}

		console.error('Unknown error', err)
		throw err // network or unexpected error
	}
}

export default axios
