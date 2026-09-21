/** Đầu trang: lời chào viết bằng chữ có chân; vai trò (nếu có) đóng dấu cạnh tên. */
export function DashboardHeader({
	title,
	subtitle,
	roleLabel
}: {
	title: string
	subtitle: string
	roleLabel?: string
}) {
	return (
		<div className='space-y-2'>
			<div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
				<h1 className='text-3xl font-semibold tracking-tight'>
					{title}
				</h1>
				{roleLabel && (
					<span className='border-brass text-foreground rounded-sm border-2 px-2 py-0.5 text-sm font-semibold -rotate-2'>
						{roleLabel}
					</span>
				)}
			</div>
			<p className='text-muted-foreground max-w-3xl text-pretty'>
				{subtitle}
			</p>
		</div>
	)
}
