import { useStore } from '@tanstack/react-form'
import useUnitOptions from '@/hooks/useUnitOptions'
import { summaryRows } from './summary'

/** Tóm tắt ở bước cuối; đọc thẳng từ form nên luôn đúng với những gì sẽ gửi */
export function ReviewSummary({ form }: { form: any }) {
	const values = useStore(form.store, (s: any) => s.values)
	const { options } = useUnitOptions('class')
	const unitLabel = options.find(
		(o) => o.value === String(values.unitId ?? '')
	)?.label
	const rows = summaryRows(values, unitLabel)

	return (
		<section
			aria-labelledby='review-title'
			className='mt-6 border-l-2 border-gold py-1 pl-4 lg:hidden'
		>
			<h3
				id='review-title'
				className='mb-3 border-b pb-1.5 font-display text-lg font-semibold tracking-wide'
			>
				Kiểm tra lại trước khi thêm
			</h3>
			<dl className='grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4'>
				{rows.map(({ label, value }) => (
					<div key={label} className='min-w-0'>
						<dt className='text-xs text-muted-foreground'>
							{label}
						</dt>
						<dd className='truncate font-semibold'>{value}</dd>
					</div>
				))}
			</dl>
		</section>
	)
}
