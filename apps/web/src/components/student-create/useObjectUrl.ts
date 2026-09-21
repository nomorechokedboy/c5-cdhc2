import { useEffect, useState } from 'react'

/** URL xem trước của một File; tự thu hồi khi đổi file hoặc khi thoát */
export function useObjectUrl(file: File | null): string | undefined {
	const [url, setUrl] = useState<string>()

	useEffect(() => {
		if (!file) {
			setUrl(undefined)
			return
		}
		const next = URL.createObjectURL(file)
		setUrl(next)
		return () => URL.revokeObjectURL(next)
	}, [file])

	return url
}
