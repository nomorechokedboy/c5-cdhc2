import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/quan-ly-phep/')({
	beforeLoad: () => {
		throw redirect({ to: '/quan-ly-phep/danh-sach' })
	}
})
