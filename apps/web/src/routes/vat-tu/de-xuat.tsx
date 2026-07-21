import ProtectedRoute from '@/components/ProtectedRoute'
import ProposalsPage from '@/components/asset-management/ProposalsPage'
import UserProposalsPage from '@/components/asset-management/UserProposalsPage'
import { createFileRoute } from '@tanstack/react-router'
import {
	isBghAdminUser,
	isDonViUser,
	isNganhUser,
	isSuperAdmin
} from '@/lib/utils'

export const Route = createFileRoute('/vat-tu/de-xuat')({
	component: RouteComponent
})

function RouteComponent() {
	// BGH + super + ngành: hộp thư đề xuất (duyệt / hoàn thành + nhật ký)
	// User đơn vị sử dụng: tạo + theo dõi đề xuất của mình
	const inbox = isSuperAdmin() || isBghAdminUser() || isNganhUser()
	const unitSender = isDonViUser()
	return (
		<ProtectedRoute>
			{inbox && !unitSender ? <ProposalsPage /> : <UserProposalsPage />}
		</ProtectedRoute>
	)
}
