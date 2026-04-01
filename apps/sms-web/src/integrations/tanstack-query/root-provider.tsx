import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Singleton — must live outside getContext() so the same instance is always
// returned, matching the web app pattern. If it were created inside getContext()
// a new QueryClient would be produced on every call, potentially breaking cache
// sharing between the router context and the Provider.
export const queryClient = new QueryClient()

export function getContext() {
	return { queryClient }
}

export function Provider({
	children,
	queryClient
}: {
	children: React.ReactNode
	queryClient: QueryClient
}) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	)
}
