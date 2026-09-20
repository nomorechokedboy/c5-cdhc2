import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TraceLine } from '@/components/trace-line'

interface ErrorStateProps {
	error: Error | string
	onRetry: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
	const errorMessage = error instanceof Error ? error.message : error

	return (
		<Card className='border-destructive/20 bg-destructive/5'>
			<CardContent className='flex flex-col items-center justify-center py-12'>
				<TraceLine variant='error' className='mb-4 max-w-56' />
				<h3 className='mb-2 font-display text-xl font-semibold text-foreground'>
					Đã xảy ra lỗi
				</h3>
				<p className='mb-6 text-center text-sm text-muted-foreground'>
					{errorMessage}
				</p>
				<Button
					onClick={onRetry}
					variant='outline'
					className='gap-2 bg-transparent'
				>
					<RotateCcw className='h-4 w-4' />
					Thử lại
				</Button>
			</CardContent>
		</Card>
	)
}
