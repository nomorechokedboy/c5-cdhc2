import { AlertCircle, RefreshCw } from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import type { ReactNode } from 'react'

interface ErrorStateProps {
	title?: string
	description?: string
	onRetry?: () => void
	showRetryButton?: boolean
	informationText?: ReactNode
	error?: Error | string
}

export default function ErrorState({
	error,
	title = 'Something went wrong',
	description = 'We encountered an error loading your data. Please try again.',
	showRetryButton = true,
	informationText,
	onRetry
}: ErrorStateProps) {
	const errorMessage =
		typeof error === 'string'
			? error
			: error?.message || 'An unexpected error occurred'

	return (
		<div className='container mx-auto p-6 space-y-6 relative'>
			<Card className='border-destructive/50 bg-destructive/5'>
				<CardHeader>
					<div className='flex items-start gap-3'>
						<div className='rounded-full bg-red-100 dark:bg-red-900/20 p-3 flex-shrink-0'>
							<AlertCircle className='h-6 w-6 text-red-600 dark:text-red-400' />
						</div>
						<div className='space-y-2'>
							<div>
								<CardTitle className='text-xl font-semibold text-foreground'>
									{title}
								</CardTitle>
								<CardDescription className='text-muted-foreground mt-1'>
									{description}
								</CardDescription>
							</div>
						</div>
					</div>
				</CardHeader>
				{showRetryButton && onRetry && (
					<CardContent className='space-y-4'>
						<div className='rounded-lg bg-muted/50 p-4 border border-border'>
							<p className='text-sm text-muted-foreground font-mono'>
								{errorMessage}
							</p>
						</div>

						<div className='flex items-center gap-3'>
							<Button onClick={onRetry} className='gap-2'>
								<RefreshCw className='h-4 w-4' />
								Retry Loading
							</Button>
							<p className='text-sm text-muted-foreground'>
								{informationText}
							</p>
						</div>
					</CardContent>
				)}
			</Card>
		</div>
	)
}

export function FullPageErrorState({
	title = 'Unable to Load',
	description = "We couldn't load your courses. Please try refreshing the page.",
	onRetry
}: ErrorStateProps) {
	return (
		<div className='container mx-auto p-6'>
			<div className='flex items-center justify-center min-h-96'>
				<ErrorState
					title={title}
					description={description}
					onRetry={onRetry}
					showRetryButton={true}
				/>
			</div>
		</div>
	)
}
