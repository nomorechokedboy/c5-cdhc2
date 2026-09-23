import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent } from '@repo/ui/components/ui/card'

export function ReportSkeleton() {
	const { t } = useTranslation()
	return (
		<div
			role='status'
			aria-label={t('report.states.loading')}
			className='space-y-3'
		>
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					key={i}
					className='bg-muted h-9 animate-pulse rounded-md'
				/>
			))}
			<LoaderCircle className='sr-only' />
		</div>
	)
}

export function ReportError({
	message,
	onRetry
}: {
	message: string
	onRetry?: () => void
}) {
	const { t } = useTranslation()
	return (
		<Card role='alert' className='border-destructive/50 border-dashed'>
			<CardContent className='flex flex-col items-center gap-3 py-8 text-center'>
				<p className='font-medium'>{t('report.states.error')}</p>
				<p className='text-muted-foreground text-sm'>{message}</p>
				{onRetry && (
					<Button variant='outline' onClick={onRetry}>
						{t('report.states.retry')}
					</Button>
				)}
			</CardContent>
		</Card>
	)
}

export function ReportEmpty({ message }: { message: string }) {
	return (
		<Card className='border-dashed'>
			<CardContent className='text-muted-foreground py-8 text-center'>
				{message}
			</CardContent>
		</Card>
	)
}
