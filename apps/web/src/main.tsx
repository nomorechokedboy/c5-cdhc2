import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'
import { AuthProvider } from './context/AuthContext'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'
import reportWebVitals from './reportWebVitals.ts'

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {
		...TanStackQueryProvider.getContext()
	},
	defaultPreload: 'intent',
	scrollRestoration: true,
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

declare module '@tanstack/react-table' {
	interface ColumnMeta<TData, TValue> {
		label?: string
		// Add any other custom meta properties you use
	}
}

// Render the app
const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement)
	root.render(
		<StrictMode>
			<AuthProvider>
				<TanStackQueryProvider.Provider>
					<RouterProvider router={router} />
				</TanStackQueryProvider.Provider>
			</AuthProvider>
		</StrictMode>
	)
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
