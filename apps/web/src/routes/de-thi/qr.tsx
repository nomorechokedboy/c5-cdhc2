import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamQrScanPage from '@/components/exam/ExamQrScanPage'

export const Route = createFileRoute('/de-thi/qr')({
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>) => ({
		c: typeof search.c === 'string' ? search.c : undefined,
		code: typeof search.code === 'string' ? search.code : undefined,
		q: typeof search.q === 'string' ? search.q : undefined,
		id: typeof search.id === 'string' ? search.id : undefined
	})
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<ExamQrScanPage />
		</ProtectedRoute>
	)
}
