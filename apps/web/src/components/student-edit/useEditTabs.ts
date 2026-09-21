import { useStore } from '@tanstack/react-form'
import { useEffect, useState } from 'react'
import {
	PROFILE_TABS,
	type ProfileTabValue
} from '../student-profile/profile-tabs'
import { tabsWithErrors } from './tab-fields'
import type { StudentEditFormApi } from './types'

/**
 * Tab đang mở + tab có lỗi. Sau mỗi lần bấm Lưu mà còn lỗi, tự chuyển tới tab lỗi
 * đầu tiên nếu tab hiện tại không có lỗi, để người dùng thấy ngay chỗ cần sửa.
 */
export function useEditTabs(form: StudentEditFormApi) {
	const [active, setActive] = useState<ProfileTabValue>(PROFILE_TABS[0].value)
	const errorTabs = tabsWithErrors(
		useStore(form.store, (s: any) => s.fieldMeta)
	)
	const isSubmitting: boolean = useStore(
		form.store,
		(s: any) => s.isSubmitting
	)

	// Chạy đúng lúc một lần Lưu kết thúc (kết quả kiểm tra đã có), không giật tab lúc đang gõ
	useEffect(() => {
		if (isSubmitting || errorTabs.size === 0 || errorTabs.has(active))
			return
		if (form.state.submissionAttempts === 0) return
		const first = PROFILE_TABS.find((t) => errorTabs.has(t.value))
		if (first) setActive(first.value)
	}, [isSubmitting])

	return { active, setActive, errorTabs }
}
