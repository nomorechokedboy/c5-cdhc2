import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLangPackAdmin, LANG_PACK_QUERY_KEY } from '@/hooks/useLangPack'
import { useQuery } from '@tanstack/react-query'
import { LangPackApi } from '@/api'
import { toast } from '@repo/ui/components/ui/sonner'
import { Button } from '@repo/ui/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import { Upload, RotateCcw, Download } from 'lucide-react'
import defaultStrings from '@/i18n/vi.json'
import useAuth from '@/hooks/useAuth'

export function LangPackManager() {
	const { t } = useTranslation()
	const { isAdmin } = useAuth()
	const inputRef = useRef<HTMLInputElement>(null)
	const { setPack, deletePack } = useLangPackAdmin()

	// Query the current pack to know whether a custom one is active.
	const { data: currentPack = {} } = useQuery({
		queryKey: LANG_PACK_QUERY_KEY,
		queryFn: LangPackApi.Get,
		staleTime: 5 * 60 * 1000
	})
	const isCustom = Object.keys(currentPack).length > 0

	// Admins only — render nothing for other roles.
	if (!isAdmin) return null

	const handleFile = (file: File) => {
		if (!file.name.endsWith('.json')) {
			toast.error(t('langpack.formatHint'))
			return
		}
		const reader = new FileReader()
		reader.onload = async (e) => {
			try {
				const pack = JSON.parse(e.target?.result as string)
				await setPack(pack)
				toast.success(t('langpack.uploadSuccess'))
			} catch (err: any) {
				toast.error(err?.message ?? t('langpack.parseError'))
			}
		}
		reader.readAsText(file)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		const file = e.dataTransfer.files[0]
		if (file) handleFile(file)
	}

	const handleReset = async () => {
		try {
			await deletePack()
			toast.success(t('langpack.resetSuccess'))
		} catch (err: any) {
			toast.error(err?.message ?? t('langpack.parseError'))
		}
	}

	const handleDownloadDefault = () => {
		const blob = new Blob([JSON.stringify(defaultStrings, null, 2)], {
			type: 'application/json'
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'sms-vi-default.json'
		a.click()
		URL.revokeObjectURL(url)
	}

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<div>
						<CardTitle className='text-base'>
							{t('langpack.title')}
						</CardTitle>
						<CardDescription>
							{t('langpack.subtitle')}
						</CardDescription>
					</div>
					<Badge variant={isCustom ? 'default' : 'outline'}>
						{isCustom
							? t('langpack.active')
							: t('langpack.default')}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Drop zone */}
				<div
					className='border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors'
					onClick={() => inputRef.current?.click()}
					onDrop={handleDrop}
					onDragOver={(e) => e.preventDefault()}
				>
					<Upload className='w-8 h-8 mx-auto mb-2 text-muted-foreground' />
					<p className='text-sm text-muted-foreground'>
						{t('langpack.dropzone')}
					</p>
					<p className='text-xs text-muted-foreground mt-1'>
						{t('langpack.formatHint')}
					</p>
				</div>
				<input
					ref={inputRef}
					type='file'
					accept='.json'
					className='hidden'
					onChange={(e) => {
						const file = e.target.files?.[0]
						if (file) handleFile(file)
						e.target.value = ''
					}}
				/>

				<div className='flex gap-2 flex-wrap'>
					<Button
						variant='outline'
						size='sm'
						onClick={handleDownloadDefault}
					>
						<Download className='w-4 h-4' />
						{t('langpack.downloadDefault')}
					</Button>
					{isCustom && (
						<Button
							variant='outline'
							size='sm'
							onClick={handleReset}
						>
							<RotateCcw className='w-4 h-4' />
							{t('langpack.reset')}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
