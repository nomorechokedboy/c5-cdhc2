/**
 * User ngành / đơn vị / BGH / GV soạn đề: chặn URL không được phép.
 */
import { useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import {
	isBghOnlyUser,
	isBghUserAllowedPath,
	isDonViUser,
	isDonViUserAllowedPath,
	isNganhUserAllowedPath
} from '@/lib/utils'
import useIsNganhUser from '@/hooks/useIsNganhUser'
import { isExamLecturerAllowedPath, isPureExamLecturer } from '@/lib/exam-roles'

export default function NganhUserAccessGuard() {
	const navigate = useNavigate()
	const location = useLocation()
	const nganhUser = useIsNganhUser()
	const donViUser = isDonViUser()
	const bghOnly = isBghOnlyUser()
	const pureExamLecturer = isPureExamLecturer()

	useEffect(() => {
		// GV soạn đề thuần: /, /profile, /de-thi (cua-toi, soan, chi-tiet, qr)
		if (pureExamLecturer) {
			const path = location.pathname
			if (!isExamLecturerAllowedPath(path)) {
				void navigate({ to: '/de-thi/cua-toi', replace: true })
			}
			return
		}

		if (!nganhUser && !donViUser && !bghOnly) return
		const path = location.pathname
		const search = location.search as { view?: string }

		// Cấm view «Tài khoản» — chuyển về danh sách tòa
		if (
			(path === '/vat-tu' || path === '/vat-tu/') &&
			search?.view === 'tai-khoan'
		) {
			void navigate({
				to: '/vat-tu',
				search: { view: undefined },
				replace: true
			})
			return
		}

		// BGH / ĐV: không vào «Đơn vị sử dụng» admin
		if (
			(donViUser || bghOnly) &&
			(path === '/vat-tu' || path === '/vat-tu/') &&
			search?.view === 'don-vi'
		) {
			void navigate({
				to: '/vat-tu',
				search: { view: 'toa' },
				replace: true
			})
			return
		}

		const allowed = donViUser
			? isDonViUserAllowedPath(path)
			: bghOnly
				? isBghUserAllowedPath(path)
				: isNganhUserAllowedPath(path)
		if (allowed) return

		// Vật tư bị cấm → đề xuất (BGH/ĐV) hoặc danh mục ngành
		if (path === '/vat-tu' || path.startsWith('/vat-tu/')) {
			void navigate({
				to:
					donViUser || bghOnly
						? '/vat-tu/de-xuat'
						: '/vat-tu/danh-muc-nganh',
				search: donViUser || bghOnly ? undefined : { view: 'nganh' },
				replace: true
			})
			return
		}
		// Học viên / user admin / khác → trang chủ
		// /profile luôn được phép (đổi MK, chữ ký số) — không chặn
		const blockedPrefixes = [
			'/list-user',
			'/vai-tro',
			'/import-students',
			'/cpv',
			'/hcyu',
			'/birthday',
			'/chuyen-dang-chinh-thuc',
			'/ethnic-minority',
			'/religion',
			'/hoan-canh-kho-khan',
			'/thong-ke-chinh-tri',
			'/tieu-doan',
			'/dai-doi',
			'/classes',
			'/phong-day',
			'/cac-quyen'
		]
		if (
			blockedPrefixes.some((p) => path === p || path.startsWith(p + '/'))
		) {
			void navigate({ to: '/', replace: true })
		}
	}, [
		location.pathname,
		location.search,
		navigate,
		pureExamLecturer,
		nganhUser,
		donViUser,
		bghOnly
	])

	return null
}
