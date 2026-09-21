import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { Input } from '@/components/ui/input'

/** Khung xoá nhật ký cũ: chọn số ngày rồi xác nhận, viền đỏ vì không hoàn tác được. */
export function PurgePanel({
	days,
	onDays,
	isPurging,
	onConfirm,
	onCancel
}: {
	days: number
	onDays: (days: number) => void
	isPurging: boolean
	onConfirm: () => void
	onCancel: () => void
}) {
	const { t } = useTranslation()

	return (
		<Card className='border-destructive/50 bg-destructive/5'>
			<CardHeader>
				<CardTitle className='text-destructive flex items-center gap-2 text-base'>
					<Trash2 className='h-4 w-4' />
					{t('audit.purgeTitle')}
				</CardTitle>
				<CardDescription>{t('audit.purgeDesc')}</CardDescription>
			</CardHeader>
			<CardContent className='flex flex-wrap items-center gap-3'>
				<div className='flex items-center gap-2'>
					<span className='text-muted-foreground text-sm whitespace-nowrap'>
						{t('audit.purgeOlderThan')}
					</span>
					<Input
						type='number'
						min={7}
						max={365}
						value={days}
						onChange={(e) => onDays(Number(e.target.value))}
						className='h-8 w-20'
					/>
					<span className='text-muted-foreground text-sm'>
						{t('audit.purgeDays')}
					</span>
				</div>
				<Button
					size='sm'
					variant='destructive'
					onClick={onConfirm}
					disabled={isPurging}
				>
					{isPurging ? t('audit.purging') : t('audit.purgeConfirm')}
				</Button>
				<Button size='sm' variant='ghost' onClick={onCancel}>
					{t('audit.purgeCancel')}
				</Button>
			</CardContent>
		</Card>
	)
}
