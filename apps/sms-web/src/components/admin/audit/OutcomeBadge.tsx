import { AlertCircle, Ban, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AuditEntry } from './types'

const OUTCOME_STYLE = {
	success: {
		Icon: CheckCircle2,
		cls: 'border-success/40 bg-success/10 text-success'
	},
	failure: {
		Icon: AlertCircle,
		cls: 'border-destructive/40 bg-destructive/10 text-destructive'
	},
	denied: {
		Icon: Ban,
		cls: 'border-warning/50 bg-warning/10 text-warning'
	}
} as const

/** Kết quả của một sự kiện: biểu tượng kèm chữ, để không phải phân biệt chỉ bằng màu. */
export function OutcomeBadge({ outcome }: { outcome: AuditEntry['outcome'] }) {
	const { t } = useTranslation()
	const { Icon, cls } = OUTCOME_STYLE[outcome] ?? OUTCOME_STYLE.failure

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-semibold',
				cls
			)}
		>
			<Icon className='h-3 w-3' />
			{t(`audit.outcome.${outcome}`)}
		</span>
	)
}
