/** Dải số liệu như một hàng trong sổ cái: mỗi ô một con số viết to, kẻ dọc ngăn cách. */
export function Ledger({
	items
}: {
	items: { label: string; value: string | number }[]
}) {
	return (
		<div className='divide-rule bg-card flex w-full sm:w-fit divide-x overflow-hidden rounded-lg border'>
			{items.map(({ label, value }) => (
				<div
					key={label}
					className='min-w-0 flex-1 px-4 py-4 sm:min-w-40 sm:px-6'
				>
					<p className='score text-3xl'>{value}</p>
					<p className='text-muted-foreground text-sm'>{label}</p>
				</div>
			))}
		</div>
	)
}
