import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@repo/ui/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@repo/ui/components/ui/dropdown-menu'
import { FileDown, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from '@repo/ui/components/ui/sonner'
import { ExportApi, triggerBase64Download } from '@/api/export'
import { useTranslation } from 'react-i18next'

interface ExportButtonProps {
	courseId: number
}

export default function ExportButton({ courseId }: ExportButtonProps) {
	const { t } = useTranslation()
	const [exportingId, setExportingId] = useState<string | null>(null)

	// Fetch available templates for this course.
	// Runs only when the dropdown opens (enabled flag toggled via state is
	// tricky with DropdownMenu, so we just always fetch — it's a tiny call).
	const { data: templates = [], isLoading: isTemplatesLoading } = useQuery({
		queryKey: ['courseExportTemplates', courseId],
		queryFn: () => ExportApi.getCourseTemplates(courseId),
		staleTime: 5 * 60 * 1000
	})

	const { mutateAsync: doExport, isPending } = useMutation({
		mutationFn: ({ templateId }: { templateId?: string }) =>
			ExportApi.exportCourseGrades(courseId, templateId),
		onSuccess: (data) => {
			triggerBase64Download(data.content, data.filename, data.mimetype)
			toast.success(t('export.success'))
		},
		onError: (err: Error) => {
			toast.error(err.message ?? t('export.error'))
		}
	})

	const handleExport = async (templateId?: string) => {
		setExportingId(templateId ?? '__default__')
		try {
			await doExport({ templateId })
		} finally {
			setExportingId(null)
		}
	}

	const isExporting = isPending

	// If no templates exist, show a plain button instead of a dropdown.
	if (!isTemplatesLoading && templates.length === 0) {
		return (
			<Button
				variant='outline'
				onClick={() => handleExport()}
				disabled={isExporting}
			>
				{isExporting ? (
					<Loader2 className='h-4 w-4 animate-spin' />
				) : (
					<FileDown className='h-4 w-4' />
				)}
				{t('export.button')}
			</Button>
		)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='outline' disabled={isExporting}>
					{isExporting ? (
						<Loader2 className='h-4 w-4 animate-spin' />
					) : (
						<FileDown className='h-4 w-4' />
					)}
					{t('export.button')}
					<ChevronDown className='h-3 w-3 ml-1 opacity-70' />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align='end' className='w-56'>
				<DropdownMenuLabel>
					{t('export.selectTemplate')}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{/* Default (no template) */}
				<DropdownMenuItem
					onClick={() => handleExport()}
					disabled={exportingId === '__default__'}
				>
					{exportingId === '__default__' ? (
						<Loader2 className='h-3 w-3 animate-spin mr-2' />
					) : (
						<FileDown className='h-3 w-3 mr-2' />
					)}
					{t('export.defaultTemplate')}
				</DropdownMenuItem>

				{/* Available templates */}
				{isTemplatesLoading ? (
					<DropdownMenuItem disabled>
						<Loader2 className='h-3 w-3 animate-spin mr-2' />
						{t('export.loadingTemplates')}
					</DropdownMenuItem>
				) : (
					templates.map((tpl) => (
						<DropdownMenuItem
							key={tpl.id}
							onClick={() => handleExport(tpl.id)}
							disabled={exportingId === tpl.id}
						>
							{exportingId === tpl.id ? (
								<Loader2 className='h-3 w-3 animate-spin mr-2' />
							) : (
								<FileDown className='h-3 w-3 mr-2' />
							)}
							<span className='truncate'>{tpl.name}</span>
							<span className='ml-auto text-xs text-muted-foreground uppercase'>
								{tpl.format}
							</span>
						</DropdownMenuItem>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
