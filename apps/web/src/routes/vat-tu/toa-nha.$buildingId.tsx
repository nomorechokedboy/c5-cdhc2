import ProtectedRoute from '@/components/ProtectedRoute'
import BuildingDetail from '@/components/asset-management/BuildingDetail'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/toa-nha/$buildingId')({
	component: RouteComponent
})

function RouteComponent() {
	const { buildingId } = Route.useParams()
	const id = Number(buildingId)

	return (
		<ProtectedRoute>
			{Number.isNaN(id) ? (
				<div className='p-8 text-destructive'>
					ID tòa nhà không hợp lệ
				</div>
			) : (
				<BuildingDetail buildingId={id} />
			)}
		</ProtectedRoute>
	)
}
