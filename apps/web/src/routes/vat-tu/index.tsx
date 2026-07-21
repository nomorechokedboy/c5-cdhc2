import ProtectedRoute from '@/components/ProtectedRoute'
import BuildingCatalog, {
	type BuildingCatalogView
} from '@/components/asset-management/BuildingCatalog'
import { createFileRoute } from '@tanstack/react-router'

type VatTuSearch = {
	view?: BuildingCatalogView
	buildingId?: string
}

export const Route = createFileRoute('/vat-tu/')({
	validateSearch: (search: Record<string, unknown>): VatTuSearch => {
		const view =
			search.view === 'phong' ||
			search.view === 'tai-khoan' ||
			search.view === 'toa' ||
			search.view === 'don-vi'
				? search.view
				: undefined
		const buildingId =
			typeof search.buildingId === 'string' && search.buildingId.trim()
				? search.buildingId.trim()
				: undefined
		return { view, buildingId }
	},
	component: RouteComponent
})

function RouteComponent() {
	const { view, buildingId } = Route.useSearch()
	const bid = buildingId ? Number(buildingId) : null

	return (
		<ProtectedRoute>
			<BuildingCatalog
				view={view ?? 'toa'}
				buildingId={bid != null && !Number.isNaN(bid) ? bid : null}
			/>
		</ProtectedRoute>
	)
}
