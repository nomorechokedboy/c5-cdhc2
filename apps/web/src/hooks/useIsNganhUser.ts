/**
 * User ngành — ưu tiên:
 * 1) user.isNganhScoped từ /authn/me
 * 2) JWT isNganhScoped / roles / nganhCodes
 * 3) GetMyNganh + không buildings
 */
import { useQuery } from '@tanstack/react-query'
import { GetMyNganh } from '@/api/asset'
import useAuth from '@/hooks/useAuth'
import {
	getTokenPermissions,
	isNganhUser as isNganhUserSync,
	isRoomTeacherUser,
	isSuperAdmin
} from '@/lib/utils'

export function useIsNganhUser(): boolean {
	const { user, isAuthenticated } = useAuth()
	const superU = isSuperAdmin() || !!user?.isSuperUser
	const roomTeacher = isRoomTeacherUser()

	const myNganhQ = useQuery({
		queryKey: ['my-nganh', 'role-detect'],
		queryFn: GetMyNganh,
		staleTime: 60_000,
		enabled: isAuthenticated && !superU && !roomTeacher
	})

	if (superU || roomTeacher) return false

	// API /authn/me
	if (user?.isNganhScoped === true) return true

	const roles = (user?.roles || []).map((r) => r.toLowerCase())
	if (
		roles.some(
			(r) =>
				r === 'user_nganh' || r.includes('ngành') || r.includes('nganh')
		)
	) {
		return true
	}

	if (isNganhUserSync()) return true

	const assigned = myNganhQ.data ?? user?.nganhCodes ?? []
	if (!assigned.length) return false

	const p = getTokenPermissions()
	const has = (k: string) => p.includes(k)
	// Đọc tòa/phòng được phép (form cap-nhat); chỉ chặn nếu quản lý tòa
	return (
		!has('buildings:create') &&
		!has('buildings:update') &&
		!has('buildings:delete')
	)
}

export default useIsNganhUser
