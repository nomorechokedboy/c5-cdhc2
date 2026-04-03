import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ExportApi, type ExportTemplate } from '@/api/export'
import { toast } from '@repo/ui/components/ui/sonner'
import { Button } from '@repo/ui/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import { Badge } from '@repo/ui/components/ui/badge'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from '@repo/ui/components/ui/tabs'
import { Skeleton } from '@repo/ui/components/ui/skeleton'
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react'
import useAuth from '@/hooks/useAuth'

type TemplateType = 'course' | 'quiz' | 'assign'

const ALLOWED_EXTS = ['.docx', '.xlsx', '.xls']
const MAX_MB = 10

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = reader.result as string
			// Strip the data-URL prefix (data:...;base64,)
			resolve(result.split(',')[1])
		}
		reader.onerror = reject
		reader.readAsDataURL(file)
	})
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(unix: number): string {
	return new Date(unix * 1000).toLocaleDateString('vi-VN', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	})
}

// ── per-type panel ────────────────────────────────────────────────────────

function TemplatePanel({ type }: { type: TemplateType }) {
	const { t } = useTranslation()
	const qc = useQueryClient()
	const inputRef = useRef<HTMLInputElement>(null)
	const nameRef = useRef<HTMLInputElement>(null)
	const [deletingId, setDeletingId] = useState<string | null>(null)

	const queryKey = ['adminExportTemplates', type]

	const { data: templates = [], isLoading } = useQuery<ExportTemplate[]>({
		queryKey,
		queryFn: () => ExportApi.getAllTemplates(type)
	})

	const uploadMutation = useMutation({
		mutationFn: ExportApi.uploadTemplate.bind(ExportApi),
		onSuccess: () => {
			toast.success(t('export.templateUploadSuccess'))
			qc.invalidateQueries({ queryKey })
			// Also invalidate teacher-facing template queries for this type
			qc.invalidateQueries({ queryKey: ['courseExportTemplates'] })
			if (inputRef.current) inputRef.current.value = ''
			if (nameRef.current) nameRef.current.value = ''
		},
		onError: (err: Error) =>
			toast.error(err.message ?? t('export.templateUploadError'))
	})

	const deleteMutation = useMutation({
		mutationFn: ({ id }: { id: string }) =>
			ExportApi.deleteTemplate(type, id),
		onSuccess: () => {
			toast.success(t('export.templateDeleteSuccess'))
			qc.invalidateQueries({ queryKey })
			qc.invalidateQueries({ queryKey: ['courseExportTemplates'] })
		},
		onError: (err: Error) =>
			toast.error(err.message ?? t('export.templateDeleteError'))
	})

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		// Validate extension
		const ext = '.' + file.name.split('.').pop()?.toLowerCase()
		if (!ALLOWED_EXTS.includes(ext)) {
			toast.error(t('export.invalidFileType'))
			e.target.value = ''
			return
		}

		// Validate size
		if (file.size > MAX_MB * 1024 * 1024) {
			toast.error(t('export.fileTooLarge', { max: MAX_MB }))
			e.target.value = ''
			return
		}

		const name =
			nameRef.current?.value.trim() || file.name.replace(/\.[^.]+$/, '')

		const filedata = await fileToBase64(file)

		uploadMutation.mutate({
			type,
			name,
			filename: file.name,
			filedata
		})
	}

	const handleDelete = (id: string) => {
		if (!window.confirm(t('export.confirmDelete'))) return
		setDeletingId(id)
		deleteMutation.mutate({ id }, { onSettled: () => setDeletingId(null) })
	}

	return (
		<div className='space-y-4'>
			{/* Upload form */}
			<Card>
				<CardHeader>
					<CardTitle className='text-sm'>
						{t('export.uploadNew')}
					</CardTitle>
					<CardDescription>{t('export.uploadHint')}</CardDescription>
				</CardHeader>
				<CardContent className='space-y-3'>
					<input
						ref={nameRef}
						type='text'
						placeholder={t('export.templateNamePlaceholder')}
						className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
					/>

					<div
						className='border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors'
						onClick={() => inputRef.current?.click()}
					>
						{uploadMutation.isPending ? (
							<Loader2 className='w-6 h-6 mx-auto animate-spin text-muted-foreground' />
						) : (
							<Upload className='w-6 h-6 mx-auto mb-2 text-muted-foreground' />
						)}
						<p className='text-sm text-muted-foreground'>
							{uploadMutation.isPending
								? t('export.uploading')
								: t('export.dropzone')}
						</p>
						<p className='text-xs text-muted-foreground mt-1'>
							{ALLOWED_EXTS.join(', ')} ·{' '}
							{t('export.maxSize', { max: MAX_MB })}
						</p>
					</div>

					<input
						ref={inputRef}
						type='file'
						accept='.docx,.xlsx,.xls'
						className='hidden'
						onChange={handleFileChange}
						disabled={uploadMutation.isPending}
					/>
				</CardContent>
			</Card>

			{/* Template list */}
			<Card>
				<CardHeader>
					<CardTitle className='text-sm'>
						{t('export.existingTemplates')}
					</CardTitle>
				</CardHeader>
				<CardContent className='p-0'>
					{isLoading ? (
						<div className='p-4 space-y-2'>
							{[1, 2].map((i) => (
								<Skeleton key={i} className='h-10 w-full' />
							))}
						</div>
					) : templates.length === 0 ? (
						<p className='p-4 text-sm text-muted-foreground text-center'>
							{t('export.noTemplates')}
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										{t('export.templateName')}
									</TableHead>
									<TableHead>{t('export.format')}</TableHead>
									<TableHead>{t('export.size')}</TableHead>
									<TableHead>
										{t('export.modified')}
									</TableHead>
									<TableHead className='w-16' />
								</TableRow>
							</TableHeader>
							<TableBody>
								{templates.map((tpl) => (
									<TableRow key={tpl.id}>
										<TableCell className='font-medium flex items-center gap-2'>
											<FileText className='w-4 h-4 text-muted-foreground shrink-0' />
											{tpl.name}
										</TableCell>
										<TableCell>
											<Badge
												variant='outline'
												className='uppercase text-xs'
											>
												{tpl.format}
											</Badge>
										</TableCell>
										<TableCell className='text-muted-foreground text-sm'>
											{formatBytes(tpl.size)}
										</TableCell>
										<TableCell className='text-muted-foreground text-sm'>
											{formatDate(tpl.modified)}
										</TableCell>
										<TableCell>
											<Button
												variant='ghost'
												size='icon'
												className='h-7 w-7 text-destructive hover:text-destructive'
												onClick={() =>
													handleDelete(tpl.id)
												}
												disabled={deletingId === tpl.id}
											>
												{deletingId === tpl.id ? (
													<Loader2 className='h-3 w-3 animate-spin' />
												) : (
													<Trash2 className='h-3 w-3' />
												)}
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

// ── main component ────────────────────────────────────────────────────────

export function ExportTemplateManager() {
	const { t } = useTranslation()
	const { isAdmin, isManager } = useAuth()

	if (!isAdmin && !isManager) return null

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-base'>
					{t('export.templateManagerTitle')}
				</CardTitle>
				<CardDescription>
					{t('export.templateManagerSubtitle')}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue='course'>
					<TabsList className='mb-4'>
						<TabsTrigger value='course'>
							{t('export.typeCourse')}
						</TabsTrigger>
						<TabsTrigger value='quiz'>
							{t('export.typeQuiz')}
						</TabsTrigger>
						<TabsTrigger value='assign'>
							{t('export.typeAssign')}
						</TabsTrigger>
					</TabsList>
					<TabsContent value='course'>
						<TemplatePanel type='course' />
					</TabsContent>
					<TabsContent value='quiz'>
						<TemplatePanel type='quiz' />
					</TabsContent>
					<TabsContent value='assign'>
						<TemplatePanel type='assign' />
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	)
}
