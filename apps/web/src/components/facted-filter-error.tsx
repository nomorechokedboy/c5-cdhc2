import { AlertCircle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FacetedFilterErrorProps {
	title?: string
	onRetry: () => void
}

export default function FacetedFilterError({
	title = 'Filter',
	onRetry
}: FacetedFilterErrorProps) {
	return (
		<div className='inline-flex items-center gap-2'>
			{/* Error-looking button */}
			<Button
				variant='outline'
				size='sm'
				className={cn(
					'h-8 border-dashed text-destructive border-destructive/50 hover:bg-destructive/10'
				)}
			>
				<AlertCircle className='mr-2 h-4 w-4 text-destructive' />
				{title} error
			</Button>

			{/* Retry button */}
			<Button
				variant='ghost'
				size='sm'
				onClick={onRetry}
				className='h-8 text-muted-foreground hover:text-foreground'
			>
				<RotateCw className='h-4 w-4' />
				<span className='ml-1'>Reload</span>
			</Button>
		</div>
	)
}
