import RolesTab from '@/components/role'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vai-tro')({
	component: RouteComponent
})

function RouteComponent() {
	return <RolesTab />
}
