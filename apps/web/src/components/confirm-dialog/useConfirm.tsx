import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog, type ConfirmOptions } from './ConfirmDialog'

/**
 * Thay `confirm()` của trình duyệt mà giữ nguyên cách viết: `await confirm(...)`
 * trả về true/false. Nhớ đặt `confirmDialog` vào JSX của component gọi hook.
 */
export function useConfirm(): {
	confirm: (options: ConfirmOptions) => Promise<boolean>
	confirmDialog: ReactNode
} {
	const [options, setOptions] = useState<ConfirmOptions | null>(null)
	const resolver = useRef<((ok: boolean) => void) | null>(null)

	const settle = useCallback((ok: boolean) => {
		resolver.current?.(ok)
		resolver.current = null
		setOptions(null)
	}, [])

	// Hỏi lần mới khi lần cũ còn mở thì lần cũ coi như bị hủy
	const confirm = useCallback((next: ConfirmOptions) => {
		resolver.current?.(false)
		return new Promise<boolean>((resolve) => {
			resolver.current = resolve
			setOptions(next)
		})
	}, [])

	return {
		confirm,
		confirmDialog: (
			<ConfirmDialog
				// Giữ nội dung cũ khi đang đóng để hộp thoại không co lại lúc mờ đi
				open={options !== null}
				title={options?.title ?? ''}
				description={options?.description}
				confirmLabel={options?.confirmLabel}
				destructive={options?.destructive}
				onConfirm={() => settle(true)}
				onCancel={() => settle(false)}
			/>
		)
	}
}
