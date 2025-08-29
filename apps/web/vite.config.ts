import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import reactSWC from '@vitejs/plugin-react-swc'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		TanStackRouterVite({ autoCodeSplitting: true }),
		tailwindcss(),
		reactSWC()
	],
	test: {
		globals: true,
		environment: 'jsdom'
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src')
		}
	}
})
