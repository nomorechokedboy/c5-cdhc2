import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ErrorStateProps {
	error: Error | string
	onRetry: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
	const errorMessage = error instanceof Error ? error.message : error

	return (
		<Card className='border-destructive/20 bg-destructive/5'>
			<CardContent className='flex flex-col items-center justify-center py-12'>
				<AlertCircle className='mb-4 h-8 w-8 text-destructive' />
				<h3 className='mb-2 font-semibold text-foreground'>
					Something went wrong
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
					Try Again
				</Button>
			</CardContent>
		</Card>
	)
}
