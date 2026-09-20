import quanYMark from '@/assets/emblem/quan-y.png'
import schoolMark from '@/assets/cdhc2.png'
import { cn } from '@/lib/utils'

/**
 * Huy hiệu dùng nguyên bản, không vẽ lại, không đổi màu.
 *
 * - `quan-y`: huy hiệu Quân y Quân đội nhân dân Việt Nam (nền đỏ, sao vàng, chữ thập).
 *   Nguồn: Wikimedia Commons, "Vietnamese People's Army Military Medical.png",
 *   tác giả Taitamtinh, tự thực hiện, giấy phép Public domain. Đã thu nhỏ còn 512px.
 * - `school`: huy hiệu Trường Cao đẳng Hậu cần 2 (giữ làm dấu phụ).
 */
const MARKS = {
	'quan-y': { src: quanYMark, alt: 'Huy hiệu Quân y' },
	school: { src: schoolMark, alt: 'Huy hiệu Trường Cao đẳng Hậu cần 2' }
} as const

export type EmblemMark = keyof typeof MARKS

interface EmblemProps {
	mark?: EmblemMark
	/** Cạnh của ô vuông, đơn vị px */
	size?: number
	/** Ảnh trang trí đi kèm tên đơn vị thì bỏ alt để trình đọc không đọc lặp */
	decorative?: boolean
	className?: string
}

export function Emblem({
	mark = 'quan-y',
	size = 32,
	decorative = false,
	className
}: EmblemProps) {
	const { src, alt } = MARKS[mark]
	return (
		<img
			src={src}
			alt={decorative ? '' : alt}
			aria-hidden={decorative || undefined}
			width={size}
			height={size}
			draggable={false}
			className={cn(
				'shrink-0 select-none object-contain',
				mark === 'quan-y' && 'rounded-[3px]',
				className
			)}
		/>
	)
}
