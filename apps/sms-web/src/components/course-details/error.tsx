import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface CourseDetailsErrorProps {
	error?: Error | string
	onRetry: () => void
}

export default function CourseDetailsError({
	error,
	onRetry
}: CourseDetailsErrorProps) {
	const { t } = useTranslation()

	const errorMessage =
		typeof error === 'string'
			? error
			: error?.message || t('error.unexpected')

	return (
		<div className='container mx-auto p-6 space-y-6 relative'>
			<Card className='border-border'>
				<CardHeader>
					<div className='flex items-center gap-3'>
						<div className='rounded-full bg-red-100 dark:bg-red-900/20 p-3'>
							<AlertCircle className='h-6 w-6 text-red-600 dark:text-red-400' />
						</div>
						<div>
							<CardTitle className='text-xl font-semibold text-foreground'>
								{t('error.courseLoadTitle')}
							</CardTitle>
							<CardDescription className='text-muted-foreground mt-1'>
								{t('error.courseLoadDesc')}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='rounded-lg bg-muted/50 p-4 border border-border'>
						<p className='text-sm text-muted-foreground font-mono'>
							{errorMessage}
						</p>
					</div>

					<div className='flex items-center gap-3'>
						<Button onClick={onRetry} className='gap-2'>
							<RefreshCw className='h-4 w-4' />
							{t('error.retryButton')}
						</Button>
						<p className='text-sm text-muted-foreground'>
							{t('error.retryHint')}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
