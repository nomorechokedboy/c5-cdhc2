import ProtectedRoute from '@/components/ProtectedRoute'
import RoomProfile from '@/components/asset-management/RoomProfile'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/phong/$roomId')({
	component: RouteComponent
})

function RouteComponent() {
	const { roomId } = Route.useParams()
	const id = Number(roomId)

	return (
		<ProtectedRoute>
			{Number.isNaN(id) ? (
				<div className='p-8 text-destructive'>
					ID phòng không hợp lệ
				</div>
			) : (
				<RoomProfile roomId={id} />
			)}
		</ProtectedRoute>
	)
}
