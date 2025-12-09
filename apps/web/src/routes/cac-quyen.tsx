import PermissionsTab from '@/components/permission'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cac-quyen')({
	component: RouteComponent
})

function RouteComponent() {
	return <PermissionsTab />
}
