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
import { useTranslation } from 'react-i18next'

interface ErrorStateProps {
	title?: string
	description?: string
	onRetry?: () => void
	showRetryButton?: boolean
	informationText?: ReactNode
	error?: Error | string
}

/** Thông báo lỗi: gáy sổ đỏ như bút đỏ gạch, nói rõ lỗi gì và cho thử lại. */
export default function ErrorState({
	error,
	title,
	description,
	showRetryButton = true,
	informationText,
	onRetry
}: ErrorStateProps) {
	const { t } = useTranslation()
	const errorMessage =
		typeof error === 'string'
			? error
			: error?.message || t('error.unexpected')

	return (
		<div className='container relative mx-auto space-y-6 p-6'>
			<Card role='alert' className='border-l-destructive border-l-[6px]'>
				<CardHeader>
					<div className='flex items-start gap-3'>
						<AlertCircle className='text-destructive mt-1 h-6 w-6 shrink-0' />
						<div>
							<CardTitle className='text-xl'>
								{title ?? t('error.genericTitle')}
							</CardTitle>
							<CardDescription className='mt-1'>
								{description ?? t('error.genericDesc')}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				{showRetryButton && onRetry && (
					<CardContent className='space-y-4'>
						<div className='bg-muted/50 border-border rounded-md border p-4'>
							<p className='text-muted-foreground font-mono text-sm'>
								{errorMessage}
							</p>
						</div>

						<div className='flex items-center gap-3'>
							<Button onClick={onRetry} className='gap-2'>
								<RefreshCw className='h-4 w-4' />
								{t('error.retryButton')}
							</Button>
							<p className='text-muted-foreground text-sm'>
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
	title,
	description,
	onRetry
}: ErrorStateProps) {
	const { t } = useTranslation()

	return (
		<div className='container mx-auto p-6'>
			<div className='flex min-h-96 items-center justify-center'>
				<ErrorState
					title={title ?? t('error.fullTitle')}
					description={description ?? t('error.fullDesc')}
					onRetry={onRetry}
					showRetryButton={true}
				/>
			</div>
		</div>
	)
}
