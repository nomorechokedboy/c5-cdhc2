import { TraceLine } from '@/components/trace-line'

/** Bảng chưa có dòng nào: một đường thẳng, không có nhịp. */
export function TableEmpty({ message }: { message: string }) {
	return (
		<div
			role='status'
			className='flex flex-col items-center px-4 py-10 text-center'
		>
			<TraceLine variant='flat' className='max-w-48' />
			<p className='text-muted-foreground'>{message}</p>
		</div>
	)
}
