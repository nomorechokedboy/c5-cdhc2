import ProtectedRoute from '@/components/ProtectedRoute'
import NganhCatalog, {
	type NganhCatalogView
} from '@/components/asset-management/NganhCatalog'
import { createFileRoute } from '@tanstack/react-router'

type NganhSearch = {
	view?: NganhCatalogView
	nganhCode?: string
	loaiVatCode?: string
}

export const Route = createFileRoute('/vat-tu/danh-muc-nganh')({
	validateSearch: (search: Record<string, unknown>): NganhSearch => {
		const view =
			search.view === 'loai-vat' ||
			search.view === 'vat-tu' ||
			search.view === 'nganh'
				? search.view
				: undefined
		const nganhCode =
			typeof search.nganhCode === 'string' && search.nganhCode.trim()
				? search.nganhCode.trim()
				: undefined
		const loaiVatCode =
			typeof search.loaiVatCode === 'string' && search.loaiVatCode.trim()
				? search.loaiVatCode.trim()
				: undefined
		return { view, nganhCode, loaiVatCode }
	},
	component: RouteComponent
})

function RouteComponent() {
	const { view, nganhCode, loaiVatCode } = Route.useSearch()

	return (
		<ProtectedRoute>
			<NganhCatalog
				view={view ?? 'nganh'}
				nganhCode={nganhCode ?? null}
				loaiVatCode={loaiVatCode ?? null}
			/>
		</ProtectedRoute>
	)
}
