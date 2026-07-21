import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/asset-management/')({
	component: RouteComponent
})

function RouteComponent() {
	return <div>Hello "/asset-management/"!</div>
}
