import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
	DRAFT: {
		label: 'Nháp',
		className: 'bg-slate-100 text-slate-700 border-slate-200'
	},
	PENDING_DEPT: {
		label: 'Chờ CNK',
		className: 'bg-amber-50 text-amber-800 border-amber-200'
	},
	PENDING_EXAM_OFFICE: {
		label: 'Chờ Khảo thí',
		className: 'bg-orange-50 text-orange-800 border-orange-200'
	},
	PENDING_BGH: {
		label: 'Chờ BGH',
		className: 'bg-blue-50 text-blue-800 border-blue-200'
	},
	APPROVED: {
		label: 'Đã phê duyệt',
		className: 'bg-emerald-50 text-emerald-800 border-emerald-200'
	},
	RETURNED: {
		label: 'Trả lại',
		className: 'bg-rose-50 text-rose-800 border-rose-200'
	},
	REJECTED: {
		label: 'Từ chối',
		className: 'bg-red-50 text-red-800 border-red-200'
	}
}

export function examStatusLabel(status: string, fallback?: string) {
	return STATUS_MAP[status]?.label || fallback || status
}

export function ExamStatusBadge({
	status,
	label
}: {
	status: string
	label?: string
}) {
	// Ưu tiên map theo status (tránh label cache cũ «Chờ BGH» khi đã APPROVED)
	const m = STATUS_MAP[status]
	return (
		<Badge variant='outline' className={cn('font-normal', m?.className)}>
			{m?.label || label || status}
		</Badge>
	)
}
